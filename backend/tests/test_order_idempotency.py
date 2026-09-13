"""G3 - Order idempotency / duplicate order prevention tests.

SQLite covers the contract end-to-end (validation, sequential replay, 409
conflict, isolation, rollback, cancellation, exactly-once side effects).
PostgreSQL-only concurrency proofs live in the dev verification script
(non-repo); SQLite cannot reproduce PostgreSQL row-lock/unique-index
behaviour and is never used as proof of concurrency.
"""
import itertools
from uuid import uuid4
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
    OrderIdempotencyKey,
    OrderItem,
    OrderStatusEnum,
    OrderTrackingEvent,
    Product,
    ProductVariant,
    RoleEnum,
    User,
    cart_association,
)
from app.services.order_state_machine import order_state_machine
from app.services.settings_service import get_settings

FREE_SHIPPING_THRESHOLD = 500.0
FLAT_SHIPPING_RATE = 50.0


@pytest.fixture(autouse=True)
def stable_shipping_config(monkeypatch):
    monkeypatch.setattr(app_settings, "FREE_SHIPPING_THRESHOLD", FREE_SHIPPING_THRESHOLD)
    monkeypatch.setattr(app_settings, "FLAT_SHIPPING_RATE", FLAT_SHIPPING_RATE)


# ─── helpers ───────────────────────────────────────────────────────────────

_seq = itertools.count(1)


