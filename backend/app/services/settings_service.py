from sqlalchemy.orm import Session
from app.models.models import StoreSetting


DEFAULT_VALUES = {
    "store_name": "NestinoKids",
    "currency": "INR",
    "timezone": "Asia/Kolkata",
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
