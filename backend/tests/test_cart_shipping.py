"""Phase 24.5 - Cart shipping calculation + free-shipping threshold tests.

Authoritative engine: app/services/order_calculation_service.py::calculate_order
Rules under test (as implemented, pre-existing business conventions preserved):
  - shipping = 0.0 if PRE-DISCOUNT rounded subtotal >= FREE_SHIPPING_THRESHOLD
               else FLAT_SHIPPING_RATE
  - Promotion FREE_SHIPPING rule forces shipping to 0.0
  - Coupons / loyalty / wallet discounts never change the shipping decision
  - Empty cart charges no shipping
  - All money values are floats rounded to 2 decimals
"""
import itertools
from datetime import datetime, timedelta

import pytest

from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models.models import (
    Category,
    Coupon,
    Inventory,
    LoyaltyAccount,
    Product,
    Promotion,
    PromotionRule,
    PromotionRuleTypeEnum,
    PromotionTypeEnum,
    RoleEnum,
    User,
)
from app.services.order_calculation_service import calculate_order
from app.services.settings_service import get_settings


FREE_SHIPPING_THRESHOLD = 500.0
FLAT_SHIPPING_RATE = 50.0


@pytest.fixture(autouse=True)
def stable_shipping_config(monkeypatch):
    """Pin shipping config so boundary tests are exact regardless of env."""
    monkeypatch.setattr(app_settings, "FREE_SHIPPING_THRESHOLD", FREE_SHIPPING_THRESHOLD)
    monkeypatch.setattr(app_settings, "FLAT_SHIPPING_RATE", FLAT_SHIPPING_RATE)


# ─── helpers ──────────────────────────────────────────────────────────────────

_seq = itertools.count(1)


def _item(price, quantity=1, product_id=1, category_id=None):
    return {
        "product_id": product_id,
        "category_id": category_id,
        "quantity": quantity,
        "price": price,
        "total": round(price * quantity, 2),
    }


