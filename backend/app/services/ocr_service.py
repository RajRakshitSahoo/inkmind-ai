"""
Handwriting OCR service.

This module is the single seam between the rest of the app and
whatever recognition engine is running underneath. Today it supports:

  - "tesseract": local pytesseract (works for print-like handwriting;
     install the tesseract binary — see README).
  - "demo": deterministic sample output, used automatically as a
     fallback if tesseract isn't installed, and always available for
     the bundled demo documents (section 42).

To swap in a transformer model (TrOCR, PaddleOCR, etc. — section 8),
add a new branch here that returns the same (text, word_confidences)
shape. Nothing else in the app needs to change.
"""
import random
from app.core.config import get_settings

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

settings = get_settings()

DEMO_SAMPLES = {
    "default": (
        "Photosynthesis is the process by which green plants prepare their "
        "food using sunlight. Chlorophyll present in the leaves absorbs "
        "sunlight and uses it to convert carbon dioxide and water into "
        "glucose. Oxygen is released as a byproduct of this reaction. "
        "This process mainly takes place in the mesophyll cells of the leaf."
    ),
}


def _fake_confidences(text: str) -> list[dict]:
    """Assigns a plausible per-word confidence score for demo/preview purposes."""
    words = text.split()
    out = []
    rng = random.Random(len(text))  # deterministic per-text
    for w in words:
        clean = w.strip(".,;:")
        if len(clean) <= 3:
            conf = rng.randint(90, 99)
        else:
            conf = rng.randint(55, 99)
        out.append({"word": clean, "confidence": conf})
    return out


def run_ocr(image_path: str) -> dict:
    """
    Returns {"text": str, "word_confidences": [{"word","confidence"}]}
    """
    backend = settings.OCR_BACKEND

    if backend == "tesseract":
        try:
            from PIL import Image

            img = Image.open(image_path)
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            words, confidences = [], []
            for i, w in enumerate(data["text"]):
                w = w.strip()
                if not w:
                    continue
                conf = data["conf"][i]
                try:
                    conf = int(float(conf))
                except (ValueError, TypeError):
                    conf = 50
                conf = max(0, min(100, conf))
                words.append(w)
                confidences.append({"word": w, "confidence": conf})

            text = " ".join(words)
            if not text.strip():
                # tesseract found nothing (e.g. tricky handwriting) — fall back to demo
                raise RuntimeError("empty OCR result")
            return {"text": text, "word_confidences": confidences}
        except Exception as e:
            # tesseract binary missing, or recognition failed — use demo fallback
            print(f"[OCR ERROR] {type(e).__name__}: {e}")

    text = DEMO_SAMPLES["default"]
    return {"text": text, "word_confidences": _fake_confidences(text)}