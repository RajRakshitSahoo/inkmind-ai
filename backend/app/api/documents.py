from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Document, Page, ProcessingStatus, Summary, Question, User
from app.schemas.schemas import (
    DocumentOut, DocumentDetailOut, TextUpdateRequest, SummaryRequest, SummaryOut,
    QuestionsRequest, QuestionOut, DashboardStats,
)
from app.api.deps import get_current_user
from app.utils.file_storage import save_upload
from app.services.pipeline import process_document
from app.services import ai_service, rag_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("", response_model=DocumentOut)
def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="At least one page image is required.")

    document = Document(
        owner_id=current_user.id,
        title=title,
        status=ProcessingStatus.uploaded,
        page_count=len(files),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    for i, file in enumerate(files, start=1):
        path = save_upload(file, subdir=f"doc_{document.id}")
        db.add(Page(document_id=document.id, page_number=i, original_path=path))
    db.commit()

    background_tasks.add_task(process_document, document.id)

    db.refresh(document)
    return document


@router.get("", response_model=List[DocumentOut])
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Document)
        .filter(Document.owner_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )


@router.get("/dashboard-stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = db.query(Document).filter(Document.owner_id == current_user.id).all()
    total_pages = sum(d.page_count for d in docs)
    words = sum(d.word_count for d in docs)
    topics = len({d.topic for d in docs if d.topic})
    questions = db.query(Question).join(Document).filter(Document.owner_id == current_user.id).count()
    return DashboardStats(
        total_documents=len(docs),
        total_pages=total_pages,
        words_extracted=words,
        topics_detected=topics,
        questions_generated=questions,
    )


def _get_owned_document(db: Session, document_id: int, user: User) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    if document.owner_id != user.id:
        raise HTTPException(status_code=403, detail="You don't have access to this document.")
    return document


@router.get("/{document_id}", response_model=DocumentDetailOut)
def get_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_owned_document(db, document_id, current_user)


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = _get_owned_document(db, document_id, current_user)
    db.delete(document)
    db.commit()
    return {"deleted": True}


@router.put("/{document_id}/pages/{page_id}/text")
def update_page_text(
    document_id: int, page_id: int, payload: TextUpdateRequest,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    document = _get_owned_document(db, document_id, current_user)
    page = next((p for p in document.pages if p.id == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found.")

    page.corrected_text = payload.corrected_text
    db.commit()
    rag_service.index_page(db, page)  # re-embed with the corrected text
    return {"updated": True}


@router.post("/{document_id}/summary", response_model=SummaryOut)
def create_summary(
    document_id: int, payload: SummaryRequest,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    document = _get_owned_document(db, document_id, current_user)
    text = "\n\n".join((p.corrected_text or p.raw_text or "") for p in document.pages)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Document has no recognized text yet.")

    result = ai_service.summarize(text, level=payload.level)
    summary = Summary(
        document_id=document.id,
        level=payload.level,
        content=result["summary"],
        key_points=result.get("key_points"),
        keywords=result.get("keywords"),
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary


@router.get("/{document_id}/summaries", response_model=List[SummaryOut])
def list_summaries(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = _get_owned_document(db, document_id, current_user)
    return document.summaries


@router.post("/{document_id}/questions", response_model=List[QuestionOut])
def create_questions(
    document_id: int, payload: QuestionsRequest,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    document = _get_owned_document(db, document_id, current_user)
    text = "\n\n".join((p.corrected_text or p.raw_text or "") for p in document.pages)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Document has no recognized text yet.")

    generated = ai_service.generate_questions(text, payload.types, payload.count)
    saved = []
    for q in generated:
        question = Question(
            document_id=document.id,
            type=q.get("type", "short"),
            prompt=q["prompt"],
            options=q.get("options"),
            answer=q.get("answer"),
            explanation=q.get("explanation"),
        )
        db.add(question)
        saved.append(question)
    db.commit()
    for q in saved:
        db.refresh(q)
    return saved


@router.get("/{document_id}/questions", response_model=List[QuestionOut])
def list_questions(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = _get_owned_document(db, document_id, current_user)
    return document.questions
