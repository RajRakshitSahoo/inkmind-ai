import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON, Enum
)
from sqlalchemy.orm import relationship

from app.core.database import Base


def now():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student)
    created_at = Column(DateTime, default=now)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")


class ProcessingStatus(str, enum.Enum):
    uploaded = "uploaded"
    enhancing = "enhancing"
    recognizing = "recognizing"
    understanding = "understanding"
    embedding = "embedding"
    complete = "complete"
    failed = "failed"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=True)       # detected subject e.g. Biology
    topic = Column(String, nullable=True)          # detected topic e.g. Photosynthesis
    status = Column(Enum(ProcessingStatus), default=ProcessingStatus.uploaded)
    status_detail = Column(String, nullable=True)  # human readable error / note
    language = Column(String, default="English")
    page_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=now)

    owner = relationship("User", back_populates="documents")
    pages = relationship("Page", back_populates="document", cascade="all, delete-orphan", order_by="Page.page_number")
    summaries = relationship("Summary", back_populates="document", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="document", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = "document_pages"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    page_number = Column(Integer, default=1)
    original_path = Column(String, nullable=False)
    enhanced_path = Column(String, nullable=True)
    raw_text = Column(Text, nullable=True)          # raw OCR output
    corrected_text = Column(Text, nullable=True)    # after AI correction / manual edit
    confidence_data = Column(JSON, nullable=True)    # [{word, confidence}]
    quality_data = Column(JSON, nullable=True)       # blur/lighting/skew analysis
    created_at = Column(DateTime, default=now)

    document = relationship("Document", back_populates="pages")
    chunks = relationship("EmbeddingChunk", back_populates="page", cascade="all, delete-orphan")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    level = Column(String, default="short")  # short | medium | detailed
    content = Column(Text, nullable=False)
    key_points = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now)

    document = relationship("Document", back_populates="summaries")


class QuestionType(str, enum.Enum):
    mcq = "mcq"
    short = "short"
    long = "long"
    flashcard = "flashcard"


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    type = Column(Enum(QuestionType), default=QuestionType.short)
    prompt = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)     # for MCQ
    answer = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now)

    document = relationship("Document", back_populates="questions")


class EmbeddingChunk(Base):
    """
    Text chunk + vector for RAG. Vector stored as JSON list of floats.
    For production scale, swap this table for Postgres + pgvector and
    replace the similarity search in rag_service.py with a SQL query.
    """
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("document_pages.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    vector = Column(JSON, nullable=False)

    page = relationship("Page", back_populates="chunks")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)  # null = across all notes
    role = Column(String, default="user")  # user | assistant
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)  # [{document_id, page_number, snippet}]
    created_at = Column(DateTime, default=now)

    user = relationship("User", back_populates="chat_messages")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_id = Column(Integer, ForeignKey("document_pages.id"), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=now)
