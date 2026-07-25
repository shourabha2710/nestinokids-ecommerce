from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.models import User
from app.api.v1.endpoints.auth import get_current_user
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.core.constants import AuditAction, AuditEntityType
from app.services.audit_service import audit_service
from app.services.promotion_service import (
    create_promotion,
    update_promotion,
    delete_promotion,
    get_promotion,
    list_promotions,
)
from app.schemas.schemas import (
    PromotionCreate,
    PromotionUpdate,
    PromotionResponse,
    PromotionListResponse,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin-promotions"])


@router.get("/promotions", response_model=PromotionListResponse)
def list_promotions_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    promotion_type: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|name|priority|start_date|end_date)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.PROMOTION_VIEW)),
):
    promotions, total = list_promotions(
        db,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        promotion_type=promotion_type,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return PromotionListResponse(
        items=[PromotionResponse.model_validate(p) for p in promotions],
        total=total,
    )


@router.get("/promotions/{promotion_id}", response_model=PromotionResponse)
def get_promotion_endpoint(
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.PROMOTION_VIEW)),
):
    promotion = get_promotion(db, promotion_id)
    return PromotionResponse.model_validate(promotion)


@router.post("/promotions", response_model=PromotionResponse, status_code=201)
def create_promotion_endpoint(
    data: PromotionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.PROMOTION_CREATE)),
):
    promotion = create_promotion(db, data, current_user)
    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        entity_type=AuditEntityType.PROMOTION,
        entity_id=promotion.id,
        description=f"Created promotion: {promotion.name}",
        new_values={
            "name": promotion.name,
            "promotion_type": promotion.promotion_type.value,
            "discount_value": promotion.discount_value,
            "is_active": promotion.is_active,
        },
        request=request,
    )
    return PromotionResponse.model_validate(promotion)


@router.put("/promotions/{promotion_id}", response_model=PromotionResponse)
def update_promotion_endpoint(
    promotion_id: int,
    data: PromotionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.PROMOTION_UPDATE)),
):
    promotion = get_promotion(db, promotion_id)
    old_values = {
        "name": promotion.name,
        "promotion_type": promotion.promotion_type.value,
        "discount_value": promotion.discount_value,
        "minimum_order_amount": promotion.minimum_order_amount,
        "maximum_discount_amount": promotion.maximum_discount_amount,
        "priority": promotion.priority,
        "is_stackable": promotion.is_stackable,
        "is_active": promotion.is_active,
    }

    updated = update_promotion(db, promotion_id, data)

    new_values = {
        "name": updated.name,
        "promotion_type": updated.promotion_type.value,
        "discount_value": updated.discount_value,
        "minimum_order_amount": updated.minimum_order_amount,
        "maximum_discount_amount": updated.maximum_discount_amount,
        "priority": updated.priority,
        "is_stackable": updated.is_stackable,
        "is_active": updated.is_active,
    }

    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.PROMOTION,
        entity_id=updated.id,
        description=f"Updated promotion: {updated.name}",
        old_values=old_values,
        new_values=new_values,
        request=request,
    )
    return PromotionResponse.model_validate(updated)


@router.delete("/promotions/{promotion_id}", response_model=PromotionResponse)
def delete_promotion_endpoint(
    promotion_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.PROMOTION_DELETE)),
):
    promotion = get_promotion(db, promotion_id)
    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.DELETE,
        entity_type=AuditEntityType.PROMOTION,
        entity_id=promotion.id,
        description=f"Deleted promotion: {promotion.name}",
        old_values={
            "name": promotion.name,
            "promotion_type": promotion.promotion_type.value,
            "discount_value": promotion.discount_value,
        },
        request=request,
    )
    deleted = delete_promotion(db, promotion_id)
    return PromotionResponse.model_validate(deleted)
