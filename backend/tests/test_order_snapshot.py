"""G1 - Order shipping address snapshot tests.

Pins the immutable address snapshot contract:

  - checkout / POST /orders capture a server-side snapshot of the Address
  - later address edits/deletes never mutate the stored snapshot
  - customer and admin order responses expose the snapshot (when present)
  - NULL snapshots (historical orders) remain readable
  - ownership is enforced; rollback never leaves a partial order
"""
import itertools
from uuid import uuid4

import pytest

from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models.models import (
    Category,
    Inventory,
    Order,
    Product,
    ProductVariant,
    RoleEnum,
    User,
)
from app.services.settings_service import get_settings


_seq = itertools.count(1)


@pytest.fixture(autouse=True)
def direct_checkout_on(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()


def _create_user(db, email, role=RoleEnum.USER):
    n = next(_seq)
    user = User(
        email=email,
        first_name="Snap",
        last_name="Tester",
        phone=f"877777{9900 - n % 100}",
        hashed_password=hash_password("TestPass123"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client, email):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "TestPass123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_address(client, token, email, line_1="2 Checkout Lane"):
    resp = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Snap",
            "last_name": "Buyer",
            "phone": "8888888801",
            "email": email,
            "address_line_1": line_1,
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_product(db, price=120.0):
    n = next(_seq)
    cat = Category(name=f"SC{n}", slug=f"sc-{n}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    product = Product(
        category_id=cat.id,
        name=f"SnapProd{n}",
        slug=f"snapprod-{n}",
        description="",
        price=price,
        sku=f"SNA-{n}",
        quantity=20,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    pid = product.id
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
    return product


def _checkout(client, token, address_id, **extra):
    body = {"shipping_address_id": address_id}
    body.update(extra)
    headers = {**_auth(token), "Idempotency-Key": str(uuid4())}
    return client.post("/api/v1/checkout", headers=headers, json=body)


# ─── Snapshot is stored at checkout ───────────────────────────────────────────


def test_checkout_stores_shipping_address_snapshot(client, db):
    user = _create_user(db, "snap-store@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    resp = _checkout(client, token, addr["id"])
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()

    assert body["shipping_address"] is not None
    row = db.query(Order).filter(Order.user_id == user.id).first()
    assert row.shipping_address_snapshot is not None
    assert row.shipping_address_id == addr["id"]


def test_snapshot_contains_correct_address_fields(client, db):
    user = _create_user(db, "snap-fields@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email, line_1="17 Snapshot Ave")
    product = _create_product(db)
    pid = product.id

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    resp = _checkout(client, token, addr["id"])
    body = resp.json()

    snap = body["shipping_address"]
    expected = {
        "first_name": "Snap",
        "last_name": "Buyer",
        "phone": "8888888801",
        "email": user.email,
        "address_line_1": "17 Snapshot Ave",
        "address_line_2": None,
        "city": "New Delhi",
        "state": "Delhi",
        "postal_code": "110001",
        "country": "India",
        "address_type": "residential",
    }
    for key, value in expected.items():
        assert snap.get(key) == value, f"snapshot[{key}] = {snap.get(key)!r}, expected {value!r}"


def test_create_order_endpoint_also_snapshots(client, db):
    """POST /orders (separate order path) must snapshot the address too."""
    user = _create_user(db, "snap-direct@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id

    resp = client.post(
        "/api/v1/orders",
        headers={**_auth(token), "Idempotency-Key": str(uuid4())},
        json={
            "shipping_address_id": addr["id"],
            "items": [{"product_id": pid, "quantity": 2}],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["shipping_address"] is not None
    assert body["shipping_address"]["address_line_1"] == "2 Checkout Lane"
    row = db.query(Order).filter(Order.user_id == user.id).first()
    assert row.shipping_address_snapshot is not None


# ─── Immutability: edits + deletes never alter the snapshot ───────────────────


def test_editing_address_does_not_change_order_snapshot(client, db):
    user = _create_user(db, "snap-edit@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    created = _checkout(client, token, addr["id"])
    order_id = created.json()["id"]
    before = created.json()["shipping_address"]["address_line_1"]

    # Customer edits the original address after placing the order.
    edit = client.put(
        f"/api/v1/addresses/{addr['id']}",
        headers=_auth(token),
        json={
            "first_name": "Snap",
            "last_name": "Buyer",
            "phone": "8888888801",
            "email": user.email,
            "address_line_1": "999 Edited Road",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert edit.status_code in (200, 201), edit.text

    detail = client.get(f"/api/v1/orders/{order_id}", headers=_auth(token))
    after = detail.json()["shipping_address"]["address_line_1"]

    assert before == "2 Checkout Lane"
    assert after == before
    assert after != "999 Edited Road"


def test_deleting_address_does_not_remove_snapshot(client, db):
    user = _create_user(db, "snap-delete@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    created = _checkout(client, token, addr["id"])
    order_id = created.json()["id"]
    snap = created.json()["shipping_address"]

    resp = client.delete(f"/api/v1/addresses/{addr['id']}", headers=_auth(token))
    assert resp.status_code == 200, resp.text

    detail = client.get(f"/api/v1/orders/{order_id}", headers=_auth(token))
    assert detail.status_code == 200
    assert detail.json()["shipping_address"] == snap


# ─── API responses expose the snapshot ────────────────────────────────────────


def test_customer_order_list_and_detail_return_snapshot(client, db):
    user = _create_user(db, "snap-list@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    created = _checkout(client, token, addr["id"])
    order_id = created.json()["id"]

    listing = client.get("/api/v1/orders", headers=_auth(token))
    assert listing.status_code == 200
    assert listing.json()[0]["shipping_address"]["address_line_1"] == "2 Checkout Lane"

    detail = client.get(f"/api/v1/orders/{order_id}", headers=_auth(token))
    assert detail.status_code == 200
    assert detail.json()["shipping_address"] is not None


def test_admin_order_response_returns_shipping_address(client, db):
    admin = _create_user(db, "snap-admin@example.com", role=RoleEnum.ADMIN)
    admin_token = _login(client, admin.email)

    user = _create_user(db, "snap-buyer@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    created = _checkout(client, token, addr["id"])
    order_id = created.json()["id"]

    detail = client.get(
        f"/api/v1/admin/orders/{order_id}", headers=_auth(admin_token)
    )
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["shipping_address"] is not None
    assert "2 Checkout Lane" in body["shipping_address"]
    assert "Snap Buyer" in body["shipping_address"]

    listing = client.get("/api/v1/admin/orders", headers=_auth(admin_token))
    assert listing.status_code == 200
    listed = next(o for o in listing.json() if o["id"] == order_id)
    assert "2 Checkout Lane" in listed["shipping_address"]


# ─── Ownership + rollback ─────────────────────────────────────────────────────


def test_other_users_address_rejected_leaves_no_order(client, db):
    owner = _create_user(db, "snap-owner@example.com")
    owner_token = _login(client, owner.email)
    owner_addr = _create_address(client, owner_token, owner.email)

    attacker = _create_user(db, "snap-attacker@example.com")
    attacker_token = _login(client, attacker.email)
    product = _create_product(db)
    client.post(f"/api/v1/cart/{product.id}?quantity=1", headers=_auth(attacker_token))

    resp = _checkout(client, attacker_token, owner_addr["id"])
    assert resp.status_code == 404
    assert db.query(Order).filter(Order.user_id == attacker.id).count() == 0
    assert db.query(Order).count() == 0


def test_checkout_rollback_leaves_no_partial_order(client, db):
    """Insuffcient variant stock must fail before any order/snapshot is written."""
    user = _create_user(db, "snap-rollback@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id
    n = next(_seq)
    variant = ProductVariant(
        product_id=pid,
        size="M",
        color=f"R{n}",
        price_modifier=0.0,
        quantity=1,
        sku=f"VAR-{n}",
    )
    db.add(variant)
    db.commit()

    # Request more than the variant holds: order creation must abort atomically.
    client.post(
        f"/api/v1/cart/{pid}?quantity=2&variant_id={variant.id}",
        headers=_auth(token),
    )
    resp = _checkout(client, token, addr["id"])
    assert resp.status_code == 400
    assert db.query(Order).filter(Order.user_id == user.id).count() == 0
    assert db.query(Order).count() == 0
    # The in-transaction inventory deduction was rolled back with the session.
    inv = db.query(Inventory).filter(Inventory.product_id == pid).first()
    assert inv.available_quantity == 20
    assert inv.reserved_quantity == 0


# ─── NULL snapshot (historical orders) stays readable ─────────────────────────


def test_null_snapshot_order_remains_readable(client, db):
    user = _create_user(db, "snap-legacy@example.com")
    token = _login(client, user.email)
    addr = _create_address(client, token, user.email)
    product = _create_product(db)
    pid = product.id

    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    created = _checkout(client, token, addr["id"])
    order_id = created.json()["id"]

    # Simulate a historical order created before the snapshot column existed.
    row = db.query(Order).filter(Order.id == order_id).first()
    row.shipping_address_snapshot = None
    db.commit()

    detail = client.get(f"/api/v1/orders/{order_id}", headers=_auth(token))
    assert detail.status_code == 200
    assert detail.json()["shipping_address"] is None

    admin = _create_user(db, "snap-legacy-admin@example.com", role=RoleEnum.ADMIN)
    admin_token = _login(client, admin.email)
    admin_view = client.get(
        f"/api/v1/admin/orders/{order_id}", headers=_auth(admin_token)
    )
    assert admin_view.status_code == 200
    assert admin_view.json()["shipping_address"] is None