from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Product, StoreSetting
from app.schemas.schemas import (
    AppliedCouponInfo,
    AppliedPromotionInfo,
    CalculationNotification,
    CalculationResponse,
    ItemTaxDetail,
)
from app.services.promotion_rule_service import evaluate_rules_for_cart
from app.services.coupon_service import validate_coupon_for_cart, calculate_discount
from app.services.gst_service import (
    GstConfigError,
    TAX_CONFIG_ERROR,
    TAX_TYPE_NONE,
    allocate_discounts,
    compute_line_tax,
    compute_shipping_tax,
    money,
    resolve_tax_type,
    to_decimal,
)


def _as_float(value: Decimal) -> float:
    """Final Decimal -> float boundary.

    The whole GST block accumulates in ``Decimal`` so every intermediate is
    rounded once, with ROUND_HALF_UP, by :func:`money`. Floats exist only in the
    Pydantic response/ORM models that are declared as ``Float``; converting here
    (and nowhere earlier) keeps the arithmetic free of binary drift and free of
    Python's banker's rounding.
    """
    return float(value)


def calculate_order(
    db: Session,
    cart_items: list[dict],
    coupon_code: Optional[str] = None,
    user_id: Optional[int] = None,
    loyalty_points_to_redeem: int = 0,
    customer_state: Optional[str] = None,
    enforce_tax_config: bool = False,
) -> CalculationResponse:
    """Centralized order calculation engine.

    Orchestrates: subtotal -> promotions -> coupon -> gift card -> wallet -> loyalty -> shipping -> tax -> grand total.

    GST semantics (G4.2): customer prices are GST-INCLUSIVE, so the tax is
    always *embedded* in the amounts the customer pays and ``grand_total``
    never adds tax on top. Tax is only computed once ``store_settings`` has
    ``tax_enabled=true`` AND every piece of required configuration exists
    (seller state, per-product/category GST rate, shipping GST rate). Until
    then the response is byte-for-byte the G4.1 tax-exempt output
    (``tax == 0.0``, ``tax_type == "none"``).

    ``customer_state`` is the customer's shipping-address state, derived
    server-side by the caller (never trusted from the client). ``enforce_tax_config``
    makes missing config raise 400 (order finalization); otherwise config
    problems degrade gracefully to a ``warning`` notification with zero tax
    (cart preview).

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
            # Pure quote: never mutates the loyalty account, never writes a
            # LoyaltyTransaction. Mutation happens later in the order-creation
            # flow (apply_redemption), only after the Order row has an id.
            points_redeemed, discount = loyalty_service.quote_redemption(
                db, user_id, loyalty_points_to_redeem, subtotal_after_promos_coupons,
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

    # ─── 8. GST / tax ─────────────────────────────────────────────────────
    # GST-inclusive prices: the tax is embedded in the amounts the customer
    # pays and grand_total never adds it on top. Tax stays fully zero until
    # the store enables tax_enabled AND all required config exists.
    store_row = db.query(StoreSetting).first()
    tax_enabled = bool(store_row and store_row.tax_enabled)

    # Every tax figure is accumulated as Decimal and converted to float exactly
    # once, at the response boundary below.
    zero = Decimal("0")
    taxable_amount = zero
    merchandise_taxable_value = zero
    cgst_total = zero
    sgst_total = zero
    igst_total = zero
    shipping_taxable = zero
    shipping_tax = zero
    tax_type = TAX_TYPE_NONE
    place_of_supply = None
    seller_state_snapshot = None
    item_tax_details: list[ItemTaxDetail] = []

    if tax_enabled:
        seller_state_config = (store_row.seller_state or "").strip()
        place_of_supply = (customer_state or "").strip() or seller_state_config or None
        resolved_tax_type = resolve_tax_type(seller_state_config, place_of_supply)

        problems: list[str] = []
        # Machine-readable codes for the problems raised by the pure GST core.
        # Kept parallel to ``problems`` so a specific fault (e.g. a missing
        # shipping GST rate) reaches the client instead of being flattened into
        # the generic TAX_CONFIG_ERROR.
        problem_codes: list[str] = []
        # Per-line tax in Decimal, kept next to the float ItemTaxDetail snapshot
        # so order-level totals are summed without re-adding rounded floats.
        line_decimals: list[dict] = []
        if not seller_state_config:
            problems.append(
                "Seller state must be configured before GST is enabled (store_settings.seller_state)"
            )
            problem_codes.append(TAX_CONFIG_ERROR)
        if not place_of_supply:
            problems.append(
                "Place of supply (customer shipping state) is required for GST calculation"
            )
            problem_codes.append(TAX_CONFIG_ERROR)

        if not problems:
            # Per-line discounted consideration: discounts (promotion + coupon
            # + gift card + wallet + loyalty) are allocated deterministically
            # across lines so each line's tax base is item-accurate and the
            # allocations add up exactly to the total discount.
            line_totals: List[Decimal] = [
                money(
                    item.get("total")
                    or (item.get("price", 0) * item.get("quantity", 0))
                )
                for item in cart_items
            ]
            line_ids = [
                item.get("product_id") or item.get("id") for item in cart_items
            ]
            line_variant_ids = [item.get("variant_id") for item in cart_items]
            allocations = allocate_discounts(
                line_totals, money(total_discount_before_shipping)
            )

            clean_ids = [pid for pid in line_ids if pid]
            products_by_id: dict = {}
            if clean_ids:
                products_by_id = {
                    p.id: p
                    for p in db.query(Product)
                    .filter(Product.id.in_(clean_ids))
                    .all()
                }

            for idx, item in enumerate(cart_items):
                pid = line_ids[idx]
                product = products_by_id.get(pid)
                if product is None:
                    problems.append(
                        f"Product {pid} could not be resolved for GST configuration"
                    )
                    problem_codes.append(TAX_CONFIG_ERROR)
                    continue
                rate = product.gst_rate
                hsn = product.hsn_code
                if rate is None and product.category is not None:
                    rate = product.category.gst_rate
                if hsn is None and product.category is not None:
                    hsn = product.category.hsn_code
                if rate is None:
                    problems.append(
                        f"GST rate is not configured for {product.name}"
                    )
                    problem_codes.append(TAX_CONFIG_ERROR)
                    continue

                allocated = money(to_decimal(allocations[idx]))
                discounted_consideration = money(line_totals[idx] - allocated)
                line_tax = compute_line_tax(
                    discounted_consideration, rate, resolved_tax_type
                )
                # Keep the Decimal values alongside the float snapshot so the
                # order-level totals below never have to re-add rounded floats.
                line_decimals.append(
                    {
                        "taxable_value": line_tax["taxable_value"],
                        "cgst_amount": line_tax["cgst_amount"],
                        "sgst_amount": line_tax["sgst_amount"],
                        "igst_amount": line_tax["igst_amount"],
                    }
                )
                item_tax_details.append(
                    ItemTaxDetail(
                        product_id=pid,
                        variant_id=line_variant_ids[idx],
                        line_total=_as_float(line_totals[idx]),
                        discount_allocated=_as_float(allocated),
                        hsn_code=hsn,
                        tax_rate=float(rate),
                        taxable_value=_as_float(line_tax["taxable_value"]),
                        cgst_amount=_as_float(line_tax["cgst_amount"]),
                        sgst_amount=_as_float(line_tax["sgst_amount"]),
                        igst_amount=_as_float(line_tax["igst_amount"]),
                        product_name=product.name,
                        sku=product.sku,
                    )
                )

            if shipping > 0:
                try:
                    shipping_tax_block = compute_shipping_tax(
                        shipping, resolved_tax_type, store_row.shipping_gst_rate
                    )
                except GstConfigError as e:
                    problems.append(str(e))
                    # Preserve the specific code so the client can tell a missing
                    # shipping GST rate apart from any other configuration fault.
                    problem_codes.append(e.code)
                    shipping_tax_block = None
            else:
                shipping_tax_block = compute_shipping_tax(0, TAX_TYPE_NONE, None)

            if shipping_tax_block is not None:
                shipping_taxable = shipping_tax_block["taxable_value"]
                shipping_tax = shipping_tax_block["total_tax"]

        if problems:
            message = " ".join(dict.fromkeys(problems))
            if enforce_tax_config:
                # Report the most specific code available: a dedicated fault such
                # as SHIPPING_GST_RATE_MISSING must not be masked by the generic
                # TAX_CONFIG_ERROR. Deterministic: first specific code wins,
                # otherwise fall back to the generic one.
                specific = [c for c in problem_codes if c != TAX_CONFIG_ERROR]
                code = specific[0] if specific else TAX_CONFIG_ERROR
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": code, "message": message},
                )
            notifications.append(
                CalculationNotification(
                    type="warning",
                    text=f"Tax cannot be calculated: {message}",
                )
            )
            # Degrade the whole block to the G4.1 tax-exempt state rather than
            # returning a partial/incorrect tax figure.
            taxable_amount = zero
            merchandise_taxable_value = zero
            cgst_total = zero
            sgst_total = zero
            igst_total = zero
            shipping_taxable = zero
            shipping_tax = zero
            tax_type = TAX_TYPE_NONE
            place_of_supply = None
            seller_state_snapshot = None
            item_tax_details = []
        else:
            merchandise_taxable_value = money(
                sum((d["taxable_value"] for d in line_decimals), zero)
            )
            taxable_amount = money(merchandise_taxable_value + shipping_taxable)
            cgst_total = money(
                sum((d["cgst_amount"] for d in line_decimals), zero)
                + shipping_tax_block["cgst_amount"]
            )
            sgst_total = money(
                sum((d["sgst_amount"] for d in line_decimals), zero)
                + shipping_tax_block["sgst_amount"]
            )
            igst_total = money(
                sum((d["igst_amount"] for d in line_decimals), zero)
                + shipping_tax_block["igst_amount"]
            )
            tax_type = resolved_tax_type
            seller_state_snapshot = seller_state_config or None

    # --- 9. Grand Total ---
    # ``taxable`` is the discounted, GST-INCLUSIVE consideration. The embedded
    # tax is NOT added here (prices are inclusive); shipping is inclusive too.
    taxable = max(
        round(subtotal - total_discount_before_shipping, 2), 0.0
    )
    # GST tax total: summed in Decimal and rounded once with ROUND_HALF_UP.
    # Never round() here - Python's round() is banker's rounding on binary
    # floats and would corrupt half-paisa tax components.
    tax = money(cgst_total + sgst_total + igst_total)
    grand_total = round(taxable + shipping, 2)

    tax_applied = tax_type != TAX_TYPE_NONE

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
        tax=_as_float(tax) if tax_applied else 0.0,
        taxable_amount=_as_float(taxable_amount) if tax_applied else 0.0,
        cgst_amount=_as_float(cgst_total) if tax_applied else 0.0,
        sgst_amount=_as_float(sgst_total) if tax_applied else 0.0,
        igst_amount=_as_float(igst_total) if tax_applied else 0.0,
        tax_type=tax_type,
        place_of_supply=place_of_supply,
        seller_state=seller_state_snapshot,
        shipping_taxable=_as_float(shipping_taxable) if tax_applied else 0.0,
        shipping_tax=_as_float(shipping_tax) if tax_applied else 0.0,
        # Loyalty earning base (G4.2): the merchandise consideration AFTER all
        # discounts and BEFORE GST, with shipping and shipping GST excluded.
        # This is the authoritative pre-tax product value - never re-derive it
        # from final_amount, which folds shipping and its embedded GST together.
        loyalty_earning_base=_as_float(
            merchandise_taxable_value if tax_applied else taxable
        ),
        items=item_tax_details,
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
    customer_state: Optional[str] = None,
    enforce_tax_config: bool = False,
) -> CalculationResponse:
    """Same as calculate_order but raises on coupon error (for order placement)."""
    result = calculate_order(
        db,
        cart_items,
        coupon_code,
        user_id,
        loyalty_points_to_redeem,
        customer_state=customer_state,
        enforce_tax_config=enforce_tax_config,
    )
    if coupon_code and result.coupon_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.coupon_error,
        )
    return result
