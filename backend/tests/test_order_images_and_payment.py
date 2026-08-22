"""Phase 24.8 - Order item images + payment method enforcement tests.

Images:
  - OrderItemResponse now carries the product's images (primary first),
    reusing the existing ProductImage/media architecture (relative /uploads
    URLs resolved by getMediaUrl on the clients).
Payment:
  - COD is the only implemented payment method; payment_method is now
    returned explicitly; cod_enabled is enforced server-side;
    online_payment_enabled has no gateway behind it and must never gate or
    fake online checkout.
"""
import itertools

import pytest

from app.core.config import settings as app_settings
from app.core.security import hash_password
from app.models.models import (
    Category,
    Inventory,
    Product,
    ProductImage,
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
        first_name="Img",
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


ADMIN_EMAIL = "img-admin@example.com"


def _create_product_with_images(
    db, with_images=True, primary_last=False
):
    """Returns product_id. With images: two rows; primary ordering controlled."""
    n = next(_seq)
    cat = Category(name=f"IC{n}", slug=f"ic-{n}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    p = Product(
        category_id=cat.id,
        name=f"ImgProd{n}",
        slug=f"imgprod-{n}",
        description="",
        price=90.0,
        sku=f"IMG-{n}",
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
    if with_images:
        # order column controls secondary sort; primary flag sorts first
        db.add(
            ProductImage(
                product_id=pid,
                image_url=f"/uploads/products/secondary-{n}.jpg",
                alt_text="secondary",
                is_primary=False,
                order=1,
            )
        )
        db.add(
            ProductImage(
                product_id=pid,
                image_url=f"/uploads/products/main-{n}.jpg",
                alt_text="main",
                is_primary=True,
                order=5 if primary_last else 0,
            )
        )
    db.commit()
    return pid


@pytest.fixture()
def buyer_and_order_context(client, db):
    _mk_user(db, ADMIN_EMAIL, RoleEnum.ADMIN)
    admin_token = _login(client, ADMIN_EMAIL)

    email = f"img-buyer{next(_seq)}@example.com"
    _mk_user(db, email)
    token = _login(client, email)
    r = client.post(
        "/api/v1/addresses",
        headers=_auth(token),
        json={
            "first_name": "Img",
            "last_name": "Buyer",
            "phone": "8888889800",
            "email": email,
            "address_line_1": "5 Image Lane",
            "city": "New Delhi",
            "state": "Delhi",
            "postal_code": "110001",
            "country": "India",
        },
    )
    assert r.status_code == 201, r.text
    addr = r.json()["id"]
    return admin_token, token, addr


def _checkout_product(client, token, addr, pid):
    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    r = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": addr},
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


# ─── Images ───────────────────────────────────────────────────────────────────


def test_customer_order_detail_returns_primary_first_image(
    client, db, buyer_and_order_context
):
    _, token, addr = buyer_and_order_context
    pid = _create_product_with_images(db)
    body = _checkout_product(client, token, addr, pid)
    oid = body["id"]

    r = client.get(f"/api/v1/orders/{oid}", headers=_auth(token))
    assert r.status_code == 200, r.text
    item = r.json()["items"][0]
    assert len(item["images"]) == 2
    assert item["images"][0]["is_primary"] is True
    assert item["images"][0]["alt_text"] == "main"
    assert item["images"][1]["is_primary"] is False
    assert item["images"][1]["alt_text"] == "secondary"


def test_admin_order_detail_returns_item_images(client, db, buyer_and_order_context):
    admin_token, token, addr = buyer_and_order_context
    pid = _create_product_with_images(db)
    oid = _checkout_product(client, token, addr, pid)["id"]

    r = client.get(f"/api/v1/admin/orders/{oid}", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["payment_method"] == "cod"
    item = data["items"][0]
    assert len(item["images"]) == 2
    assert any(img["is_primary"] for img in item["images"])
    assert all(img["image_url"].startswith("/uploads/") for img in item["images"])

    r = client.get("/api/v1/admin/orders", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    listed = next(o for o in r.json() if o["id"] == oid)
    assert listed["items"][0]["images"], "admin order list must include images too"


def test_order_without_any_product_images_is_graceful(client, db, buyer_and_order_context):
    _, token, addr = buyer_and_order_context
    pid = _create_product_with_images(db, with_images=False)
    oid = _checkout_product(client, token, addr, pid)["id"]

    r = client.get(f"/api/v1/orders/{oid}", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.json()["items"][0]["images"] == []


def test_deleted_images_after_order_do_not_break_response(client, db, buyer_and_order_context):
    _, token, addr = buyer_and_order_context
    pid = _create_product_with_images(db)
    oid = _checkout_product(client, token, addr, pid)["id"]

    for img in db.query(ProductImage).filter(ProductImage.product_id == pid).all():
        db.delete(img)
    db.commit()

    r = client.get(f"/api/v1/orders/{oid}", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.json()["items"][0]["images"] == []

    r2 = client.get(
        f"/api/v1/orders/{oid}/timeline", headers=_auth(token)
    )
    assert r2.status_code == 200


# ─── Payment method ──────────────────────────────────────────────────────────


def test_cod_returned_explicitly_in_checkout_response(client, db, buyer_and_order_context):
    _, token, addr = buyer_and_order_context
    pid = _create_product_with_images(db, with_images=False)
    body = _checkout_product(client, token, addr, pid)
    assert body["payment_method"] == "cod"
    assert body["payment_status"] == "pending"


def test_cod_returned_explicitly_in_orders_endpoint(client, db, buyer_and_order_context):
    _, token, addr = buyer_and_order_context
    pid = _create_product_with_images(db, with_images=False)
    r = client.post(
        "/api/v1/orders",
        headers=_auth(token),
        json={
            "items": [{"product_id": pid, "quantity": 1}],
            "shipping_address_id": addr,
            "payment_method": "cod",
        },
    )
    assert r.status_code in (200, 201), r.text
    assert r.json()["payment_method"] == "cod"
    assert r.json()["payment_status"] == "pending"


def test_client_cannot_force_payment_status_or_method(client, db, buyer_and_order_context):
    _, token, addr = buyer_and_order_context

    # /checkout: extra fields are not part of CheckoutRequest and are ignored
    pid = _create_product_with_images(db, with_images=False)
    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))
    r = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={
            "shipping_address_id": addr,
            "payment_status": "completed",
            "payment_method": "razorpay",
        },
    )
    assert r.status_code in (200, 201), r.text
    assert r.json()["payment_method"] == "cod"
    assert r.json()["payment_status"] == "pending"

    # /orders: unsupported method rejected outright
    r2 = client.post(
        "/api/v1/orders",
        headers=_auth(token),
        json={
            "items": [{"product_id": pid, "quantity": 1}],
            "shipping_address_id": addr,
            "payment_method": "upi",
            "payment_status": "paid",
        },
    )
    assert r2.status_code == 400, r2.text
    assert "Unsupported payment method" in r2.json()["detail"]


def test_cod_disabled_blocks_checkout_and_orders(client, db, buyer_and_order_context):
    _, token, addr = buyer_and_order_context
    store = get_settings(db)
    store.cod_enabled = False
    db.commit()

    pid = _create_product_with_images(db, with_images=False)
    client.post(f"/api/v1/cart/{pid}?quantity=1", headers=_auth(token))

    r = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": addr},
    )
    assert r.status_code == 400, r.text
    detail = r.json()["detail"]
    assert detail["code"] == "COD_DISABLED"

    r2 = client.post(
        "/api/v1/orders",
        headers=_auth(token),
        json={
            "items": [{"product_id": pid, "quantity": 1}],
            "shipping_address_id": addr,
            "payment_method": "cod",
        },
    )
    assert r2.status_code == 400, r2.text
    assert r2.json()["detail"]["code"] == "COD_DISABLED"

    # re-enabling restores ordering without redeploy
    # (re-query: prior HTTP requests closed/detached the session instances)
    store = get_settings(db)
    store.cod_enabled = True
    db.commit()
    r3 = client.post(
        "/api/v1/checkout",
        headers=_auth(token),
        json={"shipping_address_id": addr},
    )
    assert r3.status_code in (200, 201), r3.text


def test_online_payment_flag_does_not_gate_cod_orders(client, db, buyer_and_order_context):
    _, token, addr = buyer_and_order_context
    store = get_settings(db)
    store.online_payment_enabled = False
    db.commit()

    pid = _create_product_with_images(db, with_images=False)
    body = _checkout_product(client, token, addr, pid)
    assert body["payment_method"] == "cod"


def test_public_settings_expose_payment_flags(client, db):
    r = client.get("/api/v1/settings/public")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["cod_enabled"] is True
    # no payment gateway exists: online payments can never be advertised
    assert data["online_payment_enabled"] is False
    assert data["direct_checkout_enabled"] is True
