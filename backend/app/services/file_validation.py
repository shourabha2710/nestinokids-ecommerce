"""Centralized upload validation for application-managed files.

Every upload endpoint must:

1. Validate the extension against an explicit allowlist.
2. Validate the actual file content using magic bytes/signatures
   (never trusting the client-supplied Content-Type).
3. Enforce the shared settings.MAX_UPLOAD_SIZE limit.
4. Keep UUID-generated filenames and server-controlled directories,
   so no client filename/path can influence the filesystem path.
"""
import uuid
from pathlib import Path
from typing import Callable, Iterable

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

# Magic-byte/content-signature rules keyed by extension.
# Each rule receives the leading bytes and decides whether the
# content matches the declared type. Content is authoritative;
# the extension and the content must agree.
_SIGNATURE_RULES: dict[str, Callable[[bytes], bool]] = {
    ".jpg": lambda b: b.startswith(b"\xff\xd8\xff"),
    ".jpeg": lambda b: b.startswith(b"\xff\xd8\xff"),
    ".png": lambda b: b.startswith(b"\x89PNG\r\n\x1a\n"),
    ".webp": lambda b: (
        len(b) >= 12 and b.startswith(b"RIFF") and b[8:12] == b"WEBP"
    ),
    # ISO-BMFF / MP4 family: 4-byte box size, 'ftyp', then a printable brand.
    ".mp4": lambda b: (
        len(b) >= 12
        and b[4:8] == b"ftyp"
        and b[8:12].isalnum()
    ),
    # WebM: EBML magic followed shortly by the 'webm' DocType.
    ".webm": lambda b: (
        len(b) >= 8
        and b.startswith(b"\x1a\x45\xdf\xa3")
        and b"webm" in b[:64]
    ),
}

_READ_CHUNK_SIZE = 64 * 1024


def _safe_extension(filename: str) -> str:
    """Reject client paths/traversal and return the lowercased extension."""
    if filename is None:
        return ""
    normalized = filename.replace("\\", "/")
    parts = [part for part in normalized.split("/") if part not in ("", ".")]
    if len(parts) != 1 or ".." in parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file name",
        )
    return Path(parts[0]).suffix.lower()


def _read_limited(file: UploadFile, limit: int) -> bytes:
    """Read at most `limit` bytes, stopping as soon as the cap is reached."""
    chunks: list[bytes] = []
    remaining = limit
    while remaining > 0:
        chunk = file.file.read(min(_READ_CHUNK_SIZE, remaining))
        if not chunk:
            break
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def validate_upload(file: UploadFile, allowed_extensions: Iterable[str]) -> tuple[str, bytes]:
    """Validate an uploaded file and return (extension, contents).

    Raises HTTP 400 with a clean message on any validation failure:
    unsupported type, invalid name, empty file, oversize file, or
    content that does not match the declared extension.
    """
    allowed = set(allowed_extensions)
    ext = _safe_extension(file.filename or "")
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(allowed))}",
        )

    contents = _read_limited(file, settings.MAX_UPLOAD_SIZE + 1)
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )

    rule = _SIGNATURE_RULES.get(ext)
    if rule is not None and not rule(contents):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match the declared file type",
        )

    return ext, contents


def save_upload(contents: bytes, ext: str, subdir: str) -> str:
    """Persist bytes under uploads/<subdir>/<uuid4 hex><ext>.

    Returns the generated unique filename only (never the client filename).
    """
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR) / subdir
    upload_dir.mkdir(parents=True, exist_ok=True)
    with open(upload_dir / unique_name, "wb") as f:
        f.write(contents)
    return unique_name


def upload_url(subdir: str, filename: str) -> str:
    """Build the relative /uploads/<subdir>/<filename> URL served by the app."""
    return f"/{settings.UPLOAD_DIR}/{subdir}/{filename}"