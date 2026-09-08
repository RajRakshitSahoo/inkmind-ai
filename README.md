# InkMind AI

**From handwriting to knowledge.**

An AI-powered handwriting understanding and personal knowledge platform.
Upload photos of handwritten notes and InkMind AI enhances the image,
recognizes the handwriting, corrects it using context, understands the
content, and turns it into searchable, structured knowledge you can
question and study from.

This repository is a working MVP of the full product spec: authentication,
upload, the image → OCR → correction → understanding pipeline, a document
viewer, Note2Exam question generation, RAG-based "Ask My Notes" chat, and
HandSearch semantic search. It runs **fully locally with zero external
services required** (SQLite database, dependency-light OCR/embeddings, and
a deterministic demo mode for the AI layer) — then upgrades automatically
to real AI once you add an API key.

---

## 1. Project layout

```
inkmind-ai/
├── backend/        FastAPI + SQLite + OpenCV + pytesseract
│   └── app/
│       ├── api/          route handlers (auth, documents, chat/search, demo)
│       ├── core/         config, database, security
│       ├── models/       SQLAlchemy models
│       ├── schemas/      Pydantic request/response schemas
│       ├── services/     image processing, OCR, AI, RAG, pipeline orchestrator
│       └── utils/        file storage helpers
├── frontend/       Next.js 14 (App Router) + TypeScript + Tailwind
│   └── app/               landing, auth, dashboard, upload, document viewer,
│                           Ask My Notes, HandSearch
└── .vscode/        Run/debug configs for both halves
```

## 2. Requirements

- Python 3.10+
- Node.js 18+
- (Optional, for real handwriting OCR) the **Tesseract** binary on your PATH.
  Without it, OCR automatically falls back to a demo sample so the app still
  works end to end.

## 3. Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # defaults work out of the box

uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000` (interactive docs at
`http://localhost:8000/docs`). A `inkmind.db` SQLite file and `uploads/`
folder are created automatically on first run.

### Enabling real handwriting OCR

Install Tesseract, then leave `OCR_BACKEND=tesseract` in `.env` (the
default). If the binary isn't found or a page can't be read, the app
falls back to demo text automatically rather than failing.

- macOS: `brew install tesseract`
- Ubuntu/Debian: `sudo apt install tesseract-ocr`
- Windows: [UB-Mannheim Tesseract installer](https://github.com/UB-Mannheim/tesseract/wiki)

### Enabling real AI (correction, summaries, questions, chat)

Without an API key, `ai_service.py` uses a deterministic fallback (keyword
extraction, heuristic subject detection, template questions) so every
feature still works for a demo. To use a real model, set in `.env`:

```
LLM_PROVIDER=anthropic        # or "openai"
LLM_MODEL=claude-sonnet-4-6
LLM_API_KEY=sk-...
```

## 4. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points the UI at http://localhost:8000

npm run dev
```

Open `http://localhost:3000`.

## 5. Fastest way to see it working

Click **"Try the demo"** on the login page — it logs you into a shared demo
account with no signup, so you can upload a page and immediately walk
through the full pipeline (enhancement → recognition → correction →
understanding → summary → Note2Exam → Ask My Notes → HandSearch).

## 6. Running both at once in VS Code

Open this folder in VS Code, go to **Run and Debug**, and launch
**"Run InkMind AI (backend + frontend)"** — it starts both the FastAPI
server and the Next.js dev server together (configured in `.vscode/launch.json`).
(Requires the Python extension for the `debugpy` backend config.)

## 7. Architecture notes / what's simplified for local dev

- **Database**: SQLite instead of Postgres, so there's no infra to stand up.
  `app/models/models.py` and `app/core/database.py` are the only places
  that would need to change to move to Postgres.
- **Vector search**: embeddings are stored as JSON and compared with cosine
  similarity in Python (`app/services/rag_service.py`), using
  scikit-learn's `HashingVectorizer` so no model download or GPU is needed.
  Swapping in Postgres + `pgvector` or a real embeddings API only touches
  this one file.
- **OCR**: pluggable in `app/services/ocr_service.py` — swap in TrOCR /
  PaddleOCR by adding a branch that returns the same
  `{text, word_confidences}` shape.
- **AI**: pluggable in `app/services/ai_service.py` — one `_call_llm()`
  function all task functions go through.

## 8. What's implemented vs. left as an extension point

Implemented: auth & roles, upload (multi-page, drag-and-drop), image
enhancement, OCR with per-word confidence, context-aware correction,
subject/topic/keyword detection, multi-level summaries, Note2Exam (MCQ /
short / flashcard), Ask My Notes (RAG chat with page citations), HandSearch
(semantic search), document viewer with Original/Enhanced/Recognized
Text/Summary/Questions tabs, manual text correction, handwriting quality
analysis, processing-status stages, and a no-signup demo mode.

Left as extension points (the service/route layering is designed so these
slot in without refactoring): teacher mode & class analysis, multi-language
recognition, mathematical handwriting, exports (PDF/DOCX/TXT/MD), admin
dashboard, analytics charts, and quiz-attempt scoring history.
