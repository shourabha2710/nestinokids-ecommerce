"""G4.2 - GST order-engine integration tests.

Verifies that GST stays inert until fully configured and that, once the store
enables it, embedded tax is computed, snapshotted onto orders/order items and
excluded from loyalty earning — without breaking the G4.1 tax-exempt path.
"""
import itertools
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models.models import (
    Address,
    Category,
    Coupon,
    Inventory,
    LoyaltyTransaction,
    LoyaltyTransactionTypeEnum,
    Order,
    OrderItem,
    OrderStatusEnum,
    Product,
    Promotion,
    PromotionRule,
    PromotionRuleTypeEnum,
    PromotionTypeEnum,
    RoleEnum,
    StoreSetting,
    User,
)
from app.services.gst_service import (
    SHIPPING_GST_RATE_MISSING,
    TAX_CONFIG_ERROR,
    TAX_TYPE_INTER_STATE,
    TAX_TYPE_INTRA_STATE,
    money,
)
from app.services.order_calculation_service import calculate_order


FREE_SHIPPING_THRESHOLD = 500.0
FLAT_SHIPPING_RATE = 50.0


@pytest.fixture(autouse=True)
def stable_shipping_config(monkeypatch):
    monkeypatch.setattr(app_settings, "FREE_SHIPPING_THRESHOLD", FREE_SHIPPING_THRESHOLD)
    monkeypatch.setattr(app_settings, "FLAT_SHIPPING_RATE", FLAT_SHIPPING_RATE)


# ─── helpers ──────────────────────────────────────────────────────────────────

_seq = itertools.count(1)


