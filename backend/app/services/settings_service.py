from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import StoreSetting


DEFAULT_VALUES = {
    "store_name": "NestinoKids",
    "currency": "INR",
    "timezone": "Asia/Kolkata",
}

# Application defaults for feature flags (used when neither an explicit
# environment override nor a StoreSetting DB value is present).
FEATURE_FLAG_DEFAULTS = {
    "direct_checkout_enabled": False,
    "marketplace_purchase_enabled": True,
}

# Maps StoreSetting column → config.Settings env override field.
FEATURE_FLAG_ENV_FIELDS = {
    "direct_checkout_enabled": "DIRECT_CHECKOUT_ENABLED",
    "marketplace_purchase_enabled": "MARKETPLACE_PURCHASE_ENABLED",
}


def get_settings(db: Session) -> StoreSetting:
    settings = db.query(StoreSetting).first()
    if not settings:
        settings = StoreSetting(**DEFAULT_VALUES)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, data: dict) -> StoreSetting:
    settings = get_settings(db)
    for key, value in data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


def get_feature_flag(db: Session, flag_key: str) -> bool:
    """Centralized feature-flag resolution.

    Precedence:
      1. explicit environment override (config.Settings field is not None)
      2. StoreSetting DB column value
      3. application default (FEATURE_FLAG_DEFAULTS)
    """
    env_field = FEATURE_FLAG_ENV_FIELDS.get(flag_key)
    if env_field:
        env_value = getattr(settings, env_field, None)
        if env_value is not None:
            return bool(env_value)

    store_settings = get_settings(db)
    db_value = getattr(store_settings, flag_key, None)
    if db_value is not None:
        return bool(db_value)

    return bool(FEATURE_FLAG_DEFAULTS.get(flag_key, False))
