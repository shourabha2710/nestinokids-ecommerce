"""G4.2 - GST order-engine integration tests.

Verifies that GST stays inert until fully configured and that, once the store
enables it, embedded tax is computed, snapshotted onto orders/order items and
excluded from loyalty earning — without breaking the G4.1 tax-exempt path.
"""
import itertools
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models.models import (
    Category,
    Coupon,
    Inventory,
    LoyaltyTransaction,
    LoyaltyTransactionTypeEnum,
    Order,
    OrderItem,
    OrderStatusEnum,
    Product,
    RoleEnum,
    StoreSetting,
    User,
)
from app.services.gst_service import TAX_TYPE_INTER_STATE, TAX_TYPE_INTRA_STATE
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
    assert exc_info.value.detail["code"] == "TAX_CONFIG_ERROR"


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


def test_loyalty_earning_excludes_gst_and_shipping(db):
    user = _create_user(db, f"loy-gst-{uuid4().hex[:8]}@example.com")
    taxed = Order(
        user_id=user.id,
        order_number=f"ORD-GST-{uuid4().hex[:10].upper()}",
        total_amount=300.0,
        final_amount=350.0,
        shipping_amount=FLAT_SHIPPING_RATE,
        tax_amount=53.39,
        tax_type=TAX_TYPE_INTRA_STATE,
        status=OrderStatusEnum.DELIVERED,
    )
    db.add(taxed)
    db.commit()
    db.refresh(taxed)

    from app.api.v1.endpoints.engagement import award_loyalty_points_for_order

    award_loyalty_points_for_order(taxed.id, db)
    db.commit()

    tx = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == taxed.id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .first()
    )
    assert tx is not None
    # base = 350 - 50 - 53.39 = 246.61 -> int(246.61 * 0.1) = 24
    assert tx.points == 24
    assert tx.balance_after == 24
    # idempotent: second call awards nothing extra
    award_loyalty_points_for_order(taxed.id, db)
    db.commit()
    assert (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == taxed.id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .count()
        == 1
    )


def test_loyalty_earning_legacy_base_when_tax_exempt(db):
    user = _create_user(db, f"loy-legacy-{uuid4().hex[:8]}@example.com")
    legacy = Order(
        user_id=user.id,
        order_number=f"ORD-LEG-{uuid4().hex[:10].upper()}",
        total_amount=300.0,
        final_amount=350.0,
        shipping_amount=FLAT_SHIPPING_RATE,
        tax_amount=0.0,
        status=OrderStatusEnum.DELIVERED,
    )
    db.add(legacy)
    db.commit()
    db.refresh(legacy)

    from app.api.v1.endpoints.engagement import award_loyalty_points_for_order

    award_loyalty_points_for_order(legacy.id, db)
    db.commit()

    tx = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == legacy.id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .first()
    )
    assert tx is not None
    assert tx.points == 35  # int(350 * 0.1): G4.1 behaviour unchanged


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


def _setup_buyer(client, db, email, phone):
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
            "state": "Delhi",
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
    assert resp.json()["detail"]["code"] == "TAX_CONFIG_ERROR"