from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import (
    Promotion,
    PromotionRule,
    PromotionRuleTypeEnum,
    PromotionTypeEnum,
)
from app.schemas.schemas import (
    EligiblePromotion,
    PromotionEvaluateResponse,
)


def evaluate_rules_for_cart(
    db: Session,
    cart_total: float,
    items: list[dict],
) -> PromotionEvaluateResponse:
    """Evaluate all active promotion rules against a cart.

    Returns the best promotion (highest priority wins) with discount amount
    and free shipping eligibility. Never raises — returns empty on error.
    """
    try:
        now = datetime.now(timezone.utc)

        # Gather cart data for fast lookups
        cart_product_ids = set()
        cart_category_ids = set()
        total_quantity = 0
        product_quantities: dict[int, int] = {}
        product_prices: dict[int, float] = {}

        for item in items:
            pid = item.get("product_id")
            if pid:
                cart_product_ids.add(pid)
                qty = item.get("quantity", 0)
                product_quantities[pid] = product_quantities.get(pid, 0) + qty
                product_prices[pid] = item.get("price", 0.0)
                total_quantity += qty
            cid = item.get("category_id")
            if cid:
                cart_category_ids.add(cid)

        # Fetch active promotions with their active rules
        promotions = (
            db.query(Promotion)
            .filter(
                Promotion.is_active == True,
                Promotion.start_date <= now,
                Promotion.end_date >= now,
            )
            .all()
        )

        eligible_promotions = []

        for promo in promotions:
            # Get active rules for this promotion
            active_rules = [
                r for r in promo.rules
                if r.is_active
            ]
            if not active_rules:
                continue

            # ALL rules must pass (AND logic)
            all_pass = True
            has_free_shipping_rule = False

            for rule in active_rules:
                passed = _evaluate_single_rule(
                    rule, cart_total, total_quantity,
                    cart_product_ids, cart_category_ids,
                    product_quantities, product_prices,
                )
                if not passed:
                    all_pass = False
                    break
                if rule.rule_type == PromotionRuleTypeEnum.FREE_SHIPPING:
                    has_free_shipping_rule = True

            if all_pass:
                eligible_promotions.append(
                    EligiblePromotion(
                        id=promo.id,
                        name=promo.name,
                        description=promo.description,
                        promotion_type=promo.promotion_type.value,
                        discount_value=promo.discount_value,
                        badge_text=promo.badge_text,
                        banner_text=promo.banner_text,
                    )
                )

        if not eligible_promotions:
            return PromotionEvaluateResponse(
                eligible_promotions=[],
                best_promotion=None,
                discount_amount=0.0,
                free_shipping=False,
            )

        # Sort by promotion priority DESC, then id ASC
        promo_priority_map = {p.id: p for p in promotions}
        eligible_promotions.sort(
            key=lambda ep: (
                -(promo_priority_map[ep.id].priority),
                ep.id,
            )
        )

        best = eligible_promotions[0]
        best_promo = promo_priority_map[best.id]

        # Calculate discount
        discount_amount = _calculate_discount(
            best_promo, cart_total, items,
            product_quantities, product_prices,
        )

        # Check free shipping
        free_shipping = any(
            r.rule_type == PromotionRuleTypeEnum.FREE_SHIPPING
            for r in best_promo.rules
            if r.is_active
        )

        return PromotionEvaluateResponse(
            eligible_promotions=eligible_promotions,
            best_promotion=best,
            discount_amount=round(discount_amount, 2),
            free_shipping=free_shipping,
        )

    except Exception:
        # Never fail — return empty response
        return PromotionEvaluateResponse(
            eligible_promotions=[],
            best_promotion=None,
            discount_amount=0.0,
            free_shipping=False,
        )


def _evaluate_single_rule(
    rule: PromotionRule,
    cart_total: float,
    total_quantity: int,
    cart_product_ids: set,
    cart_category_ids: set,
    product_quantities: dict[int, int],
    product_prices: dict[int, float],
) -> bool:
    """Evaluate a single promotion rule against cart data."""
    rt = rule.rule_type

    if rt == PromotionRuleTypeEnum.MINIMUM_CART_VALUE:
        if rule.minimum_cart_amount is None:
            return False
        return cart_total >= rule.minimum_cart_amount

    if rt == PromotionRuleTypeEnum.QUANTITY_BASED:
        if rule.minimum_quantity is None:
            return False
        return total_quantity >= rule.minimum_quantity

    if rt == PromotionRuleTypeEnum.CATEGORY_BASED:
        if rule.category_id is None:
            return False
        return rule.category_id in cart_category_ids

    if rt == PromotionRuleTypeEnum.PRODUCT_BASED:
        if rule.product_id is None:
            return False
        return rule.product_id in cart_product_ids

    if rt == PromotionRuleTypeEnum.BUY_X_GET_Y:
        if rule.product_id is None or rule.buy_quantity is None:
            return False
        qty_in_cart = product_quantities.get(rule.product_id, 0)
        if qty_in_cart < rule.buy_quantity:
            return False
        if rule.target_product_id and rule.target_product_id not in cart_product_ids:
            return False
        return True

    if rt == PromotionRuleTypeEnum.FREE_SHIPPING:
        if rule.minimum_cart_amount is None:
            return False
        return cart_total >= rule.minimum_cart_amount

    return False


def _calculate_discount(
    promo: Promotion,
    cart_total: float,
    items: list[dict],
    product_quantities: dict[int, int],
    product_prices: dict[int, float],
) -> float:
    """Calculate the discount amount for the best promotion."""
    # Check if any rule has a discount override
    for rule in promo.rules:
        if rule.is_active and rule.discount_type and rule.discount_value is not None:
            if rule.discount_type == "percentage":
                disc = (cart_total * rule.discount_value) / 100
                if promo.maximum_discount_amount:
                    disc = min(disc, promo.maximum_discount_amount)
                return disc
            else:
                return min(rule.discount_value, cart_total)

    # Check for BUY_X_GET_Y rule — discount = price of free items
    for rule in promo.rules:
        if rule.is_active and rule.rule_type == PromotionRuleTypeEnum.BUY_X_GET_Y:
            if rule.product_id and rule.get_quantity:
                price = product_prices.get(rule.product_id, 0.0)
                return price * rule.get_quantity

    # Use promotion-level discount
    if promo.promotion_type == PromotionTypeEnum.PERCENTAGE:
        disc = (cart_total * promo.discount_value) / 100
        if promo.maximum_discount_amount:
            disc = min(disc, promo.maximum_discount_amount)
        return disc
    else:
        return min(promo.discount_value, cart_total)


def get_rules_for_promotion(db: Session, promotion_id: int) -> list[PromotionRule]:
    """Get all rules for a promotion."""
    return (
        db.query(PromotionRule)
        .filter(PromotionRule.promotion_id == promotion_id)
        .order_by(PromotionRule.priority.desc(), PromotionRule.id)
        .all()
    )


def delete_rules_for_promotion(db: Session, promotion_id: int) -> None:
    """Delete all rules for a promotion."""
    db.query(PromotionRule).filter(
        PromotionRule.promotion_id == promotion_id
    ).delete()
    db.flush()
