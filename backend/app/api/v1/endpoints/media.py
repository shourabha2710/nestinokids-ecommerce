import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import User, MediaAsset
from app.schemas.schemas import MediaAssetResponse, MediaListResponse, MediaUpdateRequest
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.services import media_service
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/media", tags=["admin-media"])


@router.get("", response_model=MediaListResponse)
def list_media(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    folder: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.MEDIA_VIEW)),
):
    items, total = media_service.get_media_list(
        db, skip=skip, limit=limit, folder=folder, file_type=file_type, search=search,
    )
    return MediaListResponse(items=items, total=total)


@router.post("/upload", response_model=MediaAssetResponse, status_code=status.HTTP_201_CREATED)
def upload_media(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.MEDIA_MANAGE)),
):
    asset = media_service.upload_media(file, current_user, db)
    try:
        audit_service.create_log(
            db=db,
            user=current_user,
            action="UPLOAD",
            entity_type="MEDIA",
            entity_id=asset.id,
            description=f"Uploaded media: {asset.original_filename}",
            request=request,
        )
    except Exception:
        logger.exception("Audit failed for media upload, but upload succeeded")
    return asset


@router.put("/{asset_id}", response_model=MediaAssetResponse)
def update_media(
    asset_id: int,
    body: MediaUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.MEDIA_MANAGE)),
):
    old_item = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    old_data = {"alt_text": old_item.alt_text, "folder": old_item.folder} if old_item else {}

    asset = media_service.update_media(asset_id, body.alt_text, body.folder, db)
    try:
        audit_service.create_log(
            db=db,
            user=current_user,
            action="UPDATE",
            entity_type="MEDIA",
            entity_id=asset.id,
            description=f"Updated media: {asset.original_filename}",
            old_values=old_data,
            new_values={"alt_text": asset.alt_text, "folder": asset.folder},
            request=request,
        )
    except Exception:
        logger.exception("Audit failed for media update, but update succeeded")
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    asset_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.MEDIA_MANAGE)),
):
    old_item = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    old_filename = old_item.original_filename if old_item else "unknown"

    media_service.delete_media(asset_id, db)
    try:
        audit_service.create_log(
            db=db,
            user=current_user,
            action="DELETE",
            entity_type="MEDIA",
            entity_id=asset_id,
            description=f"Deleted media: {old_filename}",
            request=request,
        )
    except Exception:
        logger.exception("Audit failed for media delete, but delete succeeded")
    return None
