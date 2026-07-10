import uuid
import logging
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from PIL import Image
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import MediaAsset, User

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _save_file(file: UploadFile) -> tuple[str, str, int, Optional[int], Optional[int]]:
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR) / "media"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / unique_name
    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/{settings.UPLOAD_DIR}/media/{unique_name}"

    width = None
    height = None
    try:
        with Image.open(file_path) as img:
            width, height = img.size
    except Exception:
        pass

    return unique_name, file_url, len(contents), width, height


def upload_media(file: UploadFile, user: User, db: Session) -> MediaAsset:
    filename, file_url, file_size, width, height = _save_file(file)

    asset = MediaAsset(
        filename=filename,
        original_filename=file.filename,
        file_url=file_url,
        file_type=file.content_type or Path(file.filename).suffix.lower().lstrip("."),
        file_size=file_size,
        width=width,
        height=height,
        uploaded_by=user.id,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def get_media_list(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    folder: Optional[str] = None,
    file_type: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[MediaAsset], int]:
    query = db.query(MediaAsset)

    if folder:
        query = query.filter(MediaAsset.folder == folder)
    if file_type:
        query = query.filter(MediaAsset.file_type == file_type)
    if search:
        query = query.filter(MediaAsset.original_filename.ilike(f"%{search}%"))

    total = query.count()

    items = (
        query.order_by(desc(MediaAsset.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items, total


def update_media(asset_id: int, alt_text: Optional[str], folder: Optional[str], db: Session) -> MediaAsset:
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media asset not found",
        )

    if alt_text is not None:
        asset.alt_text = alt_text
    if folder is not None:
        asset.folder = folder

    db.commit()
    db.refresh(asset)
    return asset


def delete_media(asset_id: int, db: Session) -> None:
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media asset not found",
        )

    file_path = Path(settings.UPLOAD_DIR) / "media" / asset.filename
    try:
        if file_path.exists():
            file_path.unlink()
    except Exception:
        logger.exception("Failed to delete file from disk: %s", file_path)

    db.delete(asset)
    db.commit()
