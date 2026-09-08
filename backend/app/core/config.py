"""
Central configuration for InkMind AI backend.

Everything is driven from environment variables (see .env.example).
The app is designed to run fully in "demo mode" with zero external
API keys — OCR falls back to a bundled sample, and the AI layer
falls back to deterministic mock structured output. Once real keys
are supplied, the same code paths call the real services instead.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    APP_NAME: str = "InkMind AI"

    # --- Auth ---
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- Database ---
    # SQLite by default so the project runs with zero infra setup in VS Code.
    # Swap to a Postgres URL (and enable pgvector in rag_service.py) for production.
    DATABASE_URL: str = "sqlite:///./inkmind.db"

    # --- Storage ---
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 20
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

    # --- OCR ---
    # "tesseract" uses local pytesseract if the binary is installed.
    # "demo" always returns bundled sample text (works with no setup at all).
    OCR_BACKEND: str = os.getenv("OCR_BACKEND", "tesseract")

    # --- LLM / AI understanding ---
    # If LLM_API_KEY is unset, ai_service.py automatically uses its
    # deterministic demo/fallback mode instead of calling out to a provider.
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "anthropic")  # anthropic | openai
    LLM_MODEL: str = os.getenv("LLM_MODEL", "claude-sonnet-4-6")

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
