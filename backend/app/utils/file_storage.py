import os
import uuid
from pathlib import Path

from fastapi import UploadFile, HTTPException

from app.core.config import get_settings

settings = get_settings()
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def validate_file(file: UploadFile):
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )
    return ext


def save_upload(file: UploadFile, subdir: str) -> str:
    ext = validate_file(file)
    folder = Path(settings.UPLOAD_DIR) / subdir
    folder.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = folder / filename

    contents = file.file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.")

    with open(dest, "wb") as f:
        f.write(contents)

    return str(dest)


def enhanced_path_for(original_path: str) -> str:
    p = Path(original_path)
    return str(p.with_name(f"{p.stem}_enhanced.png"))
