from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.database import get_db
from app.services.settings_service import get_settings, get_feature_flag
from app.services.marketplace_service import MARKETPLACE_PURCHASE_ENABLED_KEY

router = APIRouter(tags=["public-settings"])


class PublicSettingsResponse(BaseModel):
    store_name: str = "NestinoKids"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    currency: str = "INR"
    default_meta_title: Optional[str] = None
    default_meta_description: Optional[str] = None
    default_meta_keywords: Optional[str] = None
    default_og_image: Optional[str] = None
    default_canonical_url: Optional[str] = None
    marketplace_purchase_enabled: bool = True
    cod_enabled: bool = True
    online_payment_enabled: bool = False
    direct_checkout_enabled: bool = False

    class Config:
        from_attributes = True


@router.get("/api/v1/settings/public", response_model=PublicSettingsResponse)
def get_public_settings(db: Session = Depends(get_db)):
    settings = get_settings(db)
    return PublicSettingsResponse(
        store_name=settings.store_name,
        logo_url=settings.logo_url,
        favicon_url=settings.favicon_url,
        currency=settings.currency,
        default_meta_title=settings.default_meta_title,
        default_meta_description=settings.default_meta_description,
        default_meta_keywords=settings.default_meta_keywords,
        default_og_image=settings.default_og_image,
        default_canonical_url=settings.default_canonical_url,
        marketplace_purchase_enabled=get_feature_flag(db, MARKETPLACE_PURCHASE_ENABLED_KEY),
        # No online payment gateway is integrated, so online_payment_enabled is
        # reported as the AND of the admin toggle and actual gateway support.
        # Until a gateway exists it can never advertise online payments.
        cod_enabled=settings.cod_enabled,
        online_payment_enabled=False,
        direct_checkout_enabled=get_feature_flag(db, "direct_checkout_enabled"),
    )
