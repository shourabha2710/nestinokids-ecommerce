"""Phase 24.6 - Checkout / COD flow tests.

Verifies the real Cart -> Checkout -> Order pipeline:
  - COD is the only payment method; payment_status stays "pending"
  - order totals are server-authoritative (Phase 24.5 engine reused)
  - inventory is deducted exactly once and never bypassed
  - duplicate submissions cannot create duplicate orders
  - transaction boundaries: failed checkouts leave no partial state
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
    LoyaltyTransaction,
    LoyaltyTransactionTypeEnum,
    Order,
    OrderStatusEnum,
    Product,
    ProductVariant,
    RoleEnum,
    User,
)
from app.services.order_state_machine import order_state_machine
from app.services.settings_service import get_settings


FREE_SHIPPING_THRESHOLD = 500.0
FLAT_SHIPPING_RATE = 50.0


@pytest.fixture(autouse=True)
def stable_shipping_config(monkeypatch):
    monkeypatch.setattr(app_settings, "FREE_SHIPPING_THRESHOLD", FREE_SHIPPING_THRESHOLD)
    monkeypatch.setattr(app_settings, "FLAT_SHIPPING_RATE", FLAT_SHIPPING_RATE)


# ─── helpers ──────────────────────────────────────────────────────────────────

_seq = itertools.count(1)


def _create_user(db, email, phone="8888888801"):
    user = User(
        email=email,
        first_name="Cod",
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
    name = name or f"CodProd{n}"
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
        sku=f"COD-{n}",
        quantity=100,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    pid = product.id  # capture before any HTTP call detaches the instance
    inv = Inventory(
        product_id=pid,
        total_quantity=50,
        available_quantity=50,
        reserved_quantity=0,
        low_stock_threshold=5,
    )
    db.add(inv)
    db.commit()
    return product


def _create_variant(db, product_id, price_modifier=0.0, quantity=10):
    n = next(_seq)
    variant = ProductVariant(
        product_id=product_id,
        size="M",
        color=f"C{n}",
        price_modifier=price_modifier,
        quantity=quantity,
        sku=f"VAR-{n}",
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    vid = variant.id
    return vid


def _setup_buyer(client, db, email, suffix=1):
    user = _create_user(db, email, phone=f"88888888{suffix:02d}")
    token = _login_token(client, email)
    resp = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Cod",
            "last_name": "Buyer",
            "phone": f"88888888{suffix:02d}",
            "email": email,
            "address_line_1": "2 Checkout Lane",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    address_id = resp.json()["id"]
    uid = user.id  # capture before HTTP detaches the instance
    return user, token, address_id, uid


def _add_to_cart(client, token, product_id, qty=1, variant_id=None):
    url = f"/api/v1/cart/{product_id}?quantity={qty}"
    if variant_id is not None:
        url += f"&variant_id={variant_id}"
    resp = client.post(url, headers=_auth(token))
    assert resp.status_code == 200, resp.text


def _checkout(client, token, address_id, **extra):
    body = {"shipping_address_id": address_id}
    body.update(extra)
    return client.post("/api/v1/checkout", headers=_auth(token), json=body)


def _enable_direct_checkout(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()


def _fresh_inventory(db, product_id):
    return (
        db.query(Inventory).filter(Inventory.product_id == product_id).first()
    )


# ─── Happy path: COD order end to end ─────────────────────────────────────────


def test_successful_cod_order_full_verification(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-happy@example.com")
    product = _create_product(db, 250.0)
    pid = product.id
    _add_to_cart(client, token, pid, qty=3)  # 750 -> free shipping

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()

    # Exactly one order for this user
    orders = (
        db.query(Order).filter(Order.user_id == user_id).all()
    )
    assert len(orders) == 1

    assert order["order_number"].startswith("ORD-")
    assert order["status"] == "pending"
    assert order["payment_status"] == "pending"  # COD: payable on delivery
    assert order["total_amount"] == 750.0
    assert order["discount_amount"] == 0.0
    assert order["tax_amount"] == 0.0
    assert order["shipping_amount"] == 0.0
    assert order["final_amount"] == 750.0

    items = order["items"]
    assert len(items) == 1
    assert items[0]["product_id"] == pid
    assert items[0]["quantity"] == 3
    assert items[0]["price"] == 250.0
    assert items[0]["total"] == 750.0

    # DB row agrees with the response (payment_method is not in the schema)
    row = orders[0]
    assert row.payment_method == "cod"

    # Cart cleared exactly once
    cart_check = client.get("/api/v1/cart", headers=_auth(token))
    assert cart_check.status_code == 200
    assert cart_check.json() == []


def test_cod_order_below_threshold_pays_flat_shipping(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-below@example.com")
    product = _create_product(db, 249.995)  # rounds to 500? no: 499.99 x1 below
    product.price = 499.99
    db.commit()
    pid = product.id
    _add_to_cart(client, token, pid, qty=1)

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["total_amount"] == 499.99
    assert order["shipping_amount"] == FLAT_SHIPPING_RATE
    assert order["final_amount"] == 549.99


def test_cod_order_at_threshold_ships_free(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-at@example.com")
    product = _create_product(db, 500.00)
    pid = product.id
    _add_to_cart(client, token, pid, qty=1)

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["shipping_amount"] == 0.0
    assert order["final_amount"] == 500.0


def test_cod_order_just_above_threshold_ships_free(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-above@example.com")
    product = _create_product(db, 500.01)
    pid = product.id
    _add_to_cart(client, token, pid, qty=1)

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["shipping_amount"] == 0.0
    assert order["final_amount"] == 500.01


# ─── Inventory ────────────────────────────────────────────────────────────────


def test_inventory_deducted_exactly_once(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-inv@example.com")
    product = _create_product(db, 100.0)
    pid = product.id
    _add_to_cart(client, token, pid, qty=4)

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text

    inv = _fresh_inventory(db, pid)
    assert inv.available_quantity == 50 - 4
    assert inv.reserved_quantity == 0 + 4


def test_insufficient_stock_rejected_without_side_effects(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-stock@example.com")
    product = _create_product(db, 100.0)
    pid = product.id
    _add_to_cart(client, token, pid, qty=999)

    resp = _checkout(client, token, address_id)
    assert resp.status_code == 400
    assert "Insufficient stock" in resp.json()["detail"]

    # No partial state: nothing deducted, no order created
    assert _fresh_inventory(db, pid).available_quantity == 50
    assert (
        db.query(Order).filter(Order.user_id == user_id).count() == 0
    )


def test_missing_inventory_row_never_bypasses_stock_control(client, db, monkeypatch):
    """Regression: a product without an Inventory row used to be orderable forever."""
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-noinv@example.com")
    product = _create_product(db, 120.0)
    pid = product.id
    inv = _fresh_inventory(db, pid)
    db.delete(inv)
    db.commit()
    _add_to_cart(client, token, pid, qty=1)

    resp = _checkout(client, token, address_id)
    assert resp.status_code == 400
    assert "Insufficient stock" in resp.json()["detail"]
    assert db.query(Order).filter(Order.user_id == user_id).count() == 0


# ─── Duplicate submission / idempotency ───────────────────────────────────────


def test_sequential_duplicate_submission_creates_single_order(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-dup@example.com")
    product = _create_product(db, 300.0)
    pid = product.id
    _add_to_cart(client, token, pid, qty=2)  # 600 -> free shipping

    first = _checkout(client, token, address_id)
    assert first.status_code in (200, 201), first.text
    second = _checkout(client, token, address_id)
    assert second.status_code == 400
    assert second.json()["detail"] == "Cart is empty"

    orders = db.query(Order).filter(Order.user_id == user_id).all()
    assert len(orders) == 1
    # Inventory deducted once, not twice
    assert _fresh_inventory(db, pid).available_quantity == 48


def test_tampered_request_fields_are_ignored_at_checkout(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-tamper@example.com")
    product = _create_product(db, 100.0)
    pid = product.id
    _add_to_cart(client, token, pid, qty=1)

    resp = _checkout(
        client,
        token,
        address_id,
        subtotal=999999.0,
        grand_total=1.0,
        shipping_amount=-42.0,
        discount_amount=777.0,
        total_amount=5.0,
        payment_method="razorpay",
        payment_status="completed",
        status="delivered",
    )
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["total_amount"] == 100.0
    assert order["shipping_amount"] == FLAT_SHIPPING_RATE
    assert order["final_amount"] == 150.0
    assert order["payment_status"] == "pending"
    assert order["status"] == "pending"


# ─── Address handling ─────────────────────────────────────────────────────────


def test_other_users_shipping_address_rejected(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    owner, owner_token, owner_address_id, _ = _setup_buyer(
        client, db, "cod-owner@example.com", suffix=1
    )
    attacker_user, attacker_token, _, _ = _setup_buyer(
        client, db, "cod-attacker@example.com", suffix=2
    )
    product = _create_product(db, 90.0)
    _add_to_cart(client, attacker_token, product.id, qty=1)

    resp = _checkout(client, attacker_token, owner_address_id)
    assert resp.status_code == 404
    assert "Shipping address" in resp.json()["detail"]


def test_other_users_billing_address_rejected(client, db, monkeypatch):
    """Regression: billing_address_id used to be stored without ownership checks."""
    _enable_direct_checkout(db, monkeypatch)
    other_user, _, other_address_id, _ = _setup_buyer(
        client, db, "cod-bill-owner@example.com", suffix=1
    )
    _, token, address_id, user_id = _setup_buyer(
        client, db, "cod-bill-user@example.com", suffix=2
    )
    product = _create_product(db, 80.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(
        client, token, address_id, billing_address_id=other_address_id
    )
    assert resp.status_code == 404
    assert "Billing address" in resp.json()["detail"]


# ─── Variants ─────────────────────────────────────────────────────────────────


def test_variant_order_prices_and_deducts_variant_stock(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-var@example.com")
    product = _create_product(db, 100.0)
    pid = product.id
    vid = _create_variant(db, pid, price_modifier=50.0, quantity=5)
    _add_to_cart(client, token, pid, qty=2, variant_id=vid)  # unit 150, total 300

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["items"][0]["price"] == 150.0
    assert order["items"][0]["total"] == 300.0

    variant_row = db.query(ProductVariant).filter(ProductVariant.id == vid).first()
    assert variant_row.quantity == 3  # 5 - 2
    assert _fresh_inventory(db, pid).available_quantity == 48


def test_variant_from_different_product_rejected(client, db, monkeypatch):
    """Regression: cross-product variant ids were priced/deducted silently."""
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-xvar@example.com")
    p_a = _create_product(db, 100.0)
    p_b = _create_product(db, 100.0)
    vid_b = _create_variant(db, p_b.id, quantity=9)
    _add_to_cart(client, token, p_a.id, qty=1, variant_id=vid_b)

    resp = _checkout(client, token, address_id)
    assert resp.status_code == 400
    assert "not available" in resp.json()["detail"]
    assert db.query(Order).filter(Order.user_id == user_id).count() == 0
    # Variant untouched
    assert (
        db.query(ProductVariant).filter(ProductVariant.id == vid_b).first().quantity
        == 9
    )


# ─── Product availability ─────────────────────────────────────────────────────


def test_inactive_product_rejected_at_checkout(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-inactive@example.com")
    product = _create_product(db, 70.0)
    product.is_active = False
    db.commit()
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(client, token, address_id)
    assert resp.status_code == 400
    assert "no longer available" in resp.json()["detail"]
    assert db.query(Order).filter(Order.user_id == user_id).count() == 0


# ─── Coupons + loyalty through COD checkout ───────────────────────────────────


def _future_coupon(db, code, value):
    now = datetime.utcnow()
    coupon = Coupon(
        code=code,
        name=code,
        description="phase 24.6",
        discount_type="fixed",
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
    cid = coupon.id
    return cid


def test_coupon_with_cod_usage_recorded_exactly_once(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-coupon@example.com")
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)
    coupon_id = _future_coupon(db, "COD100", 100)

    resp = _checkout(client, token, address_id, coupon_code="COD100")
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["discount_amount"] == 100.0
    assert order["shipping_amount"] == FLAT_SHIPPING_RATE  # pre-discount rule
    assert order["final_amount"] == 350.0

    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    assert coupon.usage_count == 1

    # Retry after cart cleared must not increment again
    retry = _checkout(client, token, address_id, coupon_code="COD100")
    assert retry.status_code == 400
    fresh_coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    assert fresh_coupon.usage_count == 1


def test_loyalty_with_cod_points_deducted_exactly_once(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, user_id = _setup_buyer(
        client, db, "cod-loyalty@example.com"
    )
    db.add(LoyaltyAccount(user_id=user_id, current_points=100))
    db.commit()
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(
        client, token, address_id, loyalty_points_to_redeem=50
    )
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["discount_amount"] == 50.0
    assert order["shipping_amount"] == FLAT_SHIPPING_RATE
    assert order["final_amount"] == 400.0  # 400 - 50 + 50

    account = (
        db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id).first()
    )
    db.expire(account, ["current_points"])
    assert account.current_points == 50  # 100 - 50, exactly once


# ─── Error handling ───────────────────────────────────────────────────────────


def test_empty_cart_checkout_rejected(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-empty@example.com")

    resp = _checkout(client, token, address_id)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Cart is empty"


def test_deleted_product_in_cart_rejected(client, db, monkeypatch):
    """A cart row whose product vanished mid-session must fail closed."""
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, user_id = _setup_buyer(client, db, "cod-deleted@example.com")
    product = _create_product(db, 60.0)
    from app.models.models import cart_association

    db.execute(
        cart_association.insert().values(
            user_id=user.id, product_id=99999999, quantity=1
        )
    )
    db.commit()

    resp = _checkout(client, token, address_id)
    assert resp.status_code == 404
    assert db.query(Order).filter(Order.user_id == user_id).count() == 0


# ─── POST /orders payment-method allowlist ────────────────────────────────────


def test_orders_endpoint_rejects_non_cod_payment_methods(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-pm@example.com")
    product = _create_product(db, 55.0)
    pid = product.id

    resp = client.post(
        "/api/v1/orders",
        headers=_auth(token),
        json={
            "items": [{"product_id": pid, "quantity": 1}],
            "shipping_address_id": address_id,
            "payment_method": "card",
        },
    )
    assert resp.status_code == 400
    assert "Only 'cod'" in resp.json()["detail"]
    assert db.query(Order).filter(Order.user_id == user_id).count() == 0
    # Nothing deducted by the rejected request
    assert _fresh_inventory(db, pid).available_quantity == 50


def test_orders_endpoint_accepts_cod_case_insensitive(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-pm2@example.com")
    product = _create_product(db, 65.0)
    pid = product.id

    resp = client.post(
        "/api/v1/orders",
        headers=_auth(token),
        json={
            "items": [{"product_id": pid, "quantity": 1}],
            "shipping_address_id": address_id,
            "payment_method": "  COD ",
        },
    )
    assert resp.status_code in (200, 201), resp.text
    row = db.query(Order).filter(Order.user_id == user_id).first()
    assert row.payment_method == "cod"
    assert str(row.payment_status.value) == "pending"


# ─── Status transitions & payment status semantics ────────────────────────────


def test_delivered_transition_awards_loyalty_once(client, db, monkeypatch):
    """Regression: the delivered hook committed mid-transition; it must flush only."""
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, user_id = _setup_buyer(
        client, db, "cod-deliver@example.com"
    )
    product = _create_product(db, 300.0)
    _add_to_cart(client, token, product.id, qty=1)  # 300 < threshold -> +50 ship

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    final_amount = resp.json()["final_amount"]  # 350

    order = db.query(Order).filter(Order.user_id == user_id).first()
    oid = order.id

    # Walk pending -> ... -> delivered through the state machine
    for next_status in ("confirmed", "packed", "shipped", "out_for_delivery", "delivered"):
        order_state_machine.transition(db, order, next_status, admin_id=None)
    db.commit()

    earn_txs = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == oid,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .all()
    )
    expected_points = int(final_amount * app_settings.POINTS_PER_CURRENCY)
    assert len(earn_txs) == 1
    assert earn_txs[0].points == expected_points

    # Calling the award hook again must not double-award
    from app.api.v1.endpoints.engagement import award_loyalty_points_for_order

    award_loyalty_points_for_order(oid, db)
    db.commit()
    earn_txs_after = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == oid,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .all()
    )
    assert len(earn_txs_after) == 1


def test_cancellation_restores_stock_but_payment_stays_pending(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, user_id = _setup_buyer(client, db, "cod-cancel@example.com")
    product = _create_product(db, 210.0)
    pid = product.id
    _add_to_cart(client, token, pid, qty=2)

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    assert _fresh_inventory(db, pid).available_quantity == 48

    order = db.query(Order).filter(Order.user_id == user_id).first()
    order_state_machine.transition(db, order, "cancelled", admin_id=None)
    db.commit()

    fresh = db.query(Order).filter(Order.id == order.id).first()
    assert fresh.status == OrderStatusEnum.CANCELLED
    # COD money was never captured: payment status remains pending
    assert str(fresh.payment_status.value) == "pending"
    # Stock restored
    inv = _fresh_inventory(db, pid)
    assert inv.available_quantity == 50
    assert inv.reserved_quantity == 0


def test_order_ids_and_totals_consistent_between_list_and_detail(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "cod-consist@example.com")
    product = _create_product(db, 120.0)
    _add_to_cart(client, token, product.id, qty=1)

    created = _checkout(client, token, address_id)
    assert created.status_code in (200, 201), created.text
    placed = created.json()

    detail = client.get(f"/api/v1/orders/{placed['id']}", headers=_auth(token))
    assert detail.status_code == 200
    listed = client.get("/api/v1/orders", headers=_auth(token))
    assert listed.status_code == 200

    d = detail.json()
    l = [o for o in listed.json() if o["id"] == placed["id"]]
    assert len(l) == 1
    for view in (d, l[0]):
        assert view["order_number"] == placed["order_number"]
        assert view["final_amount"] == placed["final_amount"] == 170.0
        assert view["payment_status"] == "pending"
