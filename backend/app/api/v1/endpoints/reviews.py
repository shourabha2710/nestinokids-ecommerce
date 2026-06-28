import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import CustomerReview, User
from app.schemas.schemas import CustomerReviewCreate, CustomerReviewUpdate, CustomerReviewResponse
from app.api.v1.endpoints.auth import require_admin
from app.core.config import settings

router = APIRouter(tags=["reviews"])

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}


@router.get("/api/v1/reviews", response_model=List[CustomerReviewResponse])
def get_public_reviews(db: Session = Depends(get_db)):
    return db.query(CustomerReview).filter(
        CustomerReview.is_active == True
    ).order_by(CustomerReview.display_order.asc()).all()


@router.get("/api/v1/admin/reviews", response_model=List[CustomerReviewResponse])
def get_admin_reviews(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.query(CustomerReview).order_by(CustomerReview.display_order.asc()).all()


@router.post("/api/v1/admin/reviews", response_model=CustomerReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    request: Request,
    customer_name: str = Form(...),
    review_text: str = Form(...),
    rating: int = Form(...),
    city: str = Form(None),
    is_featured: bool = Form(False),
    display_order: int = Form(0),
    is_active: bool = Form(True),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    final_image = None

    if image:
        ext = Path(image.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
            )

        contents = image.file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
            )

        unique_name = f"{uuid.uuid4().hex}{ext}"
        upload_dir = Path(settings.UPLOAD_DIR) / "reviews"
        upload_dir.mkdir(parents=True, exist_ok=True)
        with open(upload_dir / unique_name, "wb") as f:
            f.write(contents)

        final_image = f"/{settings.UPLOAD_DIR}/reviews/{unique_name}"

    review = CustomerReview(
        customer_name=customer_name,
        customer_image=final_image,
        review_text=review_text,
        rating=rating,
        city=city if city else None,
        is_featured=is_featured,
        display_order=display_order,
        is_active=is_active,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.put("/api/v1/admin/reviews/{review_id}", response_model=CustomerReviewResponse)
def update_review(
    review_id: int,
    request: Request,
    customer_name: str = Form(None),
    review_text: str = Form(None),
    rating: int = Form(None),
    city: str = Form(None),
    is_featured: bool = Form(None),
    display_order: int = Form(None),
    is_active: bool = Form(None),
    customer_image_url: str = Form(None),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    review = db.query(CustomerReview).filter(CustomerReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if customer_name is not None:
        review.customer_name = customer_name
    if review_text is not None:
        review.review_text = review_text
    if rating is not None:
        review.rating = rating
    if city is not None:
        review.city = city if city else None
    if is_featured is not None:
        review.is_featured = is_featured
    if display_order is not None:
        review.display_order = display_order
    if is_active is not None:
        review.is_active = is_active
    if customer_image_url is not None:
        review.customer_image = customer_image_url if customer_image_url else None

    if image:
        ext = Path(image.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
            )

        contents = image.file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
            )

        unique_name = f"{uuid.uuid4().hex}{ext}"
        upload_dir = Path(settings.UPLOAD_DIR) / "reviews"
        upload_dir.mkdir(parents=True, exist_ok=True)
        with open(upload_dir / unique_name, "wb") as f:
            f.write(contents)

        review.customer_image = f"/{settings.UPLOAD_DIR}/reviews/{unique_name}"

    db.commit()
    db.refresh(review)
    return review


@router.delete("/api/v1/admin/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    review = db.query(CustomerReview).filter(CustomerReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
