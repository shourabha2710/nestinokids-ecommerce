"""Phase 24.8 - Order transition API regression tests.

Root cause being locked in: PostgreSQL native enum ``orderstatusenum`` was
created by the baseline migration with UPPERCASE member *names* (matching how
SQLAlchemy persists Enum(OrderStatusEnum)), but a later migration extended it
with lowercase member *values*. Transitions writing 'OUT_FOR_DELIVERY' etc.
crashed with an unhandled DataError -> HTTP 500 on Postgres while SQLite tests
stayed green (VARCHAR storage). The fix migration adds the missing names;
these tests pin the HTTP contract around transitions.
"""
import itertools
from pathlib import Path

import pytest

from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models.models import (
    Category,
    Inventory,
    Order,
    OrderItem,
    OrderStatusEnum,
    OrderStatusHistory,
    OrderTrackingEvent,
    Product,
    ProductVariant,
    RoleEnum,
    User,
)


_seq = itertools.count(1)

CHAIN = ["confirmed", "packed", "shipped", "out_for_delivery", "delivered"]


@pytest.fixture(autouse=True)
def direct_checkout_on(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    from app.services.settings_service import get_settings

    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()


def _mk_user(db, email, role):
    u = User(
        email=email,
        first_name="Trans",
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


ADMIN_EMAIL = "trans-admin@example.com"


@pytest.fixture()
def placed_order(client, db):
    """Admin token + a real COD order created through /checkout."""
    _mk_user(db, ADMIN_EMAIL, RoleEnum.ADMIN)
    admin_token = _login(client, ADMIN_EMAIL)

    buyer_email = f"trans-buyer{next(_seq)}@example.com"
    _mk_user(db, buyer_email, RoleEnum.USER)
    token = _login(client, buyer_email)
    r = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Trans",
            "last_name": "Buyer",
            "phone": "8888889900",
            "email": buyer_email,
            "address_line_1": "9 Transition Ave",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert r.status_code == 201, r.text
    addr = r.json()["id"]

    n = next(_seq)
    cat = Category(name=f"TC{n}", slug=f"tc-{n}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    p = Product(
        category_id=cat.id,
        name=f"TransProd{n}",
        slug=f"transprod-{n}",
        description="",
        price=120.0,
        sku=f"TRA-{n}",
        quantity=10,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    pid = p.id
    db.add(
        Inventory(
            product_id=pid,
            total_quantity=30,
            available_quantity=30,
            reserved_quantity=0,
            low_stock_threshold=2,
        )
    )
    db.commit()

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    r = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": addr},
    )
    assert r.status_code in (200, 201), r.text
    body = r.json()
    oid = body["id"]
    assert body["status"] == "pending"
    return admin_token, oid


def _transition(client, admin_token, oid, new_status, remarks=None):
    body = {"new_status": new_status}
    if remarks is not None:
        body["remarks"] = remarks
    return client.post(
        f"/api/v1/admin/orders/{oid}/transition",
        headers=_auth(admin_token),
        json=body,
    )


# ─── Valid transitions ────────────────────────────────────────────────────────


def test_full_chain_shipped_to_out_for_delivery_succeeds(client, db, placed_order):
    admin_token, oid = placed_order
    for target in CHAIN:
        r = _transition(client, admin_token, oid, target)
        assert r.status_code == 200, f"{target}: {r.status_code} {r.text}"
        data = r.json()
        assert data["order_id"] == oid
        assert data["current_status"] == target
        # timeline returned by transition matches DB state
        labels = [entry["status"] for entry in data["timeline"]]
        assert labels == ["pending"] + CHAIN[: CHAIN.index(target) + 1]

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == OrderStatusEnum.DELIVERED
    assert order.shipped_at is not None
    assert order.delivered_at is not None


def test_transition_creates_correct_status_history(client, db, placed_order):
    admin_token, oid = placed_order
    assert (
        _transition(client, admin_token, oid, "confirmed", remarks="Verified stock")
    ).status_code == 200

    r = client.get(
        f"/api/v1/admin/orders/{oid}/status-history",
        headers=_auth(admin_token),
    )
    assert r.status_code == 200, r.text
    history = r.json()
    assert len(history) == 2
    initial, change = history
    assert initial["old_status"] is None
    assert initial["new_status"] == "pending"
    assert change["old_status"] == "pending"
    assert change["new_status"] == "confirmed"
    assert change["label"] == "Confirmed"
    assert change["remarks"] == "Verified stock"
    assert change["changed_by_admin_id"] is not None
    assert change["changed_by_user_id"] is None
    assert change["timestamp"] is not None


def test_customer_timeline_reflects_transitions(client, db, placed_order):
    admin_token, oid = placed_order
    for target in ("confirmed", "packed"):
        assert _transition(client, admin_token, oid, target).status_code == 200

    # customer token required - login the buyer again
    buyer = (
        db.query(User).filter(User.email.like("trans-buyer%")).first()
    )
    buyer_email = buyer.email
    token = _login(client, buyer_email)
    r = client.get(f"/api/v1/orders/{oid}/timeline", headers=_auth(token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["current_status"] == "packed"
    assert [e["status"] for e in data["timeline"]] == [
        "pending",
        "confirmed",
        "packed",
    ]
    assert data["allowed_transitions"] == ["shipped"]


# ─── Invalid transitions & atomicity ──────────────────────────────────────────


def test_invalid_transition_returns_400_without_partial_state(client, db, placed_order):
    admin_token, oid = placed_order

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

    # pending -> delivered is not allowed directly
    r = _transition(client, admin_token, oid, "delivered")
    assert r.status_code == 400, r.text
    assert "Cannot transition" in r.json()["detail"]

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == OrderStatusEnum.PENDING
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


def test_same_status_transition_rejected(client, placed_order):
    admin_token, oid = placed_order
    r = _transition(client, admin_token, oid, "pending")
    assert r.status_code == 400, r.text
    assert "already in" in r.json()["detail"]


def test_unknown_status_value_rejected_as_4xx(client, placed_order):
    admin_token, oid = placed_order
    r = _transition(client, admin_token, oid, "teleported")
    assert r.status_code == 400, r.text


# ─── Auth / RBAC ──────────────────────────────────────────────────────────────


def test_unauthenticated_transition_rejected(client, placed_order):
    _, oid = placed_order
    r = client.post(
        f"/api/v1/admin/orders/{oid}/transition",
        json={"new_status": "confirmed"},
    )
    assert r.status_code == 401, r.text


def test_customer_role_cannot_transition(client, db, placed_order):
    _, oid = placed_order
    buyer = (
        db.query(User).filter(User.email.like("trans-buyer%")).first()
    )
    token = _login(client, buyer.email)
    r = client.post(
        f"/api/v1/admin/orders/{oid}/transition",
        headers=_auth(token),
        json={"new_status": "confirmed"},
    )
    assert r.status_code == 403, r.text
    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == OrderStatusEnum.PENDING


def test_missing_order_returns_404(client, placed_order):
    admin_token, _ = placed_order
    r = _transition(client, admin_token, 999999, "confirmed")
    assert r.status_code == 404, r.text


# ─── RETURNED stock restoration ──────────────────────────────────────────────

RETURN_CHAIN = [
    "confirmed",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "return_requested",
    "returned",
]


def _mk_return_product(db, label, available=30):
    n = next(_seq)
    cat = Category(name=f"RC-{label}-{n}", slug=f"rc-{label}-{n}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    p = Product(
        category_id=cat.id,
        name=f"ReturnProd {label} {n}",
        slug=f"returnprod-{label}-{n}",
        description="",
        price=120.0,
        sku=f"RET-{label}-{n}",
        quantity=10,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    db.add(
        Inventory(
            product_id=p.id,
            total_quantity=available,
            available_quantity=available,
            reserved_quantity=0,
            low_stock_threshold=2,
        )
    )
    db.commit()
    return p


def _mk_return_variant(db, product_id, quantity=10):
    n = next(_seq)
    variant = ProductVariant(
        product_id=product_id,
        size="M",
        color=f"RET-{n}",
        quantity=quantity,
        sku=f"RETVAR-{n}",
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant.id


def _return_admin_token(client, db):
    _mk_user(db, ADMIN_EMAIL, RoleEnum.ADMIN)
    return _login(client, ADMIN_EMAIL)


def _return_buyer(client, db, email):
    """Create a buyer + shipping address; return (email, token, address_id)."""
    _mk_user(db, email, RoleEnum.USER)
    token = _login(client, email)
    r = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Return",
            "last_name": "Buyer",
            "phone": "8899889900",
            "email": email,
            "address_line_1": "41 Return Lane",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert r.status_code == 201, r.text
    return email, token, r.json()["id"]


def _return_checkout(client, token, address_id, *cart_items):
    """Add each (product_id, qty, variant_id_or_None) to cart, then checkout."""
    for product_id, qty, variant_id in cart_items:
        url = f"/api/v1/cart/{product_id}?quantity={qty}"
        if variant_id is not None:
            url += f"&variant_id={variant_id}"
        r = client.post(url, headers=_auth(token))
        assert r.status_code == 200, r.text
    r = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": address_id},
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def _drive_to_returned(client, admin_token, oid):
    for target in RETURN_CHAIN:
        r = _transition(client, admin_token, oid, target)
        assert r.status_code == 200, f"{target}: {r.status_code} {r.text}"


def _inv(db, product_id):
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    return inv.available_quantity, inv.reserved_quantity


def test_returned_restores_stock_for_non_variant_product(client, db):
    admin_token = _return_admin_token(client, db)
    _, token, addr = _return_buyer(client, db, f"ret-nv{next(_seq)}@example.com")
    p = _mk_return_product(db, "nv")
    pid = p.id  # capture before HTTP calls detach the instance
    oid = _return_checkout(client, token, addr, (pid, 2, None))

    assert _inv(db, pid) == (28, 2)

    _drive_to_returned(client, admin_token, oid)

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == OrderStatusEnum.RETURNED
    assert _inv(db, pid) == (30, 0)


def test_returned_restores_stock_for_variant_product(client, db):
    admin_token = _return_admin_token(client, db)
    _, token, addr = _return_buyer(client, db, f"ret-var{next(_seq)}@example.com")
    p = _mk_return_product(db, "var")
    pid = p.id  # capture before HTTP calls detach the instance
    vid = _mk_return_variant(db, pid, quantity=10)
    oid = _return_checkout(client, token, addr, (pid, 3, vid))

    assert _inv(db, pid) == (27, 3)
    assert db.query(ProductVariant).filter(ProductVariant.id == vid).first().quantity == 7

    _drive_to_returned(client, admin_token, oid)

    assert _inv(db, pid) == (30, 0)
    assert db.query(ProductVariant).filter(ProductVariant.id == vid).first().quantity == 10


def test_returned_restores_stock_for_multi_item_order(client, db):
    admin_token = _return_admin_token(client, db)
    _, token, addr = _return_buyer(client, db, f"ret-multi{next(_seq)}@example.com")
    p1 = _mk_return_product(db, "m1")
    p2 = _mk_return_product(db, "m2")
    p1id = p1.id  # capture before HTTP calls detach the instances
    p2id = p2.id
    oid = _return_checkout(client, token, addr, (p1id, 2, None), (p2id, 3, None))

    items = db.query(OrderItem).filter(OrderItem.order_id == oid).all()
    assert len(items) == 2
    assert {it.product_id for it in items} == {p1id, p2id}
    assert {it.quantity for it in items} == {2, 3}

    assert _inv(db, p1id) == (28, 2)
    assert _inv(db, p2id) == (27, 3)

    _drive_to_returned(client, admin_token, oid)

    assert _inv(db, p1id) == (30, 0)
    assert _inv(db, p2id) == (30, 0)


def test_returned_twice_rejected_and_stock_not_restored_twice(client, db):
    admin_token = _return_admin_token(client, db)
    _, token, addr = _return_buyer(client, db, f"ret-2x{next(_seq)}@example.com")
    p = _mk_return_product(db, "2x")
    pid = p.id  # capture before HTTP calls detach the instance
    oid = _return_checkout(client, token, addr, (pid, 1, None))
    _drive_to_returned(client, admin_token, oid)
    assert _inv(db, pid) == (30, 0)

    r = _transition(client, admin_token, oid, "returned")
    assert r.status_code == 400, r.text
    assert "already in" in r.json()["detail"]

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == OrderStatusEnum.RETURNED
    assert _inv(db, pid) == (30, 0)


def test_get_endpoints_do_not_mutate_stock_after_returned(client, db):
    admin_token = _return_admin_token(client, db)
    _, token, addr = _return_buyer(client, db, f"ret-get{next(_seq)}@example.com")
    p = _mk_return_product(db, "get")
    pid = p.id  # capture before HTTP calls detach the instance
    oid = _return_checkout(client, token, addr, (pid, 2, None))
    _drive_to_returned(client, admin_token, oid)
    assert _inv(db, pid) == (30, 0)

    r = client.get("/api/v1/admin/orders", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    r = client.get(f"/api/v1/admin/orders/{oid}", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    r = client.get(
        f"/api/v1/admin/orders/{oid}/status-history", headers=_auth(admin_token)
    )
    assert r.status_code == 200, r.text
    r = client.get(f"/api/v1/orders/{oid}/timeline", headers=_auth(token))
    assert r.status_code == 200, r.text

    assert _inv(db, pid) == (30, 0)


def test_invalid_transition_to_returned_does_not_mutate_stock(client, db):
    admin_token = _return_admin_token(client, db)
    _, token, addr = _return_buyer(client, db, f"ret-inv{next(_seq)}@example.com")
    p = _mk_return_product(db, "inv")
    pid = p.id  # capture before HTTP calls detach the instance
    oid = _return_checkout(client, token, addr, (pid, 1, None))
    assert _inv(db, pid) == (29, 1)

    # pending -> returned is not a valid transition
    r = _transition(client, admin_token, oid, "returned")
    assert r.status_code == 400, r.text
    assert "Cannot transition" in r.json()["detail"]

    order = db.query(Order).filter(Order.id == oid).first()
    assert order.status == OrderStatusEnum.PENDING
    assert _inv(db, pid) == (29, 1)


# ─── Enum drift tripwire ──────────────────────────────────────────────────────
# If this test fails, a new OrderStatusEnum member exists that neither the
# squashed baseline nor the enum-repair migration provides to PostgreSQL.

BASELINE_ENUM_NAMES = {
    "PENDING",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
}


def test_postgres_enum_names_cover_all_order_statuses():
    fix_migration = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "2026_08_23_0000-a7f3e9d1c2b4_fix_order_status_enum_missing_names.py"
    )
    assert fix_migration.exists(), "enum repair migration is missing"

    namespace: dict = {}
    exec(compile(fix_migration.read_text(encoding="utf-8"), str(fix_migration), "exec"), namespace)
    missing_names = set(namespace["MISSING_ENUM_NAMES"])

    all_names = {member.name for member in OrderStatusEnum}
    covered = BASELINE_ENUM_NAMES | missing_names
    assert all_names <= covered, (
        f"OrderStatusEnum members missing from PostgreSQL enum migrations: "
        f"{sorted(all_names - covered)}"
    )
