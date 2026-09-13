"""Phase 24.7 - Loyalty redemption atomicity tests (G2).

Covers the exact-once redemption contract:
  - calculation and cart preview are side-effect free (pure quote)
  - redemption is applied exactly once, AFTER the Order row exists, and the
    REDEEM transaction is linked to the final order_id (never NULL)
  - insufficient points / order-cap clamp consistently and never go negative
  - a failed order fully rolls back the redemption + inventory + order
  - cancellation restores redeemed points exactly once (idempotent)
  - delivering after redemption awards earned points exactly once
"""
import itertools
from typing import Optional
from uuid import uuid4
import pytest

from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models.models import (
    Category,
    Inventory,
    LoyaltyAccount,
    LoyaltyTransaction,
    LoyaltyTransactionTypeEnum,
    Order,
    Product,
    ProductVariant,
    RoleEnum,
    User,
)
from app.services.loyalty_service import loyalty_service
from app.services.order_calculation_service import calculate_for_order_creation
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
        first_name="Loy",
        last_name="Tester",
        phone=f"77777777{suffix:02d}",
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


def _make_account(db, user_id, points):
    db.add(LoyaltyAccount(user_id=user_id, current_points=points))
    db.commit()


def _create_product(db, price):
    n = next(_seq)
    name = f"LoyProd{n}"
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
        sku=f"LOY-{n}",
        quantity=100,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    pid = product.id
    db.add(Inventory(
        product_id=pid,
        total_quantity=50,
        available_quantity=50,
        reserved_quantity=0,
        low_stock_threshold=5,
    ))
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
    return variant.id


def _setup_buyer(client, db, email, suffix=1):
    user = _create_user(db, email, suffix=suffix)
    token = _login_token(client, email)
    resp = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Loy",
            "last_name": "Buyer",
            "phone": f"77777777{suffix:02d}",
            "email": email,
            "address_line_1": "9 Loyalty Lane",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    address_id = resp.json()["id"]
    return user, token, address_id, user.id


def _add_to_cart(client, token, product_id, qty=1, variant_id=None):
    url = f"/api/v1/cart/{product_id}?quantity={qty}"
    if variant_id is not None:
        url += f"&variant_id={variant_id}"
    resp = client.post(url, headers=_auth(token))
    assert resp.status_code == 200, resp.text


def _checkout(client, token, address_id, **extra):
    body = {"shipping_address_id": address_id}
    body.update(extra)
    headers = {**_auth(token), "Idempotency-Key": str(uuid4())}
    return client.post("/api/v1/checkout", headers=headers, json=body)


def _enable_direct_checkout(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()


def _user_tx(db, user_id):
    return (
        db.query(LoyaltyTransaction)
        .filter(LoyaltyTransaction.user_id == user_id)
        .all()
    )


def _account(db, user_id):
    return db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id).first()


# ─── A. Calculation & preview are pure (no mutation) ───────────────────────


def test_calculate_for_order_creation_is_pure(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-pure@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 400.0)
    pid = product.id

    calc = calculate_for_order_creation(
        db,
        cart_items=[{"product_id": pid, "category_id": product.category_id,
                     "quantity": 1, "price": 400.0, "total": 400.0}],
        user_id=uid,
        loyalty_points_to_redeem=50,
    )
    assert calc.loyalty_discount == 50.0
    assert calc.loyalty_points_redeemed == 50

    assert _user_tx(db, uid) == []
    account = _account(db, uid)
    assert account.current_points == 100
    assert account.lifetime_redeemed == 0


