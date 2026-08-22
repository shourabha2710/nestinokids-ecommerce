from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.schemas import (
    AppliedCouponInfo,
    AppliedPromotionInfo,
    CalculationNotification,
    CalculationResponse,
)
from app.services.promotion_rule_service import evaluate_rules_for_cart
from app.services.coupon_service import validate_coupon_for_cart, calculate_discount

# Tax placeholder — future GST integration
TAX_RATE = 0.0


def calculate_order(
    db: Session,
    cart_items: list[dict],
    coupon_code: Optional[str] = None,
    user_id: Optional[int] = None,
    loyalty_points_to_redeem: int = 0,
) -> CalculationResponse:
    """Centralized order calculation engine.

    Orchestrates: subtotal -> promotions -> coupon -> gift card -> wallet -> loyalty -> shipping -> tax -> grand total.

    Returns a fully populated CalculationResponse. Never returns raw DB objects.
    """
    now = datetime.now(timezone.utc)
    notifications: list[CalculationNotification] = []

    # --- 1. Subtotal ---
    subtotal = 0.0
    item_count = 0
    product_ids: list[int] = []
    category_ids: list[int] = []

    for item in cart_items:
        line_total = item.get("total") or (item.get("price", 0) * item.get("quantity", 0))
        subtotal += line_total
        item_count += item.get("quantity", 0)
        pid = item.get("product_id") or item.get("id")
        if pid:
            product_ids.append(pid)
        cid = item.get("category_id")
        if cid:
            category_ids.append(cid)

    subtotal = round(subtotal, 2)

    # --- 2. Promotions ---
    promotion_discount = 0.0
    applied_promotions: list[AppliedPromotionInfo] = []
    free_shipping = False

    try:
        promo_items = [
            {
                "product_id": item.get("product_id") or item.get("id"),
                "category_id": item.get("category_id"),
                "quantity": item.get("quantity", 0),
                "price": item.get("price", 0),
                "total": item.get("total") or item.get("price", 0) * item.get("quantity", 0),
            }
            for item in cart_items
        ]
        promo_result = evaluate_rules_for_cart(db, subtotal, promo_items)

        if promo_result.best_promotion:
            promotion_discount = promo_result.discount_amount
            free_shipping = promo_result.free_shipping
            applied_promotions.append(
                AppliedPromotionInfo(
                    id=promo_result.best_promotion.id,
                    name=promo_result.best_promotion.name,
                    badge_text=promo_result.best_promotion.badge_text,
                    discount_amount=round(promotion_discount, 2),
                )
            )
            notifications.append(
                CalculationNotification(type="promotion", text=f"{promo_result.best_promotion.name} applied")
            )
            if free_shipping:
                notifications.append(
                    CalculationNotification(type="shipping", text="Free shipping from promotion")
                )
    except Exception:
        pass  # promotion failure must never break checkout

    # --- 3. Coupon ---
    coupon_discount = 0.0
    applied_coupon: Optional[AppliedCouponInfo] = None
    coupon_error: Optional[str] = None

    if coupon_code:
        try:
            product_ids_unique = list(set(product_ids))
            category_ids_unique = list(set(category_ids))
            valid, discount, message = validate_coupon_for_cart(
                db,
                coupon_code=coupon_code,
                cart_total=subtotal,
                product_ids=product_ids_unique if product_ids_unique else None,
                category_ids=category_ids_unique if category_ids_unique else None,
                user_id=user_id,
            )
            if valid:
                coupon_discount = round(discount, 2)
                # Fetch coupon details for response
                from app.models.models import Coupon
                coupon_obj = db.query(Coupon).filter(
                    Coupon.code == coupon_code.strip().upper()
                ).first()
                if coupon_obj:
                    applied_coupon = AppliedCouponInfo(
                        code=coupon_obj.code,
                        discount_type=coupon_obj.discount_type,
                        discount_value=coupon_obj.discount_value,
                        discount_amount=coupon_discount,
                    )
                notifications.append(
                    CalculationNotification(type="coupon", text=f"Coupon {coupon_code.strip().upper()} applied")
                )
            else:
                coupon_error = message
                notifications.append(
                    CalculationNotification(type="warning", text=message)
                )
        except Exception:
            coupon_error = "Failed to validate coupon"

    # --- 4. Gift Card (placeholder) ---
    gift_card_discount = 0.0

    # --- 5. Wallet (placeholder) ---
    wallet_discount = 0.0

    # --- 6. Loyalty ---
    loyalty_discount = 0.0
    loyalty_points_redeemed = 0

    if loyalty_points_to_redeem > 0 and user_id and settings.LOYALTY_ENABLED:
        try:
            subtotal_after_promos_coupons = max(subtotal - promotion_discount - coupon_discount, 0.0)
            from app.services.loyalty_service import loyalty_service
            points_redeemed, discount = loyalty_service.redeem_points(
                db, user_id, loyalty_points_to_redeem, subtotal_after_promos_coupons,
                description="Points redeemed at checkout"
            )
            if points_redeemed > 0:
                loyalty_discount = round(discount, 2)
                loyalty_points_redeemed = points_redeemed
                notifications.append(
                    CalculationNotification(type="loyalty", text=f"{points_redeemed} loyalty points redeemed (₹{loyalty_discount:.2f} off)")
                )
        except ValueError as e:
            notifications.append(
                CalculationNotification(type="warning", text=str(e))
            )

    # --- 7. Shipping ---
    total_discount_before_shipping = promotion_discount + coupon_discount + gift_card_discount + wallet_discount + loyalty_discount
    if not cart_items:
        # Empty cart never charges shipping
        shipping = 0.0
    elif free_shipping:
        shipping = 0.0
    else:
        shipping = (
            0.0
            if subtotal >= settings.FREE_SHIPPING_THRESHOLD
            else settings.FLAT_SHIPPING_RATE
        )
        if subtotal >= settings.FREE_SHIPPING_THRESHOLD:
            notifications.append(
                CalculationNotification(
                    type="shipping",
                    text=f"Free shipping applied (orders ₹{settings.FREE_SHIPPING_THRESHOLD:.0f}+)",
                )
            )

    # --- 8. Tax (placeholder) ---
    taxable = max(subtotal - total_discount_before_shipping, 0.0)
    tax = round(taxable * TAX_RATE, 2)

    # --- 9. Grand Total ---
    grand_total = round(taxable + tax + shipping, 2)

    return CalculationResponse(
        subtotal=subtotal,
        item_count=item_count,
        promotion_discount=round(promotion_discount, 2),
        applied_promotions=applied_promotions,
        free_shipping=free_shipping,
        coupon_discount=coupon_discount,
        applied_coupon=applied_coupon,
        coupon_error=coupon_error,
        shipping=shipping,
        free_shipping_threshold=settings.FREE_SHIPPING_THRESHOLD,
        tax=tax,
        wallet_discount=wallet_discount,
        loyalty_discount=loyalty_discount,
        loyalty_points_redeemed=loyalty_points_redeemed,
        gift_card_discount=gift_card_discount,
        grand_total=grand_total,
        currency="INR",
        calculated_at=now,
        notifications=notifications,
    )


def calculate_for_order_creation(
    db: Session,
    cart_items: list[dict],
    coupon_code: Optional[str] = None,
    user_id: Optional[int] = None,
    loyalty_points_to_redeem: int = 0,
) -> CalculationResponse:
    """Same as calculate_order but raises on coupon error (for order placement)."""
    result = calculate_order(db, cart_items, coupon_code, user_id, loyalty_points_to_redeem)
    if coupon_code and result.coupon_error:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.coupon_error,
        )
    return result
