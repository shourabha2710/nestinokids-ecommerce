from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.models.models import Promotion, PromotionTypeEnum, User
from app.schemas.schemas import PromotionCreate, PromotionUpdate


def create_promotion(db: Session, data: PromotionCreate, current_user: User) -> Promotion:
    promo_type = PromotionTypeEnum(data.promotion_type)

    if promo_type == PromotionTypeEnum.PERCENTAGE and data.discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Percentage discount cannot exceed 100",
        )

    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be >= start_date",
        )

    promotion = Promotion(
        name=data.name,
        description=data.description,
        promotion_type=promo_type,
        discount_value=data.discount_value,
        minimum_order_amount=data.minimum_order_amount,
        maximum_discount_amount=data.maximum_discount_amount,
        priority=data.priority,
        is_stackable=data.is_stackable,
        is_active=data.is_active,
        start_date=data.start_date,
        end_date=data.end_date,
        banner_text=data.banner_text,
        badge_text=data.badge_text,
        created_by=current_user.id,
        category_id=data.category_id,
        product_id=data.product_id,
    )
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    return promotion


def update_promotion(db: Session, promotion_id: int, data: PromotionUpdate) -> Promotion:
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found",
        )

    if data.promotion_type is not None:
        promo_type = PromotionTypeEnum(data.promotion_type)
        if promo_type == PromotionTypeEnum.PERCENTAGE and data.discount_value is not None and data.discount_value > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Percentage discount cannot exceed 100",
            )
        promotion.promotion_type = promo_type
    elif data.discount_value is not None and promotion.promotion_type == PromotionTypeEnum.PERCENTAGE and data.discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Percentage discount cannot exceed 100",
        )

    if data.name is not None:
        promotion.name = data.name
    if data.description is not None:
        promotion.description = data.description
    if data.discount_value is not None:
        promotion.discount_value = data.discount_value
    if data.minimum_order_amount is not None:
        promotion.minimum_order_amount = data.minimum_order_amount
    if data.maximum_discount_amount is not None:
        promotion.maximum_discount_amount = data.maximum_discount_amount
    if data.priority is not None:
        promotion.priority = data.priority
    if data.is_stackable is not None:
        promotion.is_stackable = data.is_stackable
    if data.is_active is not None:
        promotion.is_active = data.is_active
    if data.start_date is not None:
        promotion.start_date = data.start_date
    if data.end_date is not None:
        promotion.end_date = data.end_date
    if data.banner_text is not None:
        promotion.banner_text = data.banner_text
    if data.badge_text is not None:
        promotion.badge_text = data.badge_text
    if data.category_id is not None:
        promotion.category_id = data.category_id
    if data.product_id is not None:
        promotion.product_id = data.product_id

    if promotion.end_date < promotion.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be >= start_date",
        )

    db.commit()
    db.refresh(promotion)
    return promotion


def delete_promotion(db: Session, promotion_id: int) -> Promotion:
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found",
        )
    db.delete(promotion)
    db.commit()
    return promotion


def get_promotion(db: Session, promotion_id: int) -> Promotion:
    promotion = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Promotion not found",
        )
    return promotion


def list_promotions(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    promotion_type: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[Promotion], int]:
    query = db.query(Promotion)

    if search:
        query = query.filter(
            Promotion.name.ilike(f"%{search}%") |
            Promotion.description.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.filter(Promotion.is_active == is_active)
    if promotion_type:
        query = query.filter(Promotion.promotion_type == promotion_type)

    total = query.count()

    sort_column = getattr(Promotion, sort_by, Promotion.created_at)
    order_func = desc if sort_order == "desc" else asc
    query = query.order_by(order_func(sort_column))

    promotions = query.offset(skip).limit(limit).all()
    return promotions, total


def validate_active_period(promotion: Promotion) -> bool:
    now = datetime.now(timezone.utc)
    return promotion.is_active and promotion.start_date <= now <= promotion.end_date
