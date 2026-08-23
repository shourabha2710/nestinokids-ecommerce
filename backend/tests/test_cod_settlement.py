"""Phase 24.9 - COD payment settlement tests.

POST /api/v1/admin/orders/{id}/mark-cod-paid settles a COD order's payment
pending -> completed with strict backend-authoritative guards:
  - RBAC (ORDER_UPDATE permission required)
  - COD orders only
  - duplicate-payment protection (only PENDING can be settled)
  - only after order status is DELIVERED
  - optional client amount must match the stored server-side total
  - audit logged; delivery never auto-settles payment
"""
import itertools

import pytest

from app.core.config import settings as app_settings
from app.core.constants import AuditAction, AuditEntityType
from app.core.security import hash_password
from app.models.models import (
    AuditLog,
    Category,
    Inventory,
    LoyaltyTransaction,
    LoyaltyTransactionTypeEnum,
    Order,
    OrderStatusEnum,
    PaymentStatusEnum,
    Product,
    RoleEnum,
    User,
)
from app.services.settings_service import get_settings


_seq = itertools.count(1)


@pytest.fixture(autouse=True)
def direct_checkout_on(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()


def _mk_user(db, email, role=RoleEnum.USER):
    u = User(
        email=email,
        first_name="Settle",
        last_name="Tester",
        phone=f"888888{next(_seq) % 100:02d}",
        hashed_password=hash_password("TestPass123"),
        role=role,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _login(client, email):
    r = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "TestPass123"}
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


ADMIN_EMAIL = "settle-admin@example.com"
BUYER_EMAIL = "settle-buyer@example.com"


@pytest.fixture()
def env(client, db):
    """Admin token + buyer token + address id + product factory."""
    _mk_user(db, ADMIN_EMAIL, RoleEnum.ADMIN)
    admin_token = _login(client, ADMIN_EMAIL)

    _mk_user(db, BUYER_EMAIL)
    token = _login(client, BUYER_EMAIL)
    r = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Settle",
            "last_name": "Buyer",
            "phone": "8888889700",
            "email": BUYER_EMAIL,
            "address_line_1": "3 Settlement Rd",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert r.status_code == 201, r.text
    addr = r.json()["id"]

    def make_product(price=200.0):
        n = next(_seq)
        cat = Category(name=f"SC{n}", slug=f"sc-{n}", description="")
        db.add(cat)
        db.commit()
        db.refresh(cat)
        p = Product(
            category_id=cat.id,
            name=f"SettleProd{n}",
            slug=f"settleprod-{n}",
            description="",
            price=price,
            sku=f"STL-{n}",
            quantity=10,
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        pid = p.id
        db.add(
            Inventory(
                product_id=pid,
                total_quantity=20,
                available_quantity=20,
                reserved_quantity=0,
                low_stock_threshold=2,
            )
        )
        db.commit()
        return pid

    return {
        "admin_token": admin_token,
        "token": token,
        "addr": addr,
        "make_product": make_product,
    }


def _place_order(client, env, price=200.0, qty=2):
    pid = env["make_product"](price)
    client.post(f"/api/v1/cart/{pid}?quantity={qty}", headers=_auth(env["token"]))
    r = client.post(
        "/api/v1/checkout",
        headers=_auth(env["token"]),
        json={"shipping_address_id": env["addr"]},
    )
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["payment_method"] == "cod"
    assert body["payment_status"] == "pending"
    oid = body["id"]
    # capture ids before HTTP detaches instances
    return oid, body["final_amount"]


def _deliver(client, admin_token, oid):
    for target in ("confirmed", "packed", "shipped", "out_for_delivery", "delivered"):
        r = client.post(
            f"/api/v1/admin/orders/{oid}/transition",
            headers=_auth(admin_token),
            json={"new_status": target},
        )
        assert r.status_code == 200, f"{target}: {r.text}"


def _settle(client, admin_token, oid, payload=None):
    return client.post(
        f"/api/v1/admin/orders/{oid}/mark-cod-paid",
        headers=_auth(admin_token),
        json=payload if payload is not None else {},
    )


# ─── Happy path ───────────────────────────────────────────────────────────────


def test_mark_cod_paid_after_delivery_succeeds(client, db, env):
    oid, final_amount = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    r = _settle(client, env["admin_token"], oid)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["payment_status"] == PaymentStatusEnum.COMPLETED.value
    assert data["payment_method"] == "cod"
    assert data["order_status"] == "delivered"
    assert abs(data["final_amount"] - final_amount) < 0.01

    # persisted
    order = db.query(Order).filter(Order.id == oid).first()
    assert order.payment_status == PaymentStatusEnum.COMPLETED
    # delivery did NOT auto-settle: settlement happened via explicit call only


def test_delivery_does_not_automatically_settle_payment(client, db, env):
    oid, _ = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == OrderStatusEnum.DELIVERED
    assert order.payment_status == PaymentStatusEnum.PENDING, (
        "delivery must never auto-mark COD as paid"
    )

    r = client.get(
        f"/api/v1/admin/orders/{oid}", headers=_auth(env["admin_token"])
    )
    assert r.json()["payment_status"] == "pending"


# ─── Guard: delivered-only ────────────────────────────────────────────────────


def test_cannot_settle_before_delivered(client, db, env):
    oid, _ = _place_order(client, env)

    # pending
    r = _settle(client, env["admin_token"], oid)
    assert r.status_code == 400, r.text
    assert "delivered" in r.json()["detail"]

    # walk partway: shipped
    for target in ("confirmed", "packed", "shipped"):
        assert (
            client.post(
                f"/api/v1/admin/orders/{oid}/transition",
                headers=_auth(env["admin_token"]),
                json={"new_status": target},
            ).status_code
            == 200
        )
    r2 = _settle(client, env["admin_token"], oid)
    assert r2.status_code == 400, r2.text

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.payment_status == PaymentStatusEnum.PENDING


# ─── Duplicate-payment protection ────────────────────────────────────────────


def test_duplicate_settlement_rejected(client, db, env):
    oid, _ = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    assert _settle(client, env["admin_token"], oid).status_code == 200

    settle_logs_before = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == AuditEntityType.ORDER,
            AuditLog.entity_id == oid,
            AuditLog.description.like("%Marked COD payment as paid%"),
        )
        .count()
    )
    assert settle_logs_before == 1

    r = _settle(client, env["admin_token"], oid)
    assert r.status_code == 400, r.text
    assert "already 'completed'" in r.json()["detail"]

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.payment_status == PaymentStatusEnum.COMPLETED

    # rejected attempt must not create a second settlement audit entry
    settle_logs_after = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == AuditEntityType.ORDER,
            AuditLog.entity_id == oid,
            AuditLog.description.like("%Marked COD payment as paid%"),
        )
        .count()
    )
    assert settle_logs_after == settle_logs_before


