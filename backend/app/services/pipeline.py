"""
Orchestrates the full pipeline described in section 1 of the spec:

  IMAGE -> ENHANCEMENT -> OCR -> CORRECTION -> UNDERSTANDING -> KNOWLEDGE

Runs as a FastAPI BackgroundTask so the upload request returns
immediately and the UI polls /api/documents/{id} for status
(section 37 — processing status stages).
"""
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import Document, Page, ProcessingStatus, Summary
from app.services import image_processing, ocr_service, quality_analyzer, ai_service, rag_service
from app.utils.file_storage import enhanced_path_for

logger = logging.getLogger("inkmind.pipeline")


def _set_status(db: Session, document: Document, status: ProcessingStatus, detail: str | None = None):
    document.status = status
    document.status_detail = detail
    db.commit()


def process_document(document_id: int):
    db: Session = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return

        try:
            _set_status(db, document, ProcessingStatus.enhancing)
            all_text = []
            total_words = 0

            for page in document.pages:
                enhanced_path = enhanced_path_for(page.original_path)
                metrics = image_processing.enhance_image(page.original_path, enhanced_path)
                page.enhanced_path = enhanced_path
                page.quality_data = quality_analyzer.analyze_quality(metrics)
                db.commit()

                _set_status(db, document, ProcessingStatus.recognizing)
                ocr_result = ocr_service.run_ocr(enhanced_path)
                page.raw_text = ocr_result["text"]
                page.confidence_data = ocr_result["word_confidences"]
                db.commit()

                correction = ai_service.correct_text(ocr_result["text"])
                page.corrected_text = correction["corrected_text"]
                db.commit()

                total_words += len(page.corrected_text.split())
                all_text.append(page.corrected_text)

            _set_status(db, document, ProcessingStatus.understanding)
            combined_text = "\n\n".join(all_text)
            understanding = ai_service.understand_content(combined_text)
            document.subject = understanding.get("subject")
            document.topic = understanding.get("topic")
            document.word_count = total_words
            db.commit()

            summary = ai_service.summarize(combined_text, level="short")
            db.add(Summary(
                document_id=document.id,
                level="short",
                content=summary["summary"],
                key_points=summary.get("key_points"),
                keywords=summary.get("keywords") or understanding.get("keywords"),
            ))
            db.commit()

            _set_status(db, document, ProcessingStatus.embedding)
            for page in document.pages:
                rag_service.index_page(db, page)

            _set_status(db, document, ProcessingStatus.complete)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Pipeline failed for document %s", document_id)
            _set_status(db, document, ProcessingStatus.failed, detail=str(exc)[:300])
    finally:
        db.close()
