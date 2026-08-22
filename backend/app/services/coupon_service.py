from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.models.models import Coupon, User
from app.schemas.schemas import CouponCreate, CouponUpdate


def create_coupon(db: Session, data: CouponCreate, current_user: User) -> Coupon:
    existing = db.query(Coupon).filter(Coupon.code == data.code.strip().upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A coupon with this code already exists",
        )

    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be >= start_date",
        )

    if data.discount_type == "percentage" and data.discount_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Percentage discount cannot exceed 100",
        )

    coupon = Coupon(
        code=data.code.strip().upper(),
        name=data.name,
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        minimum_order_value=data.minimum_order_value,
        maximum_discount=data.maximum_discount,
        max_usage=data.max_usage,
        per_user_limit=data.per_user_limit,
        applicable_scope=data.applicable_scope,
        priority=data.priority,
        category_id=data.category_id,
        product_id=data.product_id,
        start_date=data.start_date,
        end_date=data.end_date,
        is_active=data.is_active,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


def update_coupon(db: Session, coupon_id: int, data: CouponUpdate) -> Coupon:
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found",
        )

    if data.code is not None:
        new_code = data.code.strip().upper()
        existing = db.query(Coupon).filter(
            Coupon.code == new_code, Coupon.id != coupon_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A coupon with this code already exists",
            )
        coupon.code = new_code

    if data.discount_type is not None:
        coupon.discount_type = data.discount_type
    if data.discount_value is not None:
        if coupon.discount_type == "percentage" and data.discount_value > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Percentage discount cannot exceed 100",
            )
        coupon.discount_value = data.discount_value

    if data.name is not None:
        coupon.name = data.name
    if data.description is not None:
        coupon.description = data.description
    if data.minimum_order_value is not None:
        coupon.minimum_order_value = data.minimum_order_value
    if data.maximum_discount is not None:
        coupon.maximum_discount = data.maximum_discount
    if data.max_usage is not None:
        coupon.max_usage = data.max_usage
    if data.per_user_limit is not None:
        coupon.per_user_limit = data.per_user_limit
    if data.applicable_scope is not None:
        coupon.applicable_scope = data.applicable_scope
    if data.priority is not None:
        coupon.priority = data.priority
    if data.category_id is not None:
        coupon.category_id = data.category_id
    if data.product_id is not None:
        coupon.product_id = data.product_id
    if data.start_date is not None:
        coupon.start_date = data.start_date
    if data.end_date is not None:
        coupon.end_date = data.end_date
    if data.is_active is not None:
        coupon.is_active = data.is_active

    if coupon.end_date < coupon.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be >= start_date",
        )

    db.commit()
    db.refresh(coupon)
    return coupon


def delete_coupon(db: Session, coupon_id: int) -> Coupon:
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found",
        )
    db.delete(coupon)
    db.commit()
    return coupon


def get_coupon(db: Session, coupon_id: int) -> Coupon:
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found",
        )
    return coupon


def list_coupons(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[Coupon], int]:
    query = db.query(Coupon)

    if search:
        query = query.filter(
            Coupon.code.ilike(f"%{search}%")
            | Coupon.name.ilike(f"%{search}%")
            | Coupon.description.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.filter(Coupon.is_active == is_active)

    total = query.count()

    sort_column = getattr(Coupon, sort_by, Coupon.created_at)
    order_func = desc if sort_order == "desc" else asc
    query = query.order_by(order_func(sort_column))

    coupons = query.offset(skip).limit(limit).all()
    return coupons, total


def calculate_discount(coupon: Coupon, cart_total: float) -> float:
    if coupon.discount_type == "percentage":
        discount = (cart_total * coupon.discount_value) / 100
        if coupon.maximum_discount is not None:
            discount = min(discount, coupon.maximum_discount)
        return round(discount, 2)
    else:
        return min(coupon.discount_value, cart_total)


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalize DB datetimes to aware UTC.

    SQLite round-trips DateTime columns as naive values; Postgres returns
    aware ones. Comparing against datetime.now(timezone.utc) raises TypeError
    for naive inputs, silently invalidating coupons.
    """
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


def validate_coupon_for_cart(
    db: Session,
    coupon_code: str,
    cart_total: float,
    product_ids: list[int] = None,
    category_ids: list[int] = None,
    user_id: int = None,
) -> tuple[bool, float, str]:
    coupon = db.query(Coupon).filter(
        Coupon.code == coupon_code.strip().upper()
    ).first()

    if not coupon:
        return False, 0.0, "Coupon not found"

    now = datetime.now(timezone.utc)

    if not coupon.is_active:
        return False, 0.0, "Coupon is disabled"

    start = _as_utc(coupon.start_date)
    if start and now < start:
        return False, 0.0, "Coupon is not active yet"

    end = _as_utc(coupon.end_date)
    if end and now > end:
        return False, 0.0, "Coupon has expired"

    if coupon.minimum_order_value and cart_total < coupon.minimum_order_value:
        return False, 0.0, f"Minimum order amount is ₹{coupon.minimum_order_value}"

    if coupon.max_usage is not None and coupon.usage_count >= coupon.max_usage:
        return False, 0.0, "Coupon usage limit reached"

    if coupon.applicable_scope == "PRODUCT" and product_ids:
        if not coupon.product_id or coupon.product_id not in product_ids:
            return False, 0.0, "Coupon is not applicable to products in your cart"

    if coupon.applicable_scope == "CATEGORY" and category_ids:
        if not coupon.category_id or coupon.category_id not in category_ids:
            return False, 0.0, "Coupon is not applicable to categories in your cart"

    discount = calculate_discount(coupon, cart_total)
    return True, discount, "Coupon applied successfully"
