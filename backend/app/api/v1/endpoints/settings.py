from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import SiteSettings
from app.schemas.schemas import SiteSettingsResponse, SiteSettingsUpdate
from app.api.v1.endpoints.auth import require_admin

router = APIRouter(tags=["settings"])


def get_or_create_settings(db: Session) -> SiteSettings:
    settings = db.query(SiteSettings).first()
    if not settings:
        settings = SiteSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/api/v1/settings", response_model=SiteSettingsResponse)
def get_public_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.get("/api/v1/admin/settings", response_model=SiteSettingsResponse)
def get_admin_settings(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    return get_or_create_settings(db)


@router.put("/api/v1/admin/settings", response_model=SiteSettingsResponse)
def update_settings(
    data: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    settings = get_or_create_settings(db)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings
