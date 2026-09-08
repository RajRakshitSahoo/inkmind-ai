from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import User, ChatMessage
from app.schemas.schemas import ChatRequest, ChatResponse, SourceOut, SearchResultOut
from app.api.deps import get_current_user
from app.services import rag_service, ai_service

router = APIRouter(prefix="/api", tags=["chat & search"])


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.add(ChatMessage(
        user_id=current_user.id, document_id=payload.document_id,
        role="user", content=payload.message,
    ))
    db.commit()

    results = rag_service.semantic_search(
        db, current_user.id, payload.message, document_id=payload.document_id, top_k=4
    )
    context_chunks = [r["snippet"] for r in results]
    reply = ai_service.answer_with_context(payload.message, context_chunks)

    sources = [SourceOut(**r) for r in results]
    db.add(ChatMessage(
        user_id=current_user.id, document_id=payload.document_id,
        role="assistant", content=reply,
        sources=[s.model_dump() for s in sources],
    ))
    db.commit()

    return ChatResponse(reply=reply, sources=sources)


@router.get("/chat/history", response_model=List[dict])
def chat_history(document_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    if document_id:
        q = q.filter(ChatMessage.document_id == document_id)
    messages = q.order_by(ChatMessage.created_at.asc()).all()
    return [
        {"role": m.role, "content": m.content, "sources": m.sources, "created_at": m.created_at.isoformat()}
        for m in messages
    ]


@router.get("/search", response_model=List[SearchResultOut])
def search(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not q.strip():
        return []
    results = rag_service.semantic_search(db, current_user.id, q, top_k=10)
    return [SearchResultOut(**r) for r in results]
