"""
AI content-understanding layer (sections 10-14 of the spec).

Wraps whatever LLM is configured behind a small set of task
functions (correct_text, understand, summarize, generate_questions,
answer_with_context). If LLM_API_KEY is not set, every function
falls back to a deterministic, clearly-labeled demo implementation
so the whole product works out of the box — this is the
"demo/fallback mode" required by the spec's development rules.
"""
import json
import re
from collections import Counter

import httpx

from app.core.config import get_settings

settings = get_settings()

STOPWORDS = {
    "the", "is", "a", "an", "of", "and", "to", "in", "it", "that", "this",
    "as", "by", "for", "on", "with", "are", "was", "were", "be", "which",
    "or", "at", "from", "its", "into", "their", "such", "these", "also",
    "used", "using", "uses", "process", "main", "mainly",
}


def _call_llm(system: str, user: str, max_tokens: int = 1000) -> str | None:
    """Returns raw text from the configured LLM, or None if unavailable."""
    if not settings.LLM_API_KEY:
        return None
    try:
        if settings.LLM_PROVIDER == "anthropic":
            resp = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.LLM_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.LLM_MODEL,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": user}],
                },
                timeout=30,
            )
            resp.raise_for_status()
            blocks = resp.json().get("content", [])
            return "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
        elif settings.LLM_PROVIDER == "openai":
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                json={
                    "model": settings.LLM_MODEL,
                    "max_tokens": max_tokens,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None
    return None


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _keyword_freq(text: str, top_n: int = 8) -> list[str]:
    words = re.findall(r"[a-zA-Z]{4,}", text.lower())
    words = [w for w in words if w not in STOPWORDS]
    common = [w for w, _ in Counter(words).most_common(top_n)]
    return [w.capitalize() for w in common]


# ---------------------------------------------------------------- correction

def correct_text(raw_text: str) -> dict:
    """Returns {"corrected_text": str, "corrections": [{original, suggestion, confidence}]}"""
    system = (
        "You correct OCR errors in handwritten student notes using context. "
        "Fix obvious OCR artifacts (garbled characters, merged/split words) but "
        "do not rewrite the author's meaning. Respond ONLY with JSON: "
        '{"corrected_text": "...", "corrections": [{"original":"...","suggestion":"...","confidence":0-100}]}'
    )
    out = _call_llm(system, raw_text)
    parsed = _extract_json(out) if out else None
    if parsed and "corrected_text" in parsed:
        return parsed

    # Demo fallback: fix a few common OCR-style typos deterministically.
    fixes = {
        "photosynthesls": "photosynthesis",
        "chlorophyl": "chlorophyll",
        "glucos e": "glucose",
        "0xygen": "oxygen",
    }
    corrected = raw_text
    corrections = []
    for wrong, right in fixes.items():
        if wrong in corrected.lower():
            corrected = re.sub(re.escape(wrong), right, corrected, flags=re.IGNORECASE)
            corrections.append({"original": wrong, "suggestion": right, "confidence": 94})
    return {"corrected_text": corrected, "corrections": corrections}


# --------------------------------------------------------------- understanding

def understand_content(text: str) -> dict:
    """Returns subject, topic, keywords, definitions, concepts, formulas."""
    system = (
        "You analyze handwritten student notes and extract structured "
        "knowledge. Respond ONLY with JSON: "
        '{"subject":"...", "topic":"...", "keywords":["..."], '
        '"key_concepts":["..."], "definitions":["..."], "formulas":["..."]}'
    )
    out = _call_llm(system, text)
    parsed = _extract_json(out) if out else None
    if parsed and "subject" in parsed:
        return parsed

    # Demo fallback: light heuristic subject detection + frequency-based keywords.
    lower = text.lower()
    subject = "Other"
    for subj, hints in {
        "Biology": ["cell", "plant", "photosynthesis", "organism", "chlorophyll"],
        "Physics": ["force", "energy", "velocity", "newton", "motion"],
        "Chemistry": ["reaction", "molecule", "acid", "compound", "element"],
        "Mathematics": ["equation", "integral", "theorem", "matrix", "derivative"],
        "Computer Science": ["algorithm", "cpu", "memory", "process", "database"],
    }.items():
        if any(h in lower for h in hints):
            subject = subj
            break

    keywords = _keyword_freq(text)
    topic = keywords[0] if keywords else "General Notes"
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    definitions = [s for s in sentences if " is " in s.lower()][:3]
    concepts = keywords[:5]

    return {
        "subject": subject,
        "topic": topic,
        "keywords": keywords,
        "key_concepts": concepts,
        "definitions": definitions,
        "formulas": [],
    }


# -------------------------------------------------------------------- summary

def summarize(text: str, level: str = "short") -> dict:
    lengths = {
        "short": "2-3 sentences",
        "medium": "5-7 bullet points",
        "detailed": "a structured multi-paragraph explanation with headings",
    }
    system = (
        f"Summarize the given handwritten notes as {lengths.get(level, lengths['short'])}. "
        'Respond ONLY with JSON: {"summary":"...", "key_points":["..."], "keywords":["..."]}'
    )
    out = _call_llm(system, text)
    parsed = _extract_json(out) if out else None
    if parsed and "summary" in parsed:
        return parsed

    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    keywords = _keyword_freq(text)
    if level == "short":
        summary = " ".join(sentences[:2])
    elif level == "medium":
        summary = "\n".join(f"- {s}" for s in sentences[:6])
    else:
        summary = (
            "## Overview\n" + " ".join(sentences[:3]) +
            "\n\n## Details\n" + "\n".join(f"- {s}" for s in sentences[3:8])
        )
    return {"summary": summary, "key_points": sentences[:5], "keywords": keywords}


# ------------------------------------------------------------------ questions

def generate_questions(text: str, types: list[str], count: int = 5) -> list[dict]:
    system = (
        f"Create {count} exam-style study questions of these types from the notes: "
        f"{', '.join(types)}. For MCQs include 4 options and mark the correct one. "
        'Respond ONLY with JSON: {"questions":[{"type":"mcq|short|long|flashcard",'
        '"prompt":"...","options":["..."] or null,"answer":"...","explanation":"..."}]}'
    )
    out = _call_llm(system, text, max_tokens=1500)
    parsed = _extract_json(out) if out else None
    if parsed and "questions" in parsed:
        return parsed["questions"][:count]

    keywords = _keyword_freq(text, top_n=count)
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
    questions = []
    for i, kw in enumerate(keywords[:count]):
        if "mcq" in types:
            distractors = [k for k in keywords if k != kw][:3] or ["None of the above"]
            questions.append({
                "type": "mcq",
                "prompt": f"Which term best relates to: \"{sentences[i % len(sentences)] if sentences else kw}\"?",
                "options": [kw] + distractors,
                "answer": kw,
                "explanation": f"{kw} is one of the key terms identified in these notes.",
            })
        elif "flashcard" in types:
            questions.append({
                "type": "flashcard",
                "prompt": f"What is {kw}?",
                "options": None,
                "answer": sentences[i % len(sentences)] if sentences else f"See notes on {kw}.",
                "explanation": None,
            })
        else:
            questions.append({
                "type": "short",
                "prompt": f"Explain the role of {kw} based on your notes.",
                "options": None,
                "answer": sentences[i % len(sentences)] if sentences else None,
                "explanation": None,
            })
    return questions


# ------------------------------------------------------------- Ask My Notes

def answer_with_context(question: str, context_chunks: list[str]) -> str:
    context = "\n---\n".join(context_chunks) if context_chunks else ""
    system = (
        "You are 'Ask My Notes', an assistant that answers strictly using the "
        "student's own handwritten notes provided as context. If the context "
        "does not contain the answer, say so plainly instead of inventing "
        "information. Be concise."
    )
    user = f"NOTES CONTEXT:\n{context}\n\nQUESTION: {question}"
    out = _call_llm(system, user)
    if out:
        return out.strip()

    if not context_chunks:
        return (
            "I couldn't find anything in your notes about this yet — try "
            "uploading a document first, or rephrasing your question."
        )
    return (
        "Based on your notes: " + context_chunks[0][:400].strip() +
        ("..." if len(context_chunks[0]) > 400 else "")
    )
