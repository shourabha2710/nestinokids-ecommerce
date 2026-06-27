import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import HeroSlide, User
from app.schemas.schemas import HeroSlideCreate, HeroSlideUpdate, HeroSlideResponse
from app.api.v1.endpoints.auth import require_admin
from app.core.config import settings

router = APIRouter(tags=["hero"])

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.webm'}


def save_media(file: UploadFile) -> str:
    ext = Path(file.filename).suffix.lower()
    allowed = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(allowed))}",
        )
    contents = file.file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR) / "hero"
    upload_dir.mkdir(parents=True, exist_ok=True)
    with open(upload_dir / unique_name, "wb") as f:
        f.write(contents)
    return f"/{settings.UPLOAD_DIR}/hero/{unique_name}"


@router.get("/api/v1/hero-slides", response_model=List[HeroSlideResponse])
def get_public_slides(db: Session = Depends(get_db)):
    return db.query(HeroSlide).filter(
        HeroSlide.is_active == True
    ).order_by(HeroSlide.display_order.asc()).all()


@router.get("/api/v1/admin/hero-slides", response_model=List[HeroSlideResponse])
def get_admin_slides(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(HeroSlide).order_by(HeroSlide.display_order.asc()).all()


@router.post("/api/v1/admin/hero-slides", response_model=HeroSlideResponse, status_code=status.HTTP_201_CREATED)
def create_slide(
    request: Request,
    title: str = Form(None),
    subtitle: str = Form(None),
    description: str = Form(None),
    media_type: str = Form("image"),
    media_url: str = Form(None),
    mobile_media_url: str = Form(None),
    primary_button_text: str = Form(None),
    primary_button_link: str = Form(None),
    secondary_button_text: str = Form(None),
    secondary_button_link: str = Form(None),
    badge_text: str = Form(None),
    display_order: int = Form(0),
    is_active: bool = Form(True),
    media_file: UploadFile = File(None),
    mobile_media_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    final_media_url = media_url
    final_mobile_media_url = mobile_media_url

    if media_file:
        final_media_url = save_media(media_file)
    if mobile_media_file:
        final_mobile_media_url = save_media(mobile_media_file)

    if not final_media_url:
        raise HTTPException(status_code=400, detail="Either media_url or media_file is required")

    slide = HeroSlide(
        title=title,
        subtitle=subtitle,
        description=description,
        media_type=media_type,
        media_url=final_media_url,
        mobile_media_url=final_mobile_media_url,
        primary_button_text=primary_button_text,
        primary_button_link=primary_button_link,
        secondary_button_text=secondary_button_text,
        secondary_button_link=secondary_button_link,
        badge_text=badge_text,
        display_order=display_order,
        is_active=is_active,
    )
    db.add(slide)
    db.commit()
    db.refresh(slide)
    return slide


@router.put("/api/v1/admin/hero-slides/{slide_id}", response_model=HeroSlideResponse)
def update_slide(
    slide_id: int,
    request: Request,
    title: str = Form(None),
    subtitle: str = Form(None),
    description: str = Form(None),
    media_type: str = Form(None),
    media_url: str = Form(None),
    mobile_media_url: str = Form(None),
    primary_button_text: str = Form(None),
    primary_button_link: str = Form(None),
    secondary_button_text: str = Form(None),
    secondary_button_link: str = Form(None),
    badge_text: str = Form(None),
    display_order: int = Form(None),
    is_active: bool = Form(None),
    media_file: UploadFile = File(None),
    mobile_media_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    slide = db.query(HeroSlide).filter(HeroSlide.id == slide_id).first()
    if not slide:
        raise HTTPException(status_code=404, detail="Hero slide not found")

    if title is not None:
        slide.title = title
    if subtitle is not None:
        slide.subtitle = subtitle
    if description is not None:
        slide.description = description
    if media_type is not None:
        slide.media_type = media_type
    if media_url is not None:
        slide.media_url = media_url
    if mobile_media_url is not None:
        slide.mobile_media_url = mobile_media_url if mobile_media_url else None
    if primary_button_text is not None:
        slide.primary_button_text = primary_button_text
    if primary_button_link is not None:
        slide.primary_button_link = primary_button_link
    if secondary_button_text is not None:
        slide.secondary_button_text = secondary_button_text
    if secondary_button_link is not None:
        slide.secondary_button_link = secondary_button_link
    if badge_text is not None:
        slide.badge_text = badge_text
    if display_order is not None:
        slide.display_order = display_order
    if is_active is not None:
        slide.is_active = is_active

    if media_file:
        slide.media_url = save_media(media_file)
        # Infer media_type from extension
        ext = Path(media_file.filename).suffix.lower()
        slide.media_type = "video" if ext in ALLOWED_VIDEO_EXTENSIONS else "image"
    if mobile_media_file:
        slide.mobile_media_url = save_media(mobile_media_file)

    db.commit()
    db.refresh(slide)
    return slide


@router.delete("/api/v1/admin/hero-slides/{slide_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_slide(
    slide_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    slide = db.query(HeroSlide).filter(HeroSlide.id == slide_id).first()
    if not slide:
        raise HTTPException(status_code=404, detail="Hero slide not found")
    db.delete(slide)
    db.commit()


@router.post("/api/v1/admin/hero-slides/reorder", status_code=status.HTTP_200_OK)
def reorder_slides(
    data: list[dict],
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    for item in data:
        slide = db.query(HeroSlide).filter(HeroSlide.id == item["id"]).first()
        if slide:
            slide.display_order = item["display_order"]
    db.commit()
    return {"status": "ok"}


@router.post("/api/v1/hero-slides/{slide_id}/view", status_code=status.HTTP_200_OK)
def track_view(
    slide_id: int,
    db: Session = Depends(get_db),
):
    slide = db.query(HeroSlide).filter(HeroSlide.id == slide_id, HeroSlide.is_active == True).first()
    if slide:
        slide.view_count = (slide.view_count or 0) + 1
        db.commit()
    return {"status": "ok"}


@router.post("/api/v1/hero-slides/{slide_id}/click", status_code=status.HTTP_200_OK)
def track_click(
    slide_id: int,
    db: Session = Depends(get_db),
):
    slide = db.query(HeroSlide).filter(HeroSlide.id == slide_id, HeroSlide.is_active == True).first()
    if slide:
        slide.click_count = (slide.click_count or 0) + 1
        db.commit()
    return {"status": "ok"}