def _create_user(db, email):
    user = User(
        email=email,
        first_name="Gst",
        last_name="Tester",
        phone=f"99999999{next(_seq) % 100:02d}",
        hashed_password=hash_password("TestPass123"),
        role=RoleEnum.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _store(db, **kwargs):
    values = {
        "store_name": "NestinoKids",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
    }
    values.update(kwargs)
    store = StoreSetting(**values)
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


def _create_category(db):
    n = next(_seq)
    cat = Category(name=f"GstCat{n}", slug=f"gstcat-{n}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def _create_product(db, price=300.0, gst_rate=None, hsn_code=None):
    n = next(_seq)
    cat = _create_category(db)
    product = Product(
        category_id=cat.id,
        name=f"GstProd{n}",
        slug=f"gstprod-{n}",
        description="",
        price=price,
        sku=f"GST-{n}",
        quantity=100,
        gst_rate=gst_rate,
        hsn_code=hsn_code,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    inv = Inventory(
        product_id=product.id,
        total_quantity=50,
        available_quantity=50,
        reserved_quantity=0,
        low_stock_threshold=5,
    )
    db.add(inv)
    db.commit()
    return product


def _coupon(db, code, discount_value=50.0):
    now = datetime.now(timezone.utc)
    coupon = Coupon(
        code=code,
        name=code,
        discount_type="fixed",
        discount_value=discount_value,
        minimum_order_value=0.0,
        applicable_scope="GLOBAL",
        priority=1,
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=30),
        is_active=True,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


def _cart_item(product, qty=1):
    return {
        "product_id": product.id,
        "category_id": product.category_id,
        "quantity": qty,
        "price": product.price,
        "total": round(product.price * qty, 2),
    }


# ─── master switch & config validation ────────────────────────────────────────


def test_gst_inert_without_store_row(db):
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    result = calculate_order(db, [_cart_item(product)])
    assert result.tax == 0.0
    assert result.taxable_amount == 0.0
    assert result.tax_type == "none"
    assert result.items == []
    assert result.grand_total == 300.0 + FLAT_SHIPPING_RATE
    assert result.shipping == FLAT_SHIPPING_RATE


def test_gst_inert_when_tax_disabled_in_store(db):
    _store(db, tax_enabled=False, seller_state="MAHARASHTRA", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    result = calculate_order(db, [_cart_item(product)])
    assert result.tax == 0.0
    assert result.tax_type == "none"
    assert result.items == []


def test_missing_seller_state_degrades_to_warning_on_preview(db):
    _store(db, tax_enabled=True, seller_state="", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    result = calculate_order(db, [_cart_item(product)])
    assert result.tax == 0.0
    assert result.tax_type == "none"
    assert result.items == []
    assert any(n.type == "warning" for n in result.notifications)


def test_missing_seller_state_raises_400_on_finalization(db):
    _store(db, tax_enabled=True, seller_state="", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    with pytest.raises(HTTPException) as exc_info:
        calculate_order(db, [_cart_item(product)], enforce_tax_config=True)
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "TAX_CONFIG_ERROR"


def test_missing_product_rate_degrades_on_preview_and_raises_on_finalization(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0)  # no gst fields anywhere
    result = calculate_order(db, [_cart_item(product)])
    assert result.tax == 0.0
    assert result.tax_type == "none"
    with pytest.raises(HTTPException) as exc_info:
        calculate_order(db, [_cart_item(product)], enforce_tax_config=True)
    assert exc_info.value.detail["code"] == "TAX_CONFIG_ERROR"


def test_missing_shipping_gst_rate_blocks_finalization_not_preview(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=None)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    preview = calculate_order(db, [_cart_item(product)])
    assert preview.shipping > 0
    assert preview.shipping_tax == 0.0
    assert preview.tax_type == "none"
    assert any(n.type == "warning" for n in preview.notifications)
    with pytest.raises(HTTPException) as exc_info:
        calculate_order(db, [_cart_item(product)], enforce_tax_config=True)
    assert exc_info.value.status_code == 400
    # G4.2 correction: the specific code survives to the boundary instead of
    # being flattened into the generic TAX_CONFIG_ERROR.
    assert exc_info.value.detail["code"] == SHIPPING_GST_RATE_MISSING
    assert "Shipping GST rate" in exc_info.value.detail["message"]


def test_missing_seller_state_still_reports_generic_code(db):
    """A non-specific configuration fault keeps the generic code."""
    _store(db, tax_enabled=True, seller_state=None, shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    with pytest.raises(HTTPException) as exc_info:
        calculate_order(db, [_cart_item(product)], enforce_tax_config=True)
    assert exc_info.value.detail["code"] == TAX_CONFIG_ERROR


def test_missing_product_gst_rate_reports_generic_code(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=None, hsn_code=None)
    with pytest.raises(HTTPException) as exc_info:
        calculate_order(db, [_cart_item(product)], enforce_tax_config=True)
    assert exc_info.value.detail["code"] == TAX_CONFIG_ERROR


def test_shipping_gst_rate_missing_reaches_checkout_api(client, db, monkeypatch):
    """End-to-end: the exact code is visible in the HTTP 400 response body."""
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    from app.services.settings_service import get_settings

    store = get_settings(db)
    store.direct_checkout_enabled = True
    store.tax_enabled = True
    store.seller_state = "DELHI"
    store.shipping_gst_rate = None      # the audited failure condition
    db.commit()

    _, token, address_id = _setup_buyer(
        client, db, f"gst-shipmissing-{uuid4().hex[:8]}@example.com", "7777777715"
    )
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    assert client.post(
        f"/api/v1/cart/{product.id}?quantity=1",
        headers={"Authorization": f"Bearer {token}"},
    ).status_code == 200

    before_orders = db.query(Order).count()
    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid4())},
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code == 400
    body = resp.json()
    assert body["detail"]["code"] == SHIPPING_GST_RATE_MISSING
    assert "Shipping GST rate" in body["detail"]["message"]
    # No partial order / item / inventory mutation from the rejected checkout.
    assert db.query(Order).count() == before_orders
    assert db.query(OrderItem).count() == 0


# ─── intra-state & inter-state calculation ────────────────────────────────────


def test_intra_state_full_order(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    result = calculate_order(db, [_cart_item(product)], customer_state="Maharashtra")

    assert result.tax_type == TAX_TYPE_INTRA_STATE
    assert result.seller_state == "MAHARASHTRA"
    assert result.place_of_supply == "Maharashtra"
    assert result.tax == pytest.approx(53.39, abs=0.005)
    assert result.taxable_amount == pytest.approx(296.61, abs=0.005)
    assert result.cgst_amount == pytest.approx(26.70, abs=0.005)
    assert result.sgst_amount == pytest.approx(26.69, abs=0.005)
    assert result.igst_amount == 0.0
    assert result.shipping == FLAT_SHIPPING_RATE
    assert result.shipping_taxable == pytest.approx(42.37, abs=0.005)
    assert result.shipping_tax == pytest.approx(7.63, abs=0.005)
    assert result.grand_total == 350.0  # inclusive: taxable(300) + shipping(50)

    line = result.items[0]
    assert line.product_id == product.id
    assert line.hsn_code == "6209"
    assert line.tax_rate == 18.0
    assert line.line_total == 300.0
    assert line.discount_allocated == 0.0
    assert line.taxable_value == pytest.approx(254.24, abs=0.005)
    assert line.cgst_amount == pytest.approx(22.88, abs=0.005)
    assert line.sgst_amount == pytest.approx(22.88, abs=0.005)
    assert line.igst_amount == 0.0


def test_inter_state_reports_all_igst(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    result = calculate_order(db, [_cart_item(product)], customer_state="Karnataka")

    assert result.tax_type == TAX_TYPE_INTER_STATE
    assert result.cgst_amount == 0.0
    assert result.sgst_amount == 0.0
    assert result.igst_amount == pytest.approx(53.39, abs=0.005)
    assert result.tax == pytest.approx(53.39, abs=0.005)


def test_category_fallback_when_product_has_no_rate(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=18.0)
    n = next(_seq)
    cat = Category(
        name=f"GstFallback{n}",
        slug=f"gstfallback-{n}",
        description="",
        gst_rate=12.0,
        hsn_code="6111",
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    product = Product(
        category_id=cat.id,
        name=f"GstNoRate{n}",
        slug=f"gstnorate-{n}",
        description="",
        price=300.0,
        sku=f"GSTFR-{n}",
        quantity=100,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    result = calculate_order(db, [_cart_item(product)], customer_state="Maharashtra")
    line = result.items[0]
    assert line.tax_rate == 12.0
    assert line.hsn_code == "6111"
    # 300 @ 12% inclusive -> taxable 267.86, embedded 32.14
    assert line.taxable_value == pytest.approx(267.86, abs=0.005)
    assert line.cgst_amount == pytest.approx(16.07, abs=0.005)
    assert line.sgst_amount == pytest.approx(16.07, abs=0.005)


def test_shipping_rate_zero_is_valid_configuration(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=0.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    result = calculate_order(db, [_cart_item(product)], customer_state="Maharashtra")
    assert result.tax_type == TAX_TYPE_INTRA_STATE
    assert result.shipping_tax == 0.0
    assert result.shipping_taxable == FLAT_SHIPPING_RATE
    # Goods-only embedded tax: 45.76; shipping carries none.
    assert result.tax == pytest.approx(45.76, abs=0.005)
    assert result.taxable_amount == pytest.approx(304.24, abs=0.005)


def test_discount_allocated_before_tax_extraction(db):
    _store(db, tax_enabled=True, seller_state="MAHARASHTRA", shipping_gst_rate=18.0)
    coupon = _coupon(db, f"GSTR5-{next(_seq)}", discount_value=50.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")

    result = calculate_order(
        db, [_cart_item(product)], coupon_code=coupon.code, customer_state="Maharashtra"
    )
    assert result.coupon_discount == 50.0
    line = result.items[0]
    assert line.discount_allocated == 50.0
    assert line.taxable_value == pytest.approx(211.86, abs=0.005)  # 250 / 1.18
    assert line.cgst_amount == pytest.approx(19.07, abs=0.005)
    assert line.sgst_amount == pytest.approx(19.07, abs=0.005)
    assert result.grand_total == 300.0  # (300 - 50) + 50 shipping


# ─── loyalty earning ──────────────────────────────────────────────────────────


def _place_real_order(client, db, *, product, email, phone, address_state="Delhi",
                     seller_state="DELHI", shipping_gst_rate=18.0):
    """Place a real order through the HTTP checkout with GST enabled.

    Returns the persisted ``Order`` row. Every amount on it (final_amount,
    shipping_amount, tax_amount, taxable_amount) and every OrderItem
    ``taxable_value`` is produced by the real calculation engine - nothing is
    fabricated, so loyalty assertions exercise production data flow.
    """
    from app.services.settings_service import get_settings

    # Capture the id up front: the shared test session is closed by the first
    # HTTP request (conftest override), detaching ORM instances.
    product_id = product.id

    store = get_settings(db)
    store.direct_checkout_enabled = True
    store.tax_enabled = True
    store.seller_state = seller_state
    store.shipping_gst_rate = shipping_gst_rate
    db.commit()

    user, token, address_id = _setup_buyer(client, db, email, phone, state=address_state)
    resp = client.post(
        f"/api/v1/cart/{product_id}?quantity=1",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid4())},
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code in (200, 201), resp.text
    order = db.query(Order).filter(Order.user_id == user.id).first()
    assert order is not None
    db.refresh(order)
    return order


def _award_and_fetch_tx(db, order):
    from app.api.v1.endpoints.engagement import award_loyalty_points_for_order

    order.status = OrderStatusEnum.DELIVERED
    db.commit()
    award_loyalty_points_for_order(order.id, db)
    db.commit()
    return (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == order.id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .first()
    )


def test_loyalty_earning_base_uses_engine_output_not_final_amount(client, db, monkeypatch):
    """G4.2 correction: earning base = pre-tax merchandise, shipping GST excluded.

    Regression for the audited defect where the base was
    ``final_amount - shipping_amount - tax_amount``. Because ``tax_amount``
    bundles product GST *and* shipping GST, that formula removed shipping GST
    from a base that never contained it, under-earning by exactly
    ``shipping_tax``.

    Scenario pins the audited case: shipping > 0, shipping_gst_rate > 0, tax
    enabled, intra-state. All values come from a real checkout.
    """
    _enable_gst_checkout(db, monkeypatch)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    order = _place_real_order(
        client, db, product=product,
        email=f"loy-real-{uuid4().hex[:8]}@example.com", phone="7777777711",
    )

    # Sanity: the engine really did charge shipping and really did tax it.
    assert order.shipping_amount == FLAT_SHIPPING_RATE
    item_row = db.query(OrderItem).filter(OrderItem.order_id == order.id).first()
    assert item_row.taxable_value == pytest.approx(254.24, abs=0.005)
    assert order.tax_amount == pytest.approx(53.39, abs=0.005)   # 45.76 line + 7.63 shipping
    assert order.final_amount == 350.0

    tx = _award_and_fetch_tx(db, order)
    assert tx is not None

    # Correct base: engine merchandise taxable value only.
    # 300 inclusive / 1.18 = 254.24. Shipping (50) and its GST (7.63) excluded.
    assert tx.points == int(254.24 * app_settings.POINTS_PER_CURRENCY)

    # The audited (wrong) formula would have produced a smaller base:
    #   350.00 - 50.00 - 53.39 = 246.61
    # i.e. short by exactly the 7.63 of shipping GST that never belonged in
    # the merchandise base in the first place.
    old_base = order.final_amount - order.shipping_amount - order.tax_amount
    assert old_base == pytest.approx(246.61, abs=0.005)
    assert (254.24 - old_base) == pytest.approx(7.63, abs=0.005)  # == shipping_tax
    assert int(old_base * app_settings.POINTS_PER_CURRENCY) != tx.points

    # EARN stays exactly-once.
    from app.api.v1.endpoints.engagement import award_loyalty_points_for_order

    award_loyalty_points_for_order(order.id, db)
    db.commit()
    assert (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == order.id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .count()
        == 1
    )


def test_loyalty_earning_base_inter_state_excludes_shipping_gst(client, db, monkeypatch):
    """Same defect, INTER_STATE branch: IGST on items + IGST on shipping."""
    _enable_gst_checkout(db, monkeypatch)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    order = _place_real_order(
        client, db, product=product,
        email=f"loy-inter-{uuid4().hex[:8]}@example.com", phone="7777777712",
        address_state="Karnataka",
    )
    assert order.tax_type == TAX_TYPE_INTER_STATE
    assert order.igst_amount == pytest.approx(53.39, abs=0.005)
    assert order.cgst_amount == 0.0 and order.sgst_amount == 0.0

    tx = _award_and_fetch_tx(db, order)
    assert tx.points == int(254.24 * app_settings.POINTS_PER_CURRENCY)
    old_base = order.final_amount - order.shipping_amount - order.tax_amount
    assert int(old_base * app_settings.POINTS_PER_CURRENCY) != tx.points


def test_loyalty_earning_base_free_shipping_has_no_shipping_gst(client, db, monkeypatch):
    """Free shipping: no shipping consideration, so nothing extra to exclude."""
    _enable_gst_checkout(db, monkeypatch)
    product = _create_product(db, price=600.0, gst_rate=18.0, hsn_code="6209")
    order = _place_real_order(
        client, db, product=product,
        email=f"loy-free-{uuid4().hex[:8]}@example.com", phone="7777777713",
    )
    assert order.shipping_amount == 0.0
    assert order.tax_amount == pytest.approx(91.53, abs=0.005)   # 600/1.18 -> 508.47

    tx = _award_and_fetch_tx(db, order)
    # 600 inclusive / 1.18 = 508.47
    assert tx.points == int(508.47 * app_settings.POINTS_PER_CURRENCY)


def test_loyalty_earning_base_tax_exempt_keeps_g41_final_amount(client, db, monkeypatch):
    """Tax-exempt orders must keep the pre-G4.2 (G4.1) ``final_amount`` base.

    G4.2 fixes the GST path only. Enabling GST must not silently change loyalty
    behaviour for stores that never enabled it, so the tax-exempt branch stays
    on ``final_amount`` exactly as audited. Changing this to a merchandise-only
    base would be a separate, unrequested G4.1 behaviour change.
    """
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    from app.services.settings_service import get_settings

    store = get_settings(db)
    store.direct_checkout_enabled = True
    store.tax_enabled = False
    db.commit()

    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    product_id = product.id
    user, token, address_id = _setup_buyer(
        client, db, f"loy-exempt-{uuid4().hex[:8]}@example.com", "7777777714"
    )
    user_id = user.id
    assert client.post(
        f"/api/v1/cart/{product_id}?quantity=1",
        headers={"Authorization": f"Bearer {token}"},
    ).status_code == 200
    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid4())},
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code in (200, 201), resp.text
    order = db.query(Order).filter(Order.user_id == user_id).first()
    db.refresh(order)

    assert order.tax_type == "none"
    assert order.tax_amount == 0.0
    assert order.shipping_amount == FLAT_SHIPPING_RATE
    assert order.final_amount == 350.0

    tx = _award_and_fetch_tx(db, order)
    # Unchanged G4.1 contract: earn on final_amount.
    assert tx.points == int(350.0 * app_settings.POINTS_PER_CURRENCY)


# ─── end-to-end checkout snapshot persistence ─────────────────────────────────


def _enable_gst_checkout(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    from app.services.settings_service import get_settings

    store = get_settings(db)
    store.direct_checkout_enabled = True
    store.tax_enabled = True
    store.seller_state = "DELHI"
    store.shipping_gst_rate = 18.0
    db.commit()


def _login_token(client, email):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "TestPass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _setup_buyer(client, db, email, phone, state="Delhi"):
    user = User(
        email=email,
        first_name="Gst",
        last_name="Buyer",
        phone=phone,
        hashed_password=hash_password("TestPass123"),
        role=RoleEnum.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = _login_token(client, email)
    resp = client.post(
        "/api/v1/addresses",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "Gst",
            "last_name": "Buyer",
            "phone": phone,
            "email": email,
            "address_line_1": "9 Tax Lane",
            "city": "New Delhi",
            "state": state,
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    return user, token, resp.json()["id"]


def test_checkout_persists_tax_snapshots(client, db, monkeypatch):
    _enable_gst_checkout(db, monkeypatch)
    user, token, address_id = _setup_buyer(
        client, db, f"gst-checkout-{uuid4().hex[:8]}@example.com", "7777777701"
    )
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    pid = product.id
    product_name = product.name
    product_sku = product.sku
    resp = client.post(f"/api/v1/cart/{pid}?quantity=1", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200, resp.text

    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid4())},
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()

    assert order["tax_type"] == TAX_TYPE_INTRA_STATE
    assert order["seller_state"] == "DELHI"
    assert order["place_of_supply"] == "Delhi"
    assert order["total_amount"] == 300.0
    assert order["shipping_amount"] == FLAT_SHIPPING_RATE
    assert order["final_amount"] == 350.0
    assert order["tax_amount"] == pytest.approx(53.39, abs=0.005)
    assert order["cgst_amount"] == pytest.approx(26.70, abs=0.005)
    assert order["sgst_amount"] == pytest.approx(26.69, abs=0.005)
    assert order["igst_amount"] == 0.0

    item = order["items"][0]
    assert item["product_id"] == pid
    assert item["hsn_code"] == "6209"
    assert item["tax_rate"] == 18.0
    assert item["taxable_value"] == pytest.approx(254.24, abs=0.005)
    assert item["cgst_amount"] == pytest.approx(22.88, abs=0.005)
    assert item["sgst_amount"] == pytest.approx(22.88, abs=0.005)
    assert item["igst_amount"] == 0.0

    row = db.query(Order).filter(Order.user_id == user.id).first()
    assert row.tax_type == TAX_TYPE_INTRA_STATE
    assert row.taxable_amount == pytest.approx(296.61, abs=0.005)
    assert row.tax_amount == pytest.approx(53.39, abs=0.005)

    item_row = db.query(OrderItem).filter(OrderItem.order_id == row.id).first()
    assert item_row.product_name == product_name
    assert item_row.sku == product_sku
    assert item_row.hsn_code == "6209"
    assert item_row.tax_rate == 18.0
    assert item_row.taxable_value == pytest.approx(254.24, abs=0.005)
    assert item_row.cgst_amount == pytest.approx(22.88, abs=0.005)
    assert item_row.sgst_amount == pytest.approx(22.88, abs=0.005)
    assert item_row.igst_amount == 0.0


def test_checkout_rejects_missing_tax_config(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    from app.services.settings_service import get_settings

    store = get_settings(db)
    store.direct_checkout_enabled = True
    store.tax_enabled = True          # seller_state deliberately missing
    db.commit()

    _, token, address_id = _setup_buyer(
        client, db, f"gst-400-{uuid4().hex[:8]}@example.com", "7777777702"
    )
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    resp = client.post(f"/api/v1/cart/{product.id}?quantity=1", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200, resp.text

    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid4())},
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == TAX_CONFIG_ERROR


# ─── promotion + coupon + loyalty reconciliation (G4.2 correction) ────────────


def _discount_promo(db, value):
    now = datetime.now(timezone.utc)
    promo = Promotion(
        name=f"GstPromo-{uuid4().hex[:6]}",
        description="",
        promotion_type=PromotionTypeEnum.FIXED_AMOUNT,
        discount_value=value,
        minimum_order_amount=0,
        priority=10,
        is_active=True,
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=7),
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    db.add(
        PromotionRule(
            promotion_id=promo.id,
            rule_type=PromotionRuleTypeEnum.MINIMUM_CART_VALUE,
            minimum_cart_amount=0.0,
            is_active=True,
        )
    )
    db.commit()
    return promo


def _fund_loyalty(db, user_id, points):
    from app.services.loyalty_service import loyalty_service

    account = loyalty_service._get_or_create_account(db, user_id)
    account.current_points += points
    account.lifetime_earned += points
    db.commit()
    return account


def test_promotion_coupon_loyalty_reconcile_exactly(db):
    """promotion + coupon + loyalty stacked: exact reconciliation, no double count.

    Semantics pinned by this test:

    * ``promotion_discount`` / ``coupon_discount`` / ``loyalty_discount`` are
      PRICE reductions and are all included in ``Order.discount_amount``.
    * ``gift_card_discount`` and ``wallet_discount`` are payment instruments,
      not price reductions. They are deliberately NOT part of
      ``Order.discount_amount`` (they are still placeholders at 0.0 today, so
      this is documentation of intent rather than a behavioural difference).
    * Tax is computed from the DISCOUNTED GST-INCLUSIVE consideration, so the
      discount reduces the tax base; it is never added back on top.
    """
    _store(db, tax_enabled=True, seller_state="DELHI", shipping_gst_rate=18.0)
    user = _create_user(db, f"disc-{uuid4().hex[:8]}@example.com")
    user_id = user.id
    _fund_loyalty(db, user_id, 500)

    product = _create_product(db, price=200.0, gst_rate=18.0, hsn_code="6209")
    product2 = _create_product(db, price=150.0, gst_rate=18.0, hsn_code="6209")
    _discount_promo(db, 40.0)
    coupon = _coupon(db, f"GSTC{uuid4().hex[:6].upper()}", discount_value=60.0)

    items = [_cart_item(product), _cart_item(product2)]
    result = calculate_order(
        db, items, coupon_code=coupon.code, user_id=user_id,
        loyalty_points_to_redeem=50, customer_state="Delhi",
    )

    # --- each engine applied exactly once ---
    assert result.promotion_discount == 40.0
    assert result.coupon_discount == 60.0
    assert result.loyalty_discount == 50.0     # 50 points x REDEMPTION_RATE 1.0
    assert result.loyalty_points_redeemed == 50

    total_discount = money(
        money(result.promotion_discount)
        + money(result.coupon_discount)
        + money(result.loyalty_discount)
        + money(result.gift_card_discount)
        + money(result.wallet_discount)
    )
    assert total_discount == money(150.0)

    # --- allocation reconciles to the paisa, no double counting ---
    allocated = money(sum(d.discount_allocated for d in result.items))
    assert allocated == total_discount
    # per-line allocation never exceeds its own line total
    for d in result.items:
        assert d.discount_allocated <= d.line_total
        assert d.line_total - d.discount_allocated >= 0

    # --- tax is computed on the DISCOUNTED inclusive consideration ---
    # subtotal 350 - 150 discount = 200 inclusive merchandise
    assert result.subtotal == 350.0
    discounted_inclusive = money(money(result.subtotal) - total_discount)
    assert discounted_inclusive == money(200.0)

    # Allocation is proportional across lines and the per-line discounted
    # inclusive values re-sum to the total discounted inclusive value.
    lines = [(d.line_total, d.discount_allocated) for d in result.items]
    assert money(sum(lt - al for lt, al in lines)) == discounted_inclusive
    assert money(sum(al for _, al in lines)) == total_discount

    # Each line's tax is derived from ITS OWN discounted inclusive value, so
    # it is rounded per line rather than on a single lump sum.
    for d in result.items:
        line_disc_inclusive = money(money(d.line_total) - money(d.discount_allocated))
        assert money(d.taxable_value) == money(
            line_disc_inclusive / Decimal("1.18")
        )
        # intra-state: the embedded tax is exactly the inclusive minus taxable
        assert money(d.cgst_amount + d.sgst_amount + d.igst_amount) == money(
            line_disc_inclusive - money(d.taxable_value)
        )

    # 96.86 + 72.64 = 169.50. Note this is intentionally NOT
    # money(200 / 1.18) = 169.49: per-line rounding is the correct contract,
    # because each line is a separate taxable event.
    merch_taxable = money(sum(d.taxable_value for d in result.items))
    assert merch_taxable == money(169.50)
    assert merch_taxable != money(discounted_inclusive / Decimal("1.18"))

    # shipping is NOT discounted by any of the three
    assert result.shipping == FLAT_SHIPPING_RATE
    assert money(result.shipping_tax) == money(7.63)

    # --- final amount reconciles: tax is embedded, never added on top ---
    assert money(result.grand_total) == money(discounted_inclusive + money(result.shipping))
    assert money(result.grand_total) == money(250.0)
    assert money(result.tax) == money(
        result.cgst_amount + result.sgst_amount + result.igst_amount
    )
    assert money(result.grand_total) == money(
        money(result.subtotal) - total_discount + money(result.shipping)
    )

    # --- the engine's explicit loyalty base agrees with the item snapshots ---
    assert money(result.loyalty_earning_base) == merch_taxable


def test_order_discount_amount_includes_all_three_discounts(client, db, monkeypatch):
    """Persisted ``Order.discount_amount`` carries promotion + coupon + loyalty."""
    _enable_gst_checkout(db, monkeypatch)
    _discount_promo(db, 40.0)
    coupon = _coupon(db, f"GSTD{uuid4().hex[:6].upper()}", discount_value=60.0)
    coupon_code = coupon.code   # capture before the first HTTP call detaches it

    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    pid = product.id
    # The checking-out account must be the one holding the loyalty points.
    buyer, token, address_id = _setup_buyer(
        client, db, f"disc-buy-{uuid4().hex[:8]}@example.com", "7777777716"
    )
    user_id = buyer.id
    _fund_loyalty(db, user_id, 500)

    assert client.post(
        f"/api/v1/cart/{pid}?quantity=1", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200

    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid4())},
        json={"shipping_address_id": address_id, "coupon_code": coupon_code,
              "loyalty_points_to_redeem": 50},
    )
    assert resp.status_code in (200, 201), resp.text

    order = db.query(Order).filter(Order.user_id == user_id).first()
    assert order is not None
    db.refresh(order)
    # promotion 40 + coupon 60 + loyalty 50
    assert order.discount_amount == pytest.approx(150.0, abs=0.005)
    # grand total = 300 - 150 + 50 shipping, GST embedded
    assert order.total_amount == 300.0
    assert order.shipping_amount == FLAT_SHIPPING_RATE
    assert order.final_amount == pytest.approx(200.0, abs=0.005)


# ─── snapshot immutability (G4.2 correction) ─────────────────────────────────


def test_tax_snapshot_immutable_after_product_gst_config_change(client, db, monkeypatch):
    """Order/item tax snapshots must not follow later product config edits.

    Steps: create product at GST rate A / HSN A -> check out -> verify snapshot
    is A -> change the product to rate B / HSN B -> reload the SAME order and
    assert the stored snapshots are still A, and the order-level tax snapshot
    is unchanged.
    """
    _enable_gst_checkout(db, monkeypatch)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    pid = product.id
    _, token, address_id = _setup_buyer(
        client, db, f"snap-{uuid4().hex[:8]}@example.com", "7777777717"
    )
    assert client.post(
        f"/api/v1/cart/{pid}?quantity=1", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200

    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": str(uuid4())},
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code in (200, 201), resp.text

    order = db.query(Order).filter(Order.user_id == order_user_id(db, token)).first()
    order_id = order.id

    # --- 3. snapshot contains A ---
    item_before = db.query(OrderItem).filter(OrderItem.order_id == order_id).first()
    assert item_before.hsn_code == "6209"
    assert item_before.tax_rate == 18.0
    assert item_before.taxable_value == pytest.approx(254.24, abs=0.005)
    assert item_before.cgst_amount == pytest.approx(22.88, abs=0.005)
    order_before = {
        "taxable_amount": order.taxable_amount,
        "cgst_amount": order.cgst_amount,
        "sgst_amount": order.sgst_amount,
        "igst_amount": order.igst_amount,
        "tax_amount": order.tax_amount,
        "tax_type": order.tax_type,
        "place_of_supply": order.place_of_supply,
        "seller_state": order.seller_state,
        "final_amount": order.final_amount,
    }
    assert order.tax_type == TAX_TYPE_INTRA_STATE

    # --- 4. change product config to B ---
    db.expire_all()
    p = db.query(Product).filter(Product.id == pid).first()
    p.gst_rate = 28.0
    p.hsn_code = "9999"
    p.name = "Renamed After Order"
    db.commit()

    # --- 5/6. reload the SAME order: snapshots must still be A ---
    db.expire_all()
    reloaded_order = db.query(Order).filter(Order.id == order_id).first()
    reloaded_item = db.query(OrderItem).filter(OrderItem.order_id == order_id).first()

    assert reloaded_item.hsn_code == "6209", "HSN snapshot must not follow product"
    assert reloaded_item.tax_rate == 18.0, "tax rate snapshot must not follow product"
    assert reloaded_item.taxable_value == pytest.approx(254.24, abs=0.005)
    assert reloaded_item.cgst_amount == pytest.approx(22.88, abs=0.005)
    assert reloaded_item.sgst_amount == pytest.approx(22.88, abs=0.005)
    assert reloaded_item.igst_amount == 0.0
    # product_name / sku snapshots are immutable too
    assert reloaded_item.product_name == item_before.product_name
    assert reloaded_item.sku == item_before.sku

    # --- 7. order-level tax snapshot unchanged ---
    for field, expected in order_before.items():
        actual = getattr(reloaded_order, field)
        if isinstance(expected, float):
            assert actual == pytest.approx(expected, abs=0.005), field
        else:
            assert actual == expected, field

    # The live product really did change - proving the assertion above is meaningful.
    db.expire_all()
    live = db.query(Product).filter(Product.id == pid).first()
    assert live.gst_rate == 28.0 and live.hsn_code == "9999"


def order_user_id(db, token):
    from app.core.security import decode_token

    payload = decode_token(token)
    return int(payload["user_id"]) if "user_id" in payload else int(payload["sub"])


# ─── cart preview place-of-supply (G4.2 correction) ──────────────────────────


def _cart_totals(client, token, **body):
    resp = client.post(
        "/api/v1/cart/calculate-totals",
        headers={"Authorization": f"Bearer {token}"},
        json=body,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_cart_preview_uses_customer_state_for_igst(client, db):
    """A Maharashtra customer previewing a Delhi-seller store must get IGST.

    Before the correction the cart endpoint never passed a place of supply, so
    every preview silently fell back to the seller's own state and returned
    INTRA_STATE + CGST/SGST even though checkout would charge IGST.
    """
    _store(db, tax_enabled=True, seller_state="DELHI", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    pid = product.id
    _, token, _ = _setup_buyer(
        client, db, f"cart-igst-{uuid4().hex[:8]}@example.com", "7777777718",
        state="Maharashtra",
    )
    assert client.post(
        f"/api/v1/cart/{pid}?quantity=1", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200

    body = _cart_totals(client, token)
    assert body["tax_type"] == TAX_TYPE_INTER_STATE
    assert body["igst_amount"] > 0.0
    assert body["cgst_amount"] == 0.0
    assert body["sgst_amount"] == 0.0
    # The tax AMOUNT is unaffected by the label; only the split changes.
    assert body["tax"] == pytest.approx(53.39, abs=0.005)   # 45.76 line + 7.63 shipping


def test_cart_preview_intra_state_when_customer_matches_seller(client, db):
    _store(db, tax_enabled=True, seller_state="DELHI", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    pid = product.id
    _, token, _ = _setup_buyer(
        client, db, f"cart-cgst-{uuid4().hex[:8]}@example.com", "7777777719",
        state="Delhi",
    )
    assert client.post(
        f"/api/v1/cart/{pid}?quantity=1", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200

    body = _cart_totals(client, token)
    assert body["tax_type"] == TAX_TYPE_INTRA_STATE
    assert body["igst_amount"] == 0.0
    assert body["cgst_amount"] > 0.0
    assert body["sgst_amount"] > 0.0
    # Intra-state tax is split evenly in principle, but each half is rounded
    # independently with CGST taking the half-paisa residual, so the two may
    # legitimately differ by 0.01. What must hold is that they re-sum to the
    # line + shipping tax exactly.
    assert body["cgst_amount"] - body["sgst_amount"] == pytest.approx(0.0, abs=0.01)
    assert round(body["cgst_amount"] + body["sgst_amount"], 2) == pytest.approx(
        body["tax"], abs=0.005
    )
    assert body["tax"] == pytest.approx(53.39, abs=0.005)


def test_cart_preview_prefers_default_address_state(client, db):
    """When a user has several addresses, the default one decides IGST vs CGST."""
    from app.core.security import create_access_token

    _store(db, tax_enabled=True, seller_state="DELHI", shipping_gst_rate=18.0)
    product = _create_product(db, price=300.0, gst_rate=18.0, hsn_code="6209")
    pid = product.id

    user = _create_user(db, f"cart-multi-{uuid4().hex[:8]}@example.com")
    uid = user.id
    # Most recent is Delhi, but the DEFAULT is explicitly Maharashtra.
    for state, city, zipcode, is_default in (
        ("Delhi", "New Delhi", "110001", False),
        ("Maharashtra", "Mumbai", "400001", True),
    ):
        db.add(
            Address(
                user_id=uid, first_name="A", last_name="B", phone="7777777720",
                email=f"cart-multi-{uid}@example.com", address_line_1="L1",
                city=city, state=state, postal_code=zipcode, country="India",
                is_default=is_default,
            )
        )
    db.commit()
    token = create_access_token({"sub": str(uid)})
    assert client.post(
        f"/api/v1/cart/{pid}?quantity=1", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200

    body = _cart_totals(client, token)
    assert body["tax_type"] == TAX_TYPE_INTER_STATE, "default (Maharashtra) must win"
    assert body["igst_amount"] > 0.0


# ─── rounding boundary (G4.2 correction) ─────────────────────────────────────


def test_engine_tax_uses_half_up_not_bankers_rounding(db):
    """Half-paisa CGST must round UP (ROUND_HALF_UP), not to even.

    A 0.17 inclusive line at 18% yields 0.03 embedded tax, split 0.015/0.015.
    ROUND_HALF_UP sends the CGST half to 0.02 (SGST takes the residual 0.01);
    Python's banker's rounding on the float 0.015 would produce 0.01/0.02.
    """
    _store(db, tax_enabled=True, seller_state="DELHI", shipping_gst_rate=18.0)
    product = _create_product(db, price=0.17, gst_rate=18.0, hsn_code="6209")
    result = calculate_order(db, [_cart_item(product)], customer_state="Delhi")

    line = result.items[0]
    assert money(line.taxable_value) == money(0.14)
    assert money(line.cgst_amount) == money(0.02)   # HALF_UP; banker's would be 0.01
    assert money(line.sgst_amount) == money(0.01)   # residual, so the split still sums
    assert money(line.cgst_amount + line.sgst_amount) == money(0.03)

    # The engine total is line tax + shipping tax, recomputed in Decimal.
    expected = money(
        sum(
            (
                money(line.cgst_amount) + money(line.sgst_amount) + money(line.igst_amount)
                for line in result.items
            ),
            Decimal("0"),
        )
    ) + money(result.shipping_tax)
    assert money(result.tax) == expected
    # Sanity: shipping really is taxed, so the 0.03 is not the whole story.
    assert money(result.shipping_tax) == money(7.63)

    # Explicitly pin that the banker's-rounding alternative is different.
    assert round(0.015, 2) == 0.01
    assert money(Decimal("0.015")) == Decimal("0.02")


def test_engine_totals_are_decimal_exact_for_odd_paisa(db):
    """Multi-line odd-paisa totals stay Decimal-exact through the engine."""
    _store(db, tax_enabled=True, seller_state="DELHI", shipping_gst_rate=18.0)
    products = [
        _create_product(db, price=price, gst_rate=18.0, hsn_code="6209")
        for price in (0.17, 0.34, 0.51)
    ]
    result = calculate_order(
        db, [_cart_item(p) for p in products], customer_state="Delhi"
    )

    expected_merch = money(
        sum(
            (money(money(p.price) - money(0)) for p in products),
            Decimal("0"),
        )
    )
    # Discounted inclusive merchandise equals the sum of the line prices.
    assert money(sum(d.line_total for d in result.items)) == expected_merch
    # Tax total == sum of parts, computed in Decimal.
    parts = money(
        sum(
            (
                money(d.cgst_amount) + money(d.sgst_amount) + money(d.igst_amount)
                for d in result.items
            ),
            Decimal("0"),
        )
    )
    parts += money(result.shipping_tax)
    assert money(result.tax) == parts