def test_cart_calculate_totals_preview_is_pure(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-preview@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = client.post(
        "/api/v1/cart/calculate-totals",
        headers=_auth(token),
        json={"loyalty_points_to_redeem": 50},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["loyalty_discount"] == 50.0
    assert body["loyalty_points_redeemed"] == 50

    assert _user_tx(db, uid) == []
    account = _account(db, uid)
    assert account.current_points == 100
    assert account.lifetime_redeemed == 0


# ─── B. Exactly once + linked to the final order_id ────────────────────────


def test_checkout_redemption_linked_to_order_exactly_once(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-co@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(client, token, address_id, loyalty_points_to_redeem=50)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["discount_amount"] == 50.0
    assert order["final_amount"] == 400.0  # 400 - 50 + 50 shipping

    db_order = db.query(Order).filter(Order.user_id == uid).one()
    oid = db_order.id
    assert oid == order["id"]

    txs = _user_tx(db, uid)
    assert len(txs) == 1
    tx = txs[0]
    assert tx.transaction_type == LoyaltyTransactionTypeEnum.REDEEM
    assert tx.order_id == oid          # linked, never NULL
    assert tx.reference_id == oid
    assert tx.points == -50
    assert tx.balance_after == 50

    account = _account(db, uid)
    assert account.current_points == 50
    assert account.lifetime_redeemed == 50


def test_orders_endpoint_redemption_linked_to_order_exactly_once(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-orders@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 300.0)
    pid = product.id

    resp = client.post(
        "/api/v1/orders",
        headers={**_auth(token), "Idempotency-Key": str(uuid4())},
        json={
            "items": [{"product_id": pid, "quantity": 1}],
            "shipping_address_id": address_id,
            "payment_method": "cod",
            "loyalty_points_to_redeem": 50,
        },
    )
    assert resp.status_code in (200, 201), resp.text
    db_order = db.query(Order).filter(Order.user_id == uid).one()
    oid = db_order.id

    txs = _user_tx(db, uid)
    assert len(txs) == 1
    assert txs[0].transaction_type == LoyaltyTransactionTypeEnum.REDEEM
    assert txs[0].order_id == oid
    assert txs[0].points == -50
    assert _account(db, uid).current_points == 50

    # No REDEEM was ever written without an order_id
    orphan = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REDEEM,
            LoyaltyTransaction.order_id.is_(None),
        )
        .count()
    )
    assert orphan == 0


def test_apply_redemption_is_idempotent_per_order(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-idem@example.com")
    _make_account(db, uid, 100)

    first = loyalty_service.apply_redemption(db, uid, 9001, 50, 400.0)
    second = loyalty_service.apply_redemption(db, uid, 9001, 50, 400.0)
    assert first == second == (50, 50.0)

    txs = _user_tx(db, uid)
    assert len(txs) == 1
    assert txs[0].points == -50
    assert _account(db, uid).current_points == 50


# ─── C. Clamping (insufficient / over-cap), never negative ─────────────────


def test_insufficient_points_clamped_and_never_negative(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-insuf@example.com")
    _make_account(db, uid, 30)
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(client, token, address_id, loyalty_points_to_redeem=50)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["discount_amount"] == 30.0
    assert order["final_amount"] == 420.0  # 400 - 30 + 50

    txs = _user_tx(db, uid)
    assert len(txs) == 1
    assert txs[0].points == -30
    assert txs[0].balance_after == 0

    account = _account(db, uid)
    assert account.current_points == 0
    assert account.lifetime_redeemed == 30


def test_zero_balance_no_redemption_written(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-zero@example.com")
    _make_account(db, uid, 0)
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(client, token, address_id, loyalty_points_to_redeem=50)
    assert resp.status_code in (200, 201), resp.text
    assert resp.json()["discount_amount"] == 0.0
    assert _user_tx(db, uid) == []
    assert _account(db, uid).current_points == 0


def test_redemption_capped_by_order_value(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-cap@example.com")
    _make_account(db, uid, 200)
    product = _create_product(db, 100.0)
    _add_to_cart(client, token, product.id, qty=1)  # max = 100*50% = 50

    resp = _checkout(client, token, address_id, loyalty_points_to_redeem=100)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["discount_amount"] == 50.0

    txs = _user_tx(db, uid)
    assert len(txs) == 1
    assert txs[0].points == -50
    assert _account(db, uid).current_points == 150


# ─── D. Atomic rollback: failed order leaves zero footprint ────────────────


def test_variant_stock_failure_rolls_back_redemption(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-rollback@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 400.0)
    pid = product.id
    vid = _create_variant(db, pid, quantity=1)
    _add_to_cart(client, token, pid, qty=2, variant_id=vid)

    resp = _checkout(client, token, address_id, loyalty_points_to_redeem=50)
    assert resp.status_code == 400
    assert "Insufficient variant stock" in resp.json()["detail"]

    assert db.query(Order).filter(Order.user_id == uid).count() == 0
    assert _user_tx(db, uid) == []
    account = _account(db, uid)
    assert account.current_points == 100
    assert account.lifetime_redeemed == 0

    inv = db.query(Inventory).filter(Inventory.product_id == pid).first()
    assert inv.available_quantity == 50
    assert inv.reserved_quantity == 0
    variant = db.query(ProductVariant).filter(ProductVariant.id == vid).first()
    assert variant.quantity == 1

    # Cart survives the rollback (cart clear is part of the same transaction)
    cart = client.get("/api/v1/cart", headers=_auth(token))
    assert cart.status_code == 200
    assert len(cart.json()) == 1


# ─── E. Cancellation restores redeemed points exactly once ─────────────────


def test_cancel_restores_redeemed_points_exactly_once(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-cancel@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(client, token, address_id, loyalty_points_to_redeem=50)
    assert resp.status_code in (200, 201), resp.text
    order = db.query(Order).filter(Order.user_id == uid).one()
    assert _account(db, uid).current_points == 50

    order_state_machine.transition(db, order, "cancelled", admin_id=None)
    db.commit()

    account = _account(db, uid)
    assert account.current_points == 100
    assert account.lifetime_redeemed == 0

    refunds = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == order.id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REFUND,
        )
        .all()
    )
    assert len(refunds) == 1
    assert refunds[0].points == 50
    assert refunds[0].balance_after == 100

    # Calling the refund hook again must not double-restore
    points, balance = loyalty_service.refund_redeemed_points(db, uid, order.id)
    db.commit()
    assert (points, balance) == (50, 100)
    refunds_after = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == order.id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REFUND,
        )
        .all()
    )
    assert len(refunds_after) == 1
    assert _account(db, uid).current_points == 100


def test_cancel_without_redemption_creates_no_refund(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-cancel0@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    order = db.query(Order).filter(Order.user_id == uid).one()

    order_state_machine.transition(db, order, "cancelled", admin_id=None)
    db.commit()

    refunds = (
        db.query(LoyaltyTransaction)
        .filter(LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REFUND)
        .all()
    )
    assert refunds == []
    assert _account(db, uid).current_points == 100


# ─── F. Combined: redemption now, earning at delivery ──────────────────────


def test_delivered_earns_points_after_redemption(client, db, monkeypatch):
    _enable_direct_checkout(db, monkeypatch)
    user, token, address_id, uid = _setup_buyer(client, db, "loy-combo@example.com")
    _make_account(db, uid, 100)
    product = _create_product(db, 400.0)
    _add_to_cart(client, token, product.id, qty=1)

    resp = _checkout(client, token, address_id, loyalty_points_to_redeem=50)
    assert resp.status_code in (200, 201), resp.text
    final_amount = resp.json()["final_amount"]  # 400

    order = db.query(Order).filter(Order.user_id == uid).one()
    oid = order.id
    for next_status in ("confirmed", "packed", "shipped", "out_for_delivery", "delivered"):
        order_state_machine.transition(db, order, next_status, admin_id=None)
    db.commit()

    txs = _user_tx(db, uid)
    types = sorted(tx.transaction_type.value for tx in txs)
    assert types == sorted([LoyaltyTransactionTypeEnum.REDEEM.value,
                            LoyaltyTransactionTypeEnum.EARN.value])

    redeem = next(t for t in txs if t.transaction_type == LoyaltyTransactionTypeEnum.REDEEM)
    earn = next(t for t in txs if t.transaction_type == LoyaltyTransactionTypeEnum.EARN)
    assert redeem.order_id == oid
    assert redeem.points == -50
    expected_earn = int(final_amount * app_settings.POINTS_PER_CURRENCY)
    assert earn.order_id == oid
    assert earn.points == expected_earn == 40

    account = _account(db, uid)
    assert account.current_points == 90  # 100 - 50 + 40
    assert account.lifetime_earned == 40
    assert account.lifetime_redeemed == 50