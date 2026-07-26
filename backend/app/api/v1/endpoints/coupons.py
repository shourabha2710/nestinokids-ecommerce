from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.models import User
from app.api.v1.endpoints.auth import get_current_user, require_admin
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.core.constants import AuditAction, AuditEntityType
from app.services.audit_service import audit_service
from app.services.coupon_service import (
    create_coupon,
    update_coupon,
    delete_coupon,
    get_coupon,
    list_coupons,
)
from app.schemas.schemas import (
    CouponCreate,
    CouponUpdate,
    CouponResponse,
    CouponValidateRequest,
    CouponValidateResponse,
)

router = APIRouter(tags=["coupons"])


@router.get("/api/v1/admin/coupons")
def list_coupons_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.COUPON_VIEW)),
):
    coupons, total = list_coupons(
        db,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return {
        "items": [CouponResponse.model_validate(c) for c in coupons],
        "total": total,
    }


@router.get("/api/v1/admin/coupons/{coupon_id}", response_model=CouponResponse)
def get_coupon_endpoint(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.COUPON_VIEW)),
):
    coupon = get_coupon(db, coupon_id)
    return CouponResponse.model_validate(coupon)


@router.post("/api/v1/admin/coupons", response_model=CouponResponse, status_code=201)
def create_coupon_endpoint(
    data: CouponCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.COUPON_CREATE)),
):
    coupon = create_coupon(db, data, current_user)
    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        entity_type=AuditEntityType.COUPON,
        entity_id=coupon.id,
        description=f"Created coupon: {coupon.code}",
        new_values={
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": coupon.discount_value,
            "is_active": coupon.is_active,
        },
        request=request,
    )
    return CouponResponse.model_validate(coupon)


@router.put("/api/v1/admin/coupons/{coupon_id}", response_model=CouponResponse)
def update_coupon_endpoint(
    coupon_id: int,
    data: CouponUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.COUPON_UPDATE)),
):
    coupon = get_coupon(db, coupon_id)
    old_values = {
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "is_active": coupon.is_active,
    }
    updated = update_coupon(db, coupon_id, data)
    new_values = {
        "code": updated.code,
        "discount_type": updated.discount_type,
        "discount_value": updated.discount_value,
        "is_active": updated.is_active,
    }
    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.COUPON,
        entity_id=updated.id,
        description=f"Updated coupon: {updated.code}",
        old_values=old_values,
        new_values=new_values,
        request=request,
    )
    return CouponResponse.model_validate(updated)


@router.delete("/api/v1/admin/coupons/{coupon_id}", status_code=204)
def delete_coupon_endpoint(
    coupon_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.COUPON_DELETE)),
):
    coupon = get_coupon(db, coupon_id)
    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.DELETE,
        entity_type=AuditEntityType.COUPON,
        entity_id=coupon.id,
        description=f"Deleted coupon: {coupon.code}",
        old_values={
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": coupon.discount_value,
        },
        request=request,
    )
    deleted = delete_coupon(db, coupon_id)
    return {"detail": "Coupon deleted"}


@router.patch("/api/v1/admin/coupons/{coupon_id}/status", response_model=CouponResponse)
def toggle_coupon_status(
    coupon_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.COUPON_UPDATE)),
):
    coupon = get_coupon(db, coupon_id)
    old_active = coupon.is_active
    coupon.is_active = not coupon.is_active
    db.commit()
    db.refresh(coupon)
    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.STATUS_CHANGE,
        entity_type=AuditEntityType.COUPON,
        entity_id=coupon.id,
        description=f"{'Activated' if coupon.is_active else 'Deactivated'} coupon: {coupon.code}",
        old_values={"is_active": old_active},
        new_values={"is_active": coupon.is_active},
        request=request,
    )
    return CouponResponse.model_validate(coupon)


@router.post("/api/v1/coupons/validate", response_model=CouponValidateResponse)
def validate_coupon_endpoint(
    data: CouponValidateRequest,
    db: Session = Depends(get_db),
):
    from app.services.coupon_service import validate_coupon_for_cart

    valid, discount, message = validate_coupon_for_cart(
        db,
        coupon_code=data.coupon_code,
        cart_total=data.cart_total,
        product_ids=data.product_ids,
        category_ids=data.category_ids,
    )
    final_total = max(0.0, data.cart_total - discount)
    return CouponValidateResponse(
        valid=valid,
        discount=discount,
        discount_type="percentage" if valid else None,
        final_total=final_total,
        message=message,
    )


@router.get("/api/v1/coupons/{code}")
def validate_coupon_legacy(
    code: str,
    total_amount: float = Query(0),
    db: Session = Depends(get_db),
):
    from app.services.coupon_service import validate_coupon_for_cart

    valid, discount, message = validate_coupon_for_cart(
        db,
        coupon_code=code,
        cart_total=total_amount,
    )
    if not valid:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=message)

    from app.models.models import Coupon
    coupon = db.query(Coupon).filter(Coupon.code == code.strip().upper()).first()
    return {
        "id": coupon.id,
        "code": coupon.code,
        "description": coupon.description,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "maximum_discount": coupon.maximum_discount,
        "minimum_order_value": coupon.minimum_order_value,
        "discount": discount,
    }
