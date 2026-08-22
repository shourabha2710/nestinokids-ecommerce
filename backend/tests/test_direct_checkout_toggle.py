"""Phase 24.7 - Admin configurable direct checkout toggle tests.

Verifies that StoreSetting.direct_checkout_enabled is:
  - False by default and blocks order placement end-to-end
  - readable/writable by authorized admins via /api/v1/admin/settings
  - rejected for unauthenticated users (401) and customers (403)
  - persisted across re-login and enforced server-side on every request
  - not overrideable by customer-supplied payloads
  - audit-logged with old/new values on change
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
    Order,
    Product,
    RoleEnum,
    User,
)
from app.services.settings_service import get_settings


@pytest.fixture(autouse=True)
def no_env_override(monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)


# ─── helpers ──────────────────────────────────────────────────────────────────

_seq = itertools.count(1)


def _create_user(db, email, role=RoleEnum.USER, phone="8888888801"):
    user = User(
        email=email,
        first_name="Toggle",
        last_name="Tester",
        phone=phone,
        hashed_password=hash_password("TestPass123"),
        role=role,
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


def _create_product(db, price=250.0):
    n = next(_seq)
    name = f"ToggleProd{n}"
    slug = f"{name.lower()}-{n}"
    cat_name = f"Cat-{slug}"
    cat = Category(name=cat_name, slug=f"cat-{slug}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    product = Product(
        category_id=cat.id,
        name=name,
        slug=slug,
        description="",
        price=price,
        sku=f"TGL-{n}",
        quantity=100,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    pid = product.id
    inv = Inventory(
        product_id=pid,
        total_quantity=50,
        available_quantity=50,
        reserved_quantity=0,
        low_stock_threshold=5,
    )
    db.add(inv)
    db.commit()
    return pid


def _setup_buyer(client, db, email, suffix=1):
    user = _create_user(db, email, phone=f"88888888{suffix:02d}")
    token = _login_token(client, email)
    resp = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Toggle",
            "last_name": "Buyer",
            "phone": f"88888888{suffix:02d}",
            "email": email,
            "address_line_1": "7 Toggle Street",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    address_id = resp.json()["id"]
    uid = user.id
    return token, address_id, uid


def _add_to_cart(client, token, product_id, qty=1):
    resp = client.post(
        f"/api/v1/cart/{product_id}?quantity={qty}", headers=_auth(token)
    )
    assert resp.status_code == 200, resp.text


def _checkout(client, token, address_id, **extra):
    body = {"shipping_address_id": address_id}
    body.update(extra)
    return client.post("/api/v1/checkout", headers=_auth(token), json=body)


def _get_admin_settings(client, token):
    return client.get("/api/v1/admin/settings", headers=_auth(token))


def _put_admin_settings(client, token, payload):
    return client.put("/api/v1/admin/settings", headers=_auth(token), json=payload)


ADMIN_EMAIL = "toggle-admin@example.com"


@pytest.fixture()
def admin_token(client, db):
    _create_user(db, ADMIN_EMAIL, role=RoleEnum.ADMIN, phone="7777777701")
    return _login_token(client, ADMIN_EMAIL)


def _flag_from_db(db):
    return get_settings(db).direct_checkout_enabled


# ─── Default state ────────────────────────────────────────────────────────────


def test_default_is_false_and_blocks_checkout(client, db, admin_token):
    resp = _get_admin_settings(client, admin_token)
    assert resp.status_code == 200, resp.text
    assert resp.json()["direct_checkout_enabled"] is False

    token, address_id, _ = _setup_buyer(client, db, "toggle-default@example.com")
    pid = _create_product(db)
    _add_to_cart(client, token, pid)

    resp = _checkout(client, token, address_id)
    assert resp.status_code == 400, resp.text
    detail = resp.json()["detail"]
    assert detail["code"] == "DIRECT_CHECKOUT_DISABLED"
    assert _flag_from_db(db) is False


# ─── Authorized admin can flip the toggle ────────────────────────────────────


def test_admin_can_enable_and_checkout_works_end_to_end(client, db, admin_token):
    resp = _put_admin_settings(client, admin_token, {"direct_checkout_enabled": True})
    assert resp.status_code == 200, resp.text
    assert resp.json()["direct_checkout_enabled"] is True
    assert _flag_from_db(db) is True

    token, address_id, uid = _setup_buyer(client, db, "toggle-enable@example.com")
    pid = _create_product(db)
    _add_to_cart(client, token, pid)

    resp = _checkout(client, token, address_id)
    assert resp.status_code in (200, 201), resp.text
    order = resp.json()
    assert order["order_number"].startswith("ORD-")
    orders = db.query(Order).filter(Order.user_id == uid).all()
    assert len(orders) == 1


def test_admin_can_disable_after_enable(client, db, admin_token):
    assert _put_admin_settings(
        client, admin_token, {"direct_checkout_enabled": True}
    ).status_code == 200

    token, address_id, _ = _setup_buyer(client, db, "toggle-disable@example.com")
    pid = _create_product(db)
    _add_to_cart(client, token, pid)
    assert _checkout(client, token, address_id).status_code in (200, 201)

    resp = _put_admin_settings(client, admin_token, {"direct_checkout_enabled": False})
    assert resp.status_code == 200, resp.text
    assert resp.json()["direct_checkout_enabled"] is False

    _add_to_cart(client, token, pid)
    resp = _checkout(client, token, address_id)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"]["code"] == "DIRECT_CHECKOUT_DISABLED"
    assert _flag_from_db(db) is False


def test_toggle_persists_across_relogin(client, db, admin_token):
    assert _put_admin_settings(
        client, admin_token, {"direct_checkout_enabled": True}
    ).status_code == 200

    fresh_token = _login_token(client, ADMIN_EMAIL)
    resp = _get_admin_settings(client, fresh_token)
    assert resp.status_code == 200, resp.text
    assert resp.json()["direct_checkout_enabled"] is True


def test_partial_update_only_touches_the_flag(client, db, admin_token):
    before = _get_admin_settings(client, admin_token).json()

    resp = _put_admin_settings(client, admin_token, {"direct_checkout_enabled": True})
    assert resp.status_code == 200, resp.text
    after = resp.json()

    assert after["direct_checkout_enabled"] is True
    for key in (
        "store_name",
        "currency",
        "timezone",
        "cod_enabled",
        "online_payment_enabled",
        "marketplace_purchase_enabled",
        "tax_enabled",
        "free_shipping_enabled",
        "maintenance_mode",
    ):
        assert after[key] == before[key], f"{key} was clobbered by partial update"


# ─── Authorization ────────────────────────────────────────────────────────────


def test_unauthenticated_requests_are_rejected(client):
    assert client.get("/api/v1/admin/settings").status_code == 401
    assert (
        client.put(
            "/api/v1/admin/settings", json={"direct_checkout_enabled": True}
        ).status_code
        == 401
    )


def test_customer_role_is_forbidden(client, db):
    _create_user(db, "toggle-cust@example.com")
    token = _login_token(client, "toggle-cust@example.com")

    resp = _get_admin_settings(client, token)
    assert resp.status_code == 403, resp.text

    resp = _put_admin_settings(client, token, {"direct_checkout_enabled": True})
    assert resp.status_code == 403, resp.text
    assert resp.json()["detail"] == "Insufficient permissions"
    assert _flag_from_db(db) is False


# ─── Customers cannot override via payloads ──────────────────────────────────


def test_customer_cannot_override_via_checkout_payload(client, db):
    token, address_id, _ = _setup_buyer(client, db, "toggle-ovr@example.com")
    pid = _create_product(db)
    _add_to_cart(client, token, pid)

    resp = _checkout(client, token, address_id, direct_checkout_enabled=True)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"]["code"] == "DIRECT_CHECKOUT_DISABLED"


def test_customer_cannot_override_via_orders_payload(client, db):
    token, address_id, _ = _setup_buyer(client, db, "toggle-ovr2@example.com")
    pid = _create_product(db)

    resp = client.post(
        "/api/v1/orders",
        headers=_auth(token),
        json={
            "items": [{"product_id": pid, "quantity": 1}],
            "shipping_address_id": address_id,
            "payment_method": "cod",
            "direct_checkout_enabled": True,
        },
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"]["code"] == "DIRECT_CHECKOUT_DISABLED"
    assert _flag_from_db(db) is False


# ─── Audit trail ──────────────────────────────────────────────────────────────


def test_setting_change_is_audit_logged(client, db, admin_token):
    resp = _put_admin_settings(client, admin_token, {"direct_checkout_enabled": True})
    assert resp.status_code == 200, resp.text

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == AuditEntityType.SETTINGS,
            AuditLog.action == AuditAction.UPDATE,
        )
        .all()
    )
    assert len(logs) == 1, "expected exactly one SETTINGS UPDATE audit log"
    log = logs[0]
    assert log.old_values["direct_checkout_enabled"] is False
    assert log.new_values["direct_checkout_enabled"] is True
    assert log.user_id is not None
