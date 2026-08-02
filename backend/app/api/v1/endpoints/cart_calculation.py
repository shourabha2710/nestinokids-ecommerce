from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.models import User, Product, ProductVariant, cart_association
from app.schemas.schemas import CartCalculateRequest, CalculationResponse
from app.services.order_calculation_service import calculate_order

router = APIRouter(prefix="/api/v1/cart", tags=["cart-calculation"])


def _load_cart_items(db: Session, user_id: int) -> list[dict]:
    """Load cart items from DB with computed prices."""
    rows = db.execute(
        select(cart_association).where(cart_association.c.user_id == user_id)
    ).all()

    items = []
    for row in rows:
        product = db.query(Product).filter(Product.id == row.product_id).first()
        if not product:
            continue

        base_price = product.discount_price or product.price
        price_modifier = 0.0
        if row.variant_id:
            variant = db.query(ProductVariant).filter(ProductVariant.id == row.variant_id).first()
            if variant:
                price_modifier = variant.price_modifier or 0.0

        price = base_price + price_modifier
        quantity = row.quantity

        items.append({
            "product_id": row.product_id,
            "category_id": getattr(product, "category_id", None),
            "quantity": quantity,
            "price": price,
            "total": price * quantity,
            "variant_id": row.variant_id,
        })
    return items


@router.post("/calculate-totals", response_model=CalculationResponse)
def calculate_cart(
    data: CartCalculateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate cart totals including promotions, coupon, shipping, and tax.

    Single API call that returns all pricing information for the cart.
    """
    cart_items = _load_cart_items(db, current_user.id)
    return calculate_order(
        db,
        cart_items=cart_items,
        coupon_code=data.coupon_code,
        user_id=current_user.id,
    )