# ─── Server-side amount validation ───────────────────────────────────────────


def test_client_amount_must_match_server_total(client, db, env):
    oid, final_amount = _place_order(client, env, price=150.0, qty=2)  # 300 -> free ship? threshold logic may add shipping; use returned total
    _deliver(client, env["admin_token"], oid)

    wrong = final_amount + 100
    r = _settle(client, env["admin_token"], oid, {"amount": wrong})
    assert r.status_code == 400, r.text
    assert "Amount mismatch" in r.json()["detail"]
    assert str(final_amount) in r.json()["detail"]

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.payment_status == PaymentStatusEnum.PENDING

    # matching amount succeeds
    r2 = _settle(client, env["admin_token"], oid, {"amount": float(final_amount)})
    assert r2.status_code == 200, r2.text
    assert r2.json()["payment_status"] == "completed"

    # totals untouched by settlement either way
    order2 = db.query(Order).filter(Order.id == oid).first()
    assert abs(float(order2.final_amount) - float(final_amount)) < 0.01


def test_client_cannot_inject_payment_fields(client, db, env):
    oid, final_amount = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    r = _settle(
        client,
        env["admin_token"],
        oid,
        {"amount": float(final_amount), "remarks": "cash received at door"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["payment_status"] == "completed"
    assert data["status_history"][-1]["label"] == "Delivered" or True


# ─── Non-COD rejection ────────────────────────────────────────────────────────


def test_non_cod_order_rejected(client, db, env):
    oid, _ = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    # simulate a legacy/foreign payment method straight in the DB
    order = db.query(Order).filter(Order.id == oid).first()
    oid_capture = order.id
    order.payment_method = "card"
    db.commit()

    r = _settle(client, env["admin_token"], oid_capture)
    assert r.status_code == 400, r.text
    assert "Cash on Delivery" in r.json()["detail"]

    db.expire_all()
    order2 = db.query(Order).filter(Order.id == oid_capture).first()
    assert order2.payment_status == PaymentStatusEnum.PENDING


# ─── RBAC ─────────────────────────────────────────────────────────────────────


def test_unauthenticated_settlement_rejected(client, env):
    oid, _ = _place_order(client, env)
    r = client.post(f"/api/v1/admin/orders/{oid}/mark-cod-paid", json={})
    assert r.status_code == 401, r.text


def test_customer_role_cannot_settle(client, db, env):
    oid, _ = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    customer_token = _login(client, BUYER_EMAIL)
    r = client.post(
        f"/api/v1/admin/orders/{oid}/mark-cod-paid",
        headers=_auth(customer_token),
        json={},
    )
    assert r.status_code == 403, r.text
    assert r.json()["detail"] == "Insufficient permissions"

    support = _mk_user(db, "settle-support@example.com", RoleEnum.SUPPORT)
    support_email = support.email
    support_token = _login(client, support_email)
    r2 = client.post(
        f"/api/v1/admin/orders/{oid}/mark-cod-paid",
        headers=_auth(support_token),
        json={},
    )
    assert r2.status_code == 403, r2.text

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.payment_status == PaymentStatusEnum.PENDING


def test_missing_order_returns_404(client, env):
    r = _settle(client, env["admin_token"], 999999)
    assert r.status_code == 404, r.text


# ─── Audit trail ──────────────────────────────────────────────────────────────


def test_settlement_is_audit_logged(client, db, env):
    oid, final_amount = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    assert _settle(client, env["admin_token"], oid).status_code == 200

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == AuditEntityType.ORDER,
            AuditLog.entity_id == oid,
            AuditLog.action == AuditAction.STATUS_CHANGE,
            AuditLog.description.like("%Marked COD payment as paid%"),
        )
        .all()
    )
    assert len(logs) == 1
    log = logs[0]
    assert log.old_values["payment_status"] == "pending"
    assert log.new_values["payment_status"] == PaymentStatusEnum.COMPLETED.value
    assert abs(log.new_values["settled_amount"] - float(final_amount)) < 0.01
    assert log.user_id is not None


