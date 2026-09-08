"""
Retrieval-Augmented Generation over a user's handwritten notes
(sections 16-17 of the spec: RAG + HandSearch).

Embeddings use scikit-learn's HashingVectorizer — a fixed-dimension,
dependency-light TF-IDF-style embedding that needs no model download
and no GPU, so `Ask My Notes` and search work immediately after
`pip install`. Vectors are stored as JSON in SQLite.

For production scale, swap:
  - HashingVectorizer -> a real sentence-embedding model (or an
    embeddings API call)
  - the in-Python cosine similarity loop -> Postgres + pgvector
    (`ORDER BY embedding <-> query_embedding LIMIT k`)
Only this file and the `embeddings` table need to change; callers
(chat/search routes) are unaffected.
"""
import re
import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer
from sqlalchemy.orm import Session

from app.models.models import EmbeddingChunk, Page, Document

_vectorizer = HashingVectorizer(n_features=256, alternate_sign=False, norm="l2")


def embed(text: str) -> list[float]:
    vec = _vectorizer.transform([text]).toarray()[0]
    return vec.tolist()


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 80) -> list[str]:
    text = text.strip()
    if not text:
        return []
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    step = chunk_size - overlap
    for start in range(0, len(words), step):
        chunk = " ".join(words[start:start + chunk_size])
        if chunk:
            chunks.append(chunk)
        if start + chunk_size >= len(words):
            break
    return chunks


def index_page(db: Session, page: Page):
    """Chunks the page's corrected text and stores embeddings for retrieval."""
    text = page.corrected_text or page.raw_text or ""
    db.query(EmbeddingChunk).filter(EmbeddingChunk.page_id == page.id).delete()
    for chunk in chunk_text(text):
        db.add(EmbeddingChunk(
            page_id=page.id,
            document_id=page.document_id,
            chunk_text=chunk,
            vector=embed(chunk),
        ))
    db.commit()


def semantic_search(db: Session, user_id: int, query: str, document_id: int | None = None, top_k: int = 5):
    q_vec = np.array(embed(query))

    query_set = (
        db.query(EmbeddingChunk, Page, Document)
        .join(Page, EmbeddingChunk.page_id == Page.id)
        .join(Document, EmbeddingChunk.document_id == Document.id)
        .filter(Document.owner_id == user_id)
    )
    if document_id:
        query_set = query_set.filter(Document.id == document_id)

    results = []
    for chunk, page, document in query_set.all():
        v = np.array(chunk.vector)
        denom = (np.linalg.norm(q_vec) * np.linalg.norm(v)) or 1e-9
        score = float(np.dot(q_vec, v) / denom)
        results.append({
            "document_id": document.id,
            "document_title": document.title,
            "page_number": page.page_number,
            "snippet": chunk.chunk_text[:300],
            "relevance": round(score, 4),
        })

    results.sort(key=lambda r: r["relevance"], reverse=True)
    return results[:top_k]