def _create_user(db, email, suffix=1):
    user = User(
        email=email,
        first_name="Idem",
        last_name="Tester",
        phone=f"66666666{suffix:02d}",
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


def _headers(token, key=None):
    headers = _auth(token)
    headers["Idempotency-Key"] = key if key is not None else str(uuid4())
    return headers


def _create_address(client, token, suffix=1, line="3 Idempotency Way"):
    resp = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Idem",
            "last_name": "Buyer",
            "phone": f"66666666{suffix:02d}",
            "email": "idem@example.com",
            "address_line_1": line,
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400001",
            "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _create_product(db, price, qty=50):
    n = next(_seq)
    name = f"IdemProd{n}"
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
        sku=f"IDEM-{n}",
        quantity=100,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    db.add(Inventory(
        product_id=product.id,
        total_quantity=qty,
        available_quantity=qty,
        reserved_quantity=0,
        low_stock_threshold=5,
    ))
    db.commit()
    return product


def _create_variant(db, product_id, quantity=10):
    n = next(_seq)
    variant = ProductVariant(
        product_id=product_id,
        size="M",
        color=f"C{n}",
        price_modifier=0.0,
        quantity=quantity,
        sku=f"VIDEM-{n}",
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant.id


def _orders(body, headers, client):
    return client.post("/api/v1/orders", headers=headers, json=body)


def _checkout(client, token, address_id, key=None, **extra):
    body = {"shipping_address_id": address_id}
    body.update(extra)
    return client.post("/api/v1/checkout", headers=_headers(token, key), json=body)


def _setup_buyer(client, db, email, suffix=1):
    user = _create_user(db, email, suffix=suffix)
    token = _login_token(client, email)
    address_id = _create_address(client, token, suffix=suffix)
    uid = user.id
    return user, token, address_id, uid


def _add_to_cart(client, token, product_id, qty=1, variant_id=None):
    url = f"/api/v1/cart/{product_id}?quantity={qty}"
    if variant_id is not None:
        url += f"&variant_id={variant_id}"
    resp = client.post(url, headers=_auth(token))
    assert resp.status_code == 200, resp.text


def _enable_direct_checkout(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()


def _fresh_inventory(db, product_id):
    return db.query(Inventory).filter(Inventory.product_id == product_id).first()


def _account(db, user_id):
    return db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id).first()


def _future_coupon(db, code, value=100):
    now = datetime.utcnow()
    coupon = Coupon(
        code=code,
        name=code,
        description="g3 idempotency",
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
    return coupon.id


# ─── A. Header validation ──────────────────────────────────────────────────


def test_missing_idempotency_key_rejected_both_endpoints(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-missing@example.com")
    product = _create_product(db, 400.0)
    pid = product.id

    r = client.post(
        "/api/v1/orders",
        headers=_auth(token),
        json={"items": [{"product_id": pid, "quantity": 1}], "shipping_address_id": address_id},
    )
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "IDEMPOTENCY_KEY_REQUIRED"

    r2 = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": address_id},
    )
    assert r2.status_code == 400
    assert r2.json()["detail"]["code"] == "IDEMPOTENCY_KEY_REQUIRED"
    assert db.query(Order).filter(Order.user_id == uid).count() == 0


def test_empty_and_oversized_and_non_printable_keys_rejected(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "g3-badkey@example.com")
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    for bad in ("", "   ", "a" * 129, "key\nwith\x07control"):
        headers = _headers(token, bad)
        r = client.post("/api/v1/checkout", headers=headers, json={"shipping_address_id": address_id})
        assert r.status_code == 400, f"key {bad!r} should be rejected"
        code = r.json()["detail"]["code"]
        assert code in ("IDEMPOTENCY_KEY_REQUIRED", "IDEMPOTENCY_KEY_INVALID", "IDEMPOTENCY_KEY_TOO_LONG")


# ─── B. Sequential replay ──────────────────────────────────────────────────


def test_orders_same_key_same_payload_replays_original_order(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-order-replay@example.com")
    product = _create_product(db, 400.0)
    pid = product.id
    payload = {
        "items": [{"product_id": pid, "quantity": 2}],
        "shipping_address_id": address_id,
        "payment_method": "cod",
    }
    headers = _headers(token, "fixed-key-orders")

    first = _orders(payload, headers, client)
    assert first.status_code == 201, first.text
    order1 = first.json()

    second = _orders(payload, headers, client)
    assert second.status_code == 201, second.text
    assert second.headers.get("Idempotency-Replayed") == "true"
    order2 = second.json()

    assert order1["id"] == order2["id"]
    assert order1["order_number"] == order2["order_number"]
    assert order1["final_amount"] == order2["final_amount"]
    assert db.query(Order).filter(Order.user_id == uid).count() == 1
    assert db.query(OrderItem).filter(OrderItem.order_id == order1["id"]).count() == 1
    assert db.query(OrderIdempotencyKey).count() == 1


def test_checkout_same_key_same_payload_replays_original_order(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-co-replay@example.com")
    product = _create_product(db, 300.0)
    _add_to_cart(client, token, product.id, qty=1)

    first = _checkout(client, token, address_id, key="fixed-key-checkout")
    assert first.status_code in (200, 201), first.text
    order1 = first.json()

    second = _checkout(client, token, address_id, key="fixed-key-checkout")
    assert second.status_code in (200, 201), second.text
    assert second.headers.get("Idempotency-Replayed") == "true"
    order2 = second.json()

    assert order1["id"] == order2["id"]
    assert order1["order_number"] == order2["order_number"]
    assert order1["final_amount"] == order2["final_amount"]
    assert db.query(Order).filter(Order.user_id == uid).count() == 1
    assert db.query(OrderIdempotencyKey).count() == 1


def test_replay_does_not_deduct_stock_or_variant_again(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "g3-inv-replay@example.com")
    product = _create_product(db, 300.0)
    pid = product.id
    vid = _create_variant(db, pid, quantity=10)
    _add_to_cart(client, token, pid, qty=2, variant_id=vid)

    key = "stock-key"
    first = _checkout(client, token, address_id, key=key)
    assert first.status_code in (200, 201), first.text

    inv = _fresh_inventory(db, pid)
    assert (inv.available_quantity, inv.reserved_quantity) == (48, 2)
    variant = db.query(ProductVariant).filter(ProductVariant.id == vid).first()
    assert variant.quantity == 8

    second = _checkout(client, token, address_id, key=key)
    assert second.status_code in (200, 201), second.text
    assert second.headers.get("Idempotency-Replayed") == "true"

    inv2 = _fresh_inventory(db, pid)
    assert (inv2.available_quantity, inv2.reserved_quantity) == (48, 2)
    variant2 = db.query(ProductVariant).filter(ProductVariant.id == vid).first()
    assert variant2.quantity == 8


def test_replay_does_not_increment_coupon_usage_again(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "g3-coupon-replay@example.com")
    product = _create_product(db, 400.0)
    pid = product.id
    _add_to_cart(client, token, pid, qty=1)
    cid = _future_coupon(db, "G3CPN", 100)

    key = "coupon-key"
    first = _checkout(client, token, address_id, key=key, coupon_code="G3CPN")
    assert first.status_code in (200, 201), first.text
    assert db.query(Coupon).filter(Coupon.id == cid).first().usage_count == 1

    second = _checkout(client, token, address_id, key=key, coupon_code="G3CPN")
    assert second.status_code in (200, 201), second.text
    assert db.query(Coupon).filter(Coupon.id == cid).first().usage_count == 1


def test_replay_does_not_create_duplicate_tracking_or_history(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, _ = _setup_buyer(client, db, "g3-tracking@example.com")
    product = _create_product(db, 300.0)
    _add_to_cart(client, token, product.id, qty=1)

    key = "tracking-key"
    first = _checkout(client, token, address_id, key=key)
    assert first.status_code in (200, 201), first.text
    oid = first.json()["id"]
    second = _checkout(client, token, address_id, key=key)
    assert second.status_code in (200, 201), second.text

    assert (
        db.query(OrderTrackingEvent).filter(OrderTrackingEvent.order_id == oid).count() == 1
    )
    from app.models.models import OrderStatusHistory
    assert (
        db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == oid).count() == 1
    )


def test_replay_does_not_clear_cart_again(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-cart@example.com")
    a = _create_product(db, 300.0)
    b = _create_product(db, 200.0)
    a_id, b_id = a.id, b.id
    _add_to_cart(client, token, a_id, qty=1)
    _add_to_cart(client, token, b_id, qty=1)

    key = "cart-key"
    payload = {
        "items": [{"product_id": a_id, "quantity": 1}],
        "shipping_address_id": address_id,
        "payment_method": "cod",
    }
    first = _orders(payload, _headers(token, key), client)
    assert first.status_code == 201, first.text
    cart_rows = db.execute(
        cart_association.select().where(cart_association.c.user_id == uid)
    ).all()
    assert len(cart_rows) == 1  # only product B remains

    second = _orders(payload, _headers(token, key), client)
    assert second.status_code == 201, second.text
    assert second.headers.get("Idempotency-Replayed") == "true"

    cart_after = db.execute(
        cart_association.select().where(cart_association.c.user_id == uid)
    ).all()
    assert len(cart_after) == 1  # unchanged: nothing recomputed, nothing cleared


# ─── C. Fingerprint mismatch → 409 ─────────────────────────────────────────


def test_orders_changed_items_conflict(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-item409@example.com")
    a = _create_product(db, 300.0)
    b = _create_product(db, 200.0)
    a_id, b_id = a.id, b.id
    headers = _headers(token, "same-key-items")
    base = {"shipping_address_id": address_id, "payment_method": "cod"}

    first = _orders({**base, "items": [{"product_id": a_id, "quantity": 1}]}, headers, client)
    assert first.status_code == 201, first.text

    conflict = _orders(
        {**base, "items": [{"product_id": a_id, "quantity": 1}, {"product_id": b_id, "quantity": 1}]},
        headers,
        client,
    )
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_orders_changed_quantity_conflict(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-qty409@example.com")
    a = _create_product(db, 300.0)
    a_id = a.id
    headers = _headers(token, "same-key-qty")
    base = {"shipping_address_id": address_id, "payment_method": "cod"}

    first = _orders({**base, "items": [{"product_id": a_id, "quantity": 1}]}, headers, client)
    assert first.status_code == 201, first.text

    conflict = _orders({**base, "items": [{"product_id": a_id, "quantity": 2}]}, headers, client)
    assert conflict.status_code == 409
    assert db.query(Order).filter(Order.user_id == uid).count() == 1


def test_orders_changed_address_conflict(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address1, uid = _setup_buyer(client, db, "g3-addr409@example.com")
    address2 = _create_address(client, token, suffix=1, line="99 Second Lane")
    a = _create_product(db, 300.0)
    a_id = a.id
    headers = _headers(token, "same-key-addr")
    payload = {"items": [{"product_id": a_id, "quantity": 1}], "payment_method": "cod"}

    first = _orders({**payload, "shipping_address_id": address1}, headers, client)
    assert first.status_code == 201, first.text

    conflict = _orders({**payload, "shipping_address_id": address2}, headers, client)
    assert conflict.status_code == 409
    assert db.query(Order).filter(Order.user_id == uid).count() == 1


def test_checkout_changed_coupon_conflict(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-cpn409@example.com")
    a = _create_product(db, 400.0)
    a_id = a.id
    _add_to_cart(client, token, a_id, qty=1)
    _future_coupon(db, "G3A", 50)
    _future_coupon(db, "G3B", 60)
    key = "same-key-coupon"

    first = _checkout(client, token, address_id, key=key, coupon_code="g3a ")
    assert first.status_code in (200, 201), first.text

    conflict = _checkout(client, token, address_id, key=key, coupon_code="G3B")
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_loyalty_change_conflict(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "g3-loy409@example.com")
    db.add(LoyaltyAccount(user_id=uid, current_points=200))
    db.commit()
    a = _create_product(db, 400.0)
    a_id = a.id
    _add_to_cart(client, token, a_id, qty=1)
    key = "same-key-loyalty"

    first = _checkout(client, token, address_id, key=key, loyalty_points_to_redeem=50)
    assert first.status_code in (200, 201), first.text

    conflict = _checkout(client, token, address_id, key=key, loyalty_points_to_redeem=80)
    assert conflict.status_code == 409
    assert db.query(Order).filter(Order.user_id == uid).count() == 1


def test_billing_address_canonicalization_does_not_conflict(client, db, monkeypatch):
    """shipping==billing ↔ omitted billing must fingerprint identically."""
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-bill@example.com")
    a = _create_product(db, 300.0)
    a_id = a.id
    headers = _headers(token, "same-key-billing")
    payload = {"items": [{"product_id": a_id, "quantity": 1}], "payment_method": "cod",
               "shipping_address_id": address_id}

    first = _orders({**payload, "billing_address_id": address_id}, headers, client)
    assert first.status_code == 201, first.text

    replay = _orders(payload, headers, client)
    assert replay.status_code == 201, replay.text
    assert replay.headers.get("Idempotency-Replayed") == "true"


# ─── D. User isolation ─────────────────────────────────────────────────────


def test_same_key_independent_across_users(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token_a, addr_a, uid_a = _setup_buyer(client, db, "g3-userA@example.com", suffix=1)
    _, token_b, addr_b, uid_b = _setup_buyer(client, db, "g3-userB@example.com", suffix=2)
    pa = _create_product(db, 300.0)
    pb = _create_product(db, 200.0)
    pa_id, pb_id = pa.id, pb.id
    key = "shared-key-across-users"

    _add_to_cart(client, token_a, pa_id, qty=1)
    _add_to_cart(client, token_b, pb_id, qty=1)

    ra = _checkout(client, token_a, addr_a, key=key)
    rb = _checkout(client, token_b, addr_b, key=key)
    assert ra.status_code in (200, 201), ra.text
    assert rb.status_code in (200, 201), rb.text

    assert db.query(Order).filter(Order.user_id == uid_a).count() == 1
    assert db.query(Order).filter(Order.user_id == uid_b).count() == 1
    assert db.query(OrderIdempotencyKey).count() == 2


# ─── E. Failure rollback ───────────────────────────────────────────────────


def test_failed_order_rolls_back_claim_and_retry_succeeds(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-rollback@example.com")
    product = _create_product(db, 400.0)
    pid = product.id
    vid = _create_variant(db, pid, quantity=1)
    _add_to_cart(client, token, pid, qty=2, variant_id=vid)
    key = "retry-key"

    # variant stock insufficient (2 requested, 1 available) -> whole tx fails
    first = _checkout(client, token, address_id, key=key)
    assert first.status_code == 400
    assert "Insufficient variant stock" in first.json()["detail"]

    # The idempotency claim must have been rolled back with the order
    assert db.query(OrderIdempotencyKey).count() == 0
    assert db.query(Order).filter(Order.user_id == uid).count() == 0
    assert _fresh_inventory(db, pid).available_quantity == 50

    # Fix stock, retry the SAME key -> succeeds (no poisoned key)
    variant = db.query(ProductVariant).filter(ProductVariant.id == vid).first()
    variant.quantity = 10
    db.commit()

    retry = _checkout(client, token, address_id, key=key)
    assert retry.status_code in (200, 201), retry.text
    assert retry.headers.get("Idempotency-Replayed") is None
    assert db.query(Order).filter(Order.user_id == uid).count() == 1
    assert db.query(OrderIdempotencyKey).count() == 1


def test_key_cannot_be_claimed_by_other_user_to_replay(client, db, monkeypatch):
    """A key used by user A must never let user B read A's order."""
    _enable_direct_checkout(db, monkeypatch)
    _, token_a, addr_a, uid_a = _setup_buyer(client, db, "g3-secA@example.com", suffix=1)
    _, token_b, addr_b, uid_b = _setup_buyer(client, db, "g3-secB@example.com", suffix=2)
    pa = _create_product(db, 300.0)
    _add_to_cart(client, token_a, pa.id, qty=1)
    key = "security-key"

    ra = _checkout(client, token_a, addr_a, key=key)
    assert ra.status_code in (200, 201), ra.text

    # B reuses the same key -> B's claim is independent, B has empty cart -> 400
    rb = _checkout(client, token_b, addr_b, key=key)
    assert rb.status_code == 400
    assert "Cart is empty" in rb.json()["detail"]
    assert db.query(Order).filter(Order.user_id == uid_a).count() == 1
    assert db.query(Order).filter(Order.user_id == uid_b).count() == 0


# ─── F. Cancellation + replay ──────────────────────────────────────────────


def test_replay_after_cancel_returns_same_order_no_duplicate(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-cancel-replay@example.com")
    product = _create_product(db, 300.0)
    _add_to_cart(client, token, product.id, qty=1)
    key = "cancel-key"

    first = _checkout(client, token, address_id, key=key)
    assert first.status_code in (200, 201), first.text
    oid = first.json()["id"]

    order = db.query(Order).filter(Order.id == oid).first()
    order_state_machine.transition(db, order, "cancelled", admin_id=None)
    db.commit()
    assert db.query(Order).filter(Order.id == oid).first().status == OrderStatusEnum.CANCELLED

    replay = _checkout(client, token, address_id, key=key)
    assert replay.status_code in (200, 201), replay.text
    assert replay.headers.get("Idempotency-Replayed") == "true"
    assert replay.json()["id"] == oid
    assert replay.json()["status"] == "cancelled"
    assert db.query(Order).filter(Order.user_id == uid).count() == 1


# ─── G. Loyalty exactly-once on replay ─────────────────────────────────────


def test_replay_creates_single_redeem_linked_to_order(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    _, token, address_id, uid = _setup_buyer(client, db, "g3-loy-replay@example.com")
    db.add(LoyaltyAccount(user_id=uid, current_points=100))
    db.commit()
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    key = "loyalty-key"
    first = _checkout(client, token, address_id, key=key, loyalty_points_to_redeem=50)
    assert first.status_code in (200, 201), first.text
    oid = first.json()["id"]

    second = _checkout(client, token, address_id, key=key, loyalty_points_to_redeem=50)
    assert second.status_code in (200, 201), second.text
    assert second.headers.get("Idempotency-Replayed") == "true"
    assert second.json()["id"] == oid

    txs = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.user_id == uid,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REDEEM,
        )
        .all()
    )
    assert len(txs) == 1
    assert txs[0].points == -50
    assert txs[0].order_id == oid
    account = db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == uid).first()
    assert account.current_points == 50
    assert account.lifetime_redeemed == 50