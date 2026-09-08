from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "student"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# ---------- Documents ----------

class PageOut(BaseModel):
    id: int
    page_number: int
    original_path: str
    enhanced_path: Optional[str]
    raw_text: Optional[str]
    corrected_text: Optional[str]
    confidence_data: Optional[Any]
    quality_data: Optional[Any]

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: int
    title: str
    subject: Optional[str]
    topic: Optional[str]
    status: str
    status_detail: Optional[str]
    language: str
    page_count: int
    word_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentDetailOut(DocumentOut):
    pages: List[PageOut] = []


class SummaryOut(BaseModel):
    id: int
    level: str
    content: str
    key_points: Optional[Any]
    keywords: Optional[Any]

    class Config:
        from_attributes = True


class QuestionOut(BaseModel):
    id: int
    type: str
    prompt: str
    options: Optional[Any]
    answer: Optional[str]
    explanation: Optional[str]

    class Config:
        from_attributes = True


class TextUpdateRequest(BaseModel):
    corrected_text: str


class SummaryRequest(BaseModel):
    level: str = "short"  # short | medium | detailed


class QuestionsRequest(BaseModel):
    types: List[str] = ["mcq", "short", "flashcard"]
    count: int = 5


# ---------- Chat / Search ----------

class ChatRequest(BaseModel):
    message: str
    document_id: Optional[int] = None  # scope to one doc, else search across all user's notes


class SourceOut(BaseModel):
    document_id: int
    document_title: str
    page_number: int
    snippet: str
    relevance: float


class ChatResponse(BaseModel):
    reply: str
    sources: List[SourceOut] = []


class SearchResultOut(BaseModel):
    document_id: int
    document_title: str
    page_number: int
    snippet: str
    relevance: float


class DashboardStats(BaseModel):
    total_documents: int
    total_pages: int
    words_extracted: int
    topics_detected: int
    questions_generated: int