def _create_user(db, email, phone="9999999901"):
    user = User(
        email=email,
        first_name="Ship",
        last_name="Tester",
        phone=phone,
        hashed_password=hash_password("TestPass123"),
        role=RoleEnum.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login_token(client, email):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "TestPass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_product(db, price, name=None):
    n = next(_seq)
    name = name or f"ShipProd{n}"
    slug = f"{name.lower()}-{n}"
    cat = Category(name=f"Cat-{slug}", slug=f"cat-{slug}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    product = Product(
        category_id=cat.id,
        name=name,
        slug=slug,
        description="",
        price=price,
        sku=f"SHIP-{n}",
        quantity=100,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    db.add(
        Inventory(
            product_id=product.id,
            total_quantity=50,
            available_quantity=50,
            reserved_quantity=0,
            low_stock_threshold=5,
        )
    )
    db.commit()
    return product


def _setup_buyer(client, db, email, suffix=1):
    user = _create_user(db, email, phone=f"99999999{suffix:02d}")
    token = _login_token(client, email)
    resp = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Ship",
            "last_name": "Buyer",
            "phone": f"99999999{suffix:02d}",
            "email": email,
            "address_line_1": "1 Test Street",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    return user, token, resp.json()["id"]


def _add_to_cart(client, token, product_id, qty=1):
    resp = client.post(
        f"/api/v1/cart/{product_id}?quantity={qty}", headers=_auth(token)
    )
    assert resp.status_code == 200, resp.text


def _calculate_totals(client, token, body=None):
    resp = client.post(
        "/api/v1/cart/calculate-totals", headers=_auth(token), json=body or {}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _enable_direct_checkout(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()


def _create_coupon(db, code, value, discount_type="fixed"):
    now = datetime.utcnow()
    coupon = Coupon(
        code=code,
        name=code,
        description="phase 24.5 test coupon",
        discount_type=discount_type,
        discount_value=value,
        minimum_order_value=0,
        applicable_scope="GLOBAL",
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=7),
        is_active=True,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


def _create_free_shipping_promo(db, min_amount):
    now = datetime.utcnow()
    promo = Promotion(
        name=f"FreeShipPromo-{next(_seq)}",
        description="phase 24.5 free shipping promo",
        promotion_type=PromotionTypeEnum.FIXED_AMOUNT,
        discount_value=0,
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
            rule_type=PromotionRuleTypeEnum.FREE_SHIPPING,
            minimum_cart_amount=min_amount,
            is_active=True,
        )
    )
    db.commit()
    return promo


# ─── Service-level threshold boundary matrix ──────────────────────────────────


def test_case_a_empty_cart_charges_no_shipping(db):
    result = calculate_order(db, [])
    assert result.subtotal == 0.0
    assert result.shipping == 0.0
    assert result.tax == 0.0
    assert result.grand_total == 0.0


def test_case_b_below_threshold_charged_flat_rate(db):
    result = calculate_order(db, [_item(499.99)])
    assert result.subtotal == 499.99
    assert result.free_shipping is False
    assert result.shipping == FLAT_SHIPPING_RATE
    assert result.grand_total == 549.99


def test_case_c_exactly_at_threshold_is_free(db):
    result = calculate_order(db, [_item(500.00)])
    assert result.subtotal == 500.0
    assert result.shipping == 0.0
    assert result.grand_total == 500.0
    assert any(n.type == "shipping" for n in result.notifications)


def test_case_d_just_above_threshold_is_free(db):
    result = calculate_order(db, [_item(500.01)])
    assert result.shipping == 0.0
    assert result.grand_total == 500.01


def test_subtotal_is_rounded_before_threshold_comparison(db):
    """Documents the rounding convention: 249.999 * 2 -> 500.00 -> free."""
    result = calculate_order(db, [_item(249.999, quantity=2)])
    assert result.subtotal == 500.0
    assert result.shipping == 0.0


def test_case_h_quantities_crossing_threshold(db):
    price = 250.0
    one = calculate_order(db, [_item(price, quantity=1)])
    two = calculate_order(db, [_item(price, quantity=2)])
    three = calculate_order(db, [_item(price, quantity=3)])
    assert one.shipping == FLAT_SHIPPING_RATE  # 250 < 500
    assert two.shipping == 0.0                 # 500 == 500 (inclusive boundary)
    assert three.shipping == 0.0               # 750 > 500


def test_case_j_large_cart_value_rounding_stable(db):
    result = calculate_order(db, [_item(1234567.89)])
    assert result.shipping == 0.0
    assert result.grand_total == 1234567.89


def test_money_values_are_two_decimal_floats(db):
    result = calculate_order(db, [_item(19.99, quantity=3)])
    assert result.subtotal == 59.97
    assert result.shipping == FLAT_SHIPPING_RATE
    assert result.grand_total == 109.97


# ─── Coupons never change the shipping decision ───────────────────────────────


def test_case_e_discount_does_not_remove_free_shipping(db):
    _create_coupon(db, "SAVE200", 200, discount_type="fixed")
    result = calculate_order(db, [_item(600.00)], coupon_code="SAVE200")
    assert result.applied_coupon.code == "SAVE200"
    assert result.coupon_discount == 200.0
    # Decision basis is the PRE-DISCOUNT subtotal (600 >= 500): still free.
    assert result.shipping == 0.0
    assert result.grand_total == 400.0


def test_case_f_coupon_cannot_unlock_free_shipping(db):
    _create_coupon(db, "SAVE100", 100, discount_type="fixed")
    result = calculate_order(db, [_item(400.00)], coupon_code="SAVE100")
    assert result.coupon_discount == 100.0
    # Pre-discount subtotal (400) is below threshold regardless of coupon.
    assert result.shipping == FLAT_SHIPPING_RATE
    assert result.grand_total == 350.0


# ─── Promotion FREE_SHIPPING rule waives shipping below the threshold ─────────


def test_case_g_promotion_free_shipping_waives_shipping(db):
    _create_free_shipping_promo(db, min_amount=100)
    result = calculate_order(db, [_item(150.00)])  # 150 < 500 threshold
    assert result.free_shipping is True
    assert result.promotion_discount == 0.0
    assert result.shipping == 0.0
    assert result.grand_total == 150.0


def test_promotion_below_its_own_minimum_falls_back_to_flat_rate(db):
    _create_free_shipping_promo(db, min_amount=100)
    result = calculate_order(db, [_item(50.00)])
    assert result.free_shipping is False
    assert result.promotion_discount == 0.0
    assert result.shipping == FLAT_SHIPPING_RATE
    assert result.grand_total == 100.0


# ─── HTTP endpoint behaviour (/api/v1/cart/calculate-totals) ──────────────────


def test_calculate_totals_endpoint_empty_cart(client, db):
    _setup_buyer(client, db, "ship-empty@example.com")
    token = _login_token(client, "ship-empty@example.com")
    data = _calculate_totals(client, token)
    assert data["subtotal"] == 0.0
    assert data["shipping"] == 0.0
    assert data["grand_total"] == 0.0


def test_client_cannot_tamper_with_monetary_fields(client, db):
    _setup_buyer(client, db, "ship-tamper@example.com")
    token = _login_token(client, "ship-tamper@example.com")
    product = _create_product(db, 100.0)
    _add_to_cart(client, token, product.id, qty=2)

    baseline = _calculate_totals(client, token)
    tampered = _calculate_totals(
        client,
        token,
        body={
            "coupon_code": None,
            "loyalty_points_to_redeem": 0,
            "subtotal": 999999.0,
            "grand_total": 1.0,
            "shipping": -50.0,
            "total_amount": 5.0,
            "free_shipping": True,
        },
    )
    for field in ("subtotal", "shipping", "grand_total", "free_shipping"):
        assert tampered[field] == baseline[field], field


def test_quantity_update_recalculates_shipping(client, db):
    _setup_buyer(client, db, "ship-qty@example.com")
    token = _login_token(client, "ship-qty@example.com")
    product = _create_product(db, 250.0)
    pid = product.id  # capture before HTTP calls detach the instance
    _add_to_cart(client, token, pid, qty=1)
    before = _calculate_totals(client, token)
    assert before["shipping"] == FLAT_SHIPPING_RATE

    resp = client.put(f"/api/v1/cart/{pid}?quantity=3", headers=_auth(token))
    assert resp.status_code == 200, resp.text
    after = _calculate_totals(client, token)
    assert after["subtotal"] == 750.0
    assert after["shipping"] == 0.0
    assert after["grand_total"] == 750.0


def test_remove_item_recalculates_shipping(client, db):
    _setup_buyer(client, db, "ship-remove@example.com")
    token = _login_token(client, "ship-remove@example.com")
    p1 = _create_product(db, 300.0)
    p2 = _create_product(db, 300.0)
    pid1, pid2 = p1.id, p2.id  # capture before HTTP calls detach the instances
    _add_to_cart(client, token, pid1)
    _add_to_cart(client, token, pid2)
    both = _calculate_totals(client, token)
    assert both["subtotal"] == 600.0
    assert both["shipping"] == 0.0

    resp = client.delete(f"/api/v1/cart/{pid1}", headers=_auth(token))
    assert resp.status_code == 200, resp.text
    remaining = _calculate_totals(client, token)
    assert remaining["subtotal"] == 300.0
    assert remaining["shipping"] == FLAT_SHIPPING_RATE
    assert remaining["grand_total"] == 350.0


def test_loyalty_points_pass_through_calculate_totals(client, db):
    """Regression guard for the CartCalculateRequest passthrough fix."""
    user, token, _ = _setup_buyer(client, db, "ship-loyalty@example.com")
    db.add(LoyaltyAccount(user_id=user.id, current_points=100))
    db.commit()
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id)

    data = _calculate_totals(
        client, token, body={"coupon_code": None, "loyalty_points_to_redeem": 50}
    )
    assert data["loyalty_points_redeemed"] == 50
    assert data["loyalty_discount"] == 50.0
    assert data["shipping"] == FLAT_SHIPPING_RATE
    # 400 subtotal - 50 loyalty + 50 shipping = 400.00
    assert data["grand_total"] == 400.0


# ─── Checkout consistency: displayed total == placed order total ─────────────


def test_checkout_final_amount_matches_cart_calculation(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id = _setup_buyer(client, db, "ship-co-free@example.com")
    product = _create_product(db, 250.0)
    _add_to_cart(client, token, product.id, qty=3)

    calc = _calculate_totals(client, token)
    assert calc["grand_total"] == 750.0

    resp = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["final_amount"] == calc["grand_total"]
    assert order["total_amount"] == 750.0
    assert order["discount_amount"] == 0.0
    assert order["tax_amount"] == 0.0
    assert order["shipping_amount"] == 0.0


def test_checkout_with_coupon_and_paid_shipping_exact_math(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id = _setup_buyer(client, db, "ship-co-coupon@example.com")
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id)
    _create_coupon(db, "SHIPCO100", 100, discount_type="fixed")

    calc = _calculate_totals(client, token, body={"coupon_code": "SHIPCO100"})
    assert calc["grand_total"] == 350.0  # 400 - 100 + 50

    resp = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": address_id, "coupon_code": "SHIPCO100"},
    )
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["total_amount"] == 400.0
    assert order["discount_amount"] == 100.0
    assert order["tax_amount"] == 0.0
    assert order["shipping_amount"] == FLAT_SHIPPING_RATE
    assert order["final_amount"] == 350.0
    assert order["final_amount"] == calc["grand_total"]
