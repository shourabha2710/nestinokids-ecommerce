from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.models import Promotion
from app.schemas.schemas import (
    PromotionResponse,
    PromotionEvaluateRequest,
    PromotionEvaluateResponse,
)
from app.services.promotion_rule_service import evaluate_rules_for_cart

router = APIRouter(prefix="/api/v1/promotions", tags=["promotions-public"])


@router.get("/active", response_model=list[PromotionResponse])
def get_active_promotions(
    category_id: int = Query(None),
    product_id: int = Query(None),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    query = (
        db.query(Promotion)
        .options(joinedload(Promotion.rules))
        .filter(
            Promotion.is_active == True,
            Promotion.start_date <= now,
            Promotion.end_date >= now,
        )
    )
    if category_id is not None:
        query = query.filter(Promotion.category_id == category_id)
    if product_id is not None:
        query = query.filter(Promotion.product_id == product_id)

    promotions = query.order_by(desc(Promotion.priority), asc(Promotion.start_date)).all()
    return [PromotionResponse.model_validate(p) for p in promotions]


@router.post("/evaluate", response_model=PromotionEvaluateResponse)
def evaluate_cart_promotions(
    data: PromotionEvaluateRequest,
    db: Session = Depends(get_db),
):
    """Evaluate promotion rules against cart contents. Returns best promotion, discount, and free shipping."""
    items = [item.model_dump() for item in data.items]
    return evaluate_rules_for_cart(db, data.cart_total, items)