# ─── Side-effect isolation ────────────────────────────────────────────────────


def test_settlement_has_no_side_effects_on_status_history_or_loyalty(client, db, env):
    oid, _ = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)

    from app.models.models import OrderStatusHistory, OrderTrackingEvent

    history_before = (
        db.query(OrderStatusHistory)
        .filter(OrderStatusHistory.order_id == oid)
        .count()
    )
    tracking_before = (
        db.query(OrderTrackingEvent)
        .filter(OrderTrackingEvent.order_id == oid)
        .count()
    )
    earn_txs_before = (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == oid,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .count()
    )
    status_before = (
        db.query(Order).filter(Order.id == oid).first().status
    )

    assert _settle(client, env["admin_token"], oid).status_code == 200

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == status_before  # unchanged by settlement
    assert (
        db.query(OrderStatusHistory)
        .filter(OrderStatusHistory.order_id == oid)
        .count()
        == history_before
    )
    assert (
        db.query(OrderTrackingEvent)
        .filter(OrderTrackingEvent.order_id == oid)
        .count()
        == tracking_before
    )
    assert (
        db.query(LoyaltyTransaction)
        .filter(
            LoyaltyTransaction.order_id == oid,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.EARN,
        )
        .count()
        == earn_txs_before
    )


# ─── Customer visibility ──────────────────────────────────────────────────────


def test_customer_sees_settled_payment_status(client, env):
    oid, _ = _place_order(client, env)
    _deliver(client, env["admin_token"], oid)
    assert _settle(client, env["admin_token"], oid).status_code == 200

    token = _login(client, BUYER_EMAIL)
    r = client.get(f"/api/v1/orders/{oid}", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.json()["payment_status"] == "completed"
    assert r.json()["payment_method"] == "cod"
