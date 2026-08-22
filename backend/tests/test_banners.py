"""Phase 24.2 — Banner upload/CRUD/validation tests."""
import os
from pathlib import Path
import pytest

from app.core.security import hash_password
from app.models.models import User, RoleEnum, Category, Product, Banner


# ─── helpers ──────────────────────────────────────────────────────────────────


def _create_admin(db, email="banner-admin@test.com"):
    user = User(
        email=email,
        first_name="Banner",
        last_name="Admin",
        phone="9999999901",
        hashed_password=hash_password("TestPass123"),
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_user(db, email):
    user = User(
        email=email,
        first_name="Banner",
        last_name="User",
        phone="9999999902",
        hashed_password=hash_password("TestPass123"),
        role=RoleEnum.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login_token(client, email="banner-admin@test.com", password="TestPass123"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _banner_payload(**overrides):
    data = {
        "title": "Test Banner",
        "image_url": "/uploads/banners/abc123.jpg",
        "mobile_image_url": "/uploads/banners/abc123-m.jpg",
        "description": "A banner",
        "button_text": "Shop Now",
        "button_link": "/products",
        "target_category_id": None,
        "target_product_id": None,
        "is_active": True,
        "order": 1,
    }
    data.update(overrides)
    return data


def _create_product(db, name="Banner Product"):
    cat = Category(name="Banner Cat", slug="banner-cat", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)

    product = Product(
        category_id=cat.id,
        name=name,
        slug="banner-product",
        description="A test product",
        price=100.0,
        sku="BNR-PROD-1",
        quantity=10,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


MIN_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + b"\x00" * 16


# ─── public banner endpoint ───────────────────────────────────────────────────


def test_public_banners_active_only_sorted(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    client.post("/api/v1/admin/banners", json=_banner_payload(order=2), headers=h)
    client.post("/api/v1/admin/banners", json=_banner_payload(order=0), headers=h)
    client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(order=1, is_active=False),
        headers=h,
    )

    resp = client.get("/api/v1/banners")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert [b["order"] for b in data] == [0, 2]


# ─── admin CRUD ───────────────────────────────────────────────────────────────


def test_admin_banner_crud(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    create = client.post("/api/v1/admin/banners", json=_banner_payload(), headers=h)
    assert create.status_code == 201
    banner = create.json()
    assert banner["title"] == "Test Banner"
    assert banner["image_url"] == "/uploads/banners/abc123.jpg"

    get = client.get(f"/api/v1/admin/banners/{banner['id']}", headers=h)
    assert get.status_code == 200
    assert get.json()["id"] == banner["id"]

    upd = client.put(
        f"/api/v1/admin/banners/{banner['id']}",
        json={"title": "Updated", "is_active": False},
        headers=h,
    )
    assert upd.status_code == 200
    assert upd.json()["title"] == "Updated"
    assert upd.json()["is_active"] is False

    listing = client.get("/api/v1/admin/banners", headers=h)
    assert listing.status_code == 200
    assert any(b["id"] == banner["id"] for b in listing.json())

    dele = client.delete(f"/api/v1/admin/banners/{banner['id']}", headers=h)
    assert dele.status_code == 200

    gone = client.get(f"/api/v1/admin/banners/{banner['id']}", headers=h)
    assert gone.status_code == 404


def test_admin_banner_requires_admin_role(client, db):
    _create_user(db, "banner-user@test.com")
    token = _login_token(client, "banner-user@test.com")

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(),
        headers=_auth(token),
    )
    assert resp.status_code == 403


# ─── validation ───────────────────────────────────────────────────────────────


def test_banner_rejects_invalid_image_url(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(image_url="javascript:alert(1)"),
        headers=h,
    )
    assert resp.status_code == 422


def test_banner_rejects_invalid_button_link(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(button_link="javascript:alert(1)"),
        headers=h,
    )
    assert resp.status_code == 422


def test_banner_rejects_negative_order(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(order=-1),
        headers=h,
    )
    assert resp.status_code == 422


def test_banner_rejects_missing_target_category(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(target_category_id=999999),
        headers=h,
    )
    assert resp.status_code == 422


def test_banner_accepts_existing_target_category(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    cat = Category(name="Banner Cat", slug="banner-cat", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(target_category_id=cat.id),
        headers=h,
    )
    assert resp.status_code == 201


def test_banner_external_https_image_url_accepted(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(image_url="https://example.com/banner.jpg"),
        headers=h,
    )
    assert resp.status_code == 201


# ─── upload endpoint ──────────────────────────────────────────────────────────


def test_banner_upload_valid_png(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("banner.png", MIN_PNG, "image/png")},
        headers=h,
    )
    assert resp.status_code == 201
    url = resp.json()["url"]
    assert url.startswith("/uploads/banners/")
    assert url.endswith(".png")

    try:
        relative = url.lstrip("/")
        assert os.path.exists(relative)
    finally:
        relative = url.lstrip("/")
        if os.path.exists(relative):
            os.remove(relative)


def test_banner_upload_rejects_unsupported_extension(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("banner.txt", b"not an image", "text/plain")},
        headers=h,
    )
    assert resp.status_code == 400


def test_banner_upload_rejects_mismatched_content(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("banner.png", b"this is not a png", "image/png")},
        headers=h,
    )
    assert resp.status_code == 400


def test_banner_upload_rejects_empty_file(client, db):
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("banner.png", b"", "image/png")},
        headers=h,
    )
    assert resp.status_code == 400


# ─── schema-level validators ──────────────────────────────────────────────────


def test_legacy_banner_images_missing_files_still_creatable(client, db):
    """Legacy rows with /images/banners/*.jpg paths remain valid for create/update."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(image_url="/images/banners/slide1.jpg"),
        headers=h,
    )
    assert resp.status_code == 201


# ─── image ownership / cleanup safety ─────────────────────────────────────────


def test_delete_banner_keeps_media_library_file(client, db):
    """A Media Library asset (/uploads/media/...) must never be deleted by banner cleanup."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    media_rel = "/uploads/media/keepme.png"
    media_file = Path(media_rel.lstrip("/"))
    media_file.parent.mkdir(parents=True, exist_ok=True)
    media_file.write_bytes(b"fake media asset")

    try:
        create = client.post(
            "/api/v1/admin/banners",
            json=_banner_payload(image_url=media_rel, mobile_image_url=media_rel),
            headers=h,
        )
        assert create.status_code == 201
        banner_id = create.json()["id"]

        dele = client.delete(f"/api/v1/admin/banners/{banner_id}", headers=h)
        assert dele.status_code == 200

        assert media_file.exists(), "Media Library asset was wrongly deleted"
    finally:
        if media_file.exists():
            media_file.unlink()


def test_delete_banner_removes_owned_file(client, db):
    """A banner-owned upload (/uploads/banners/...) must be cleaned up on delete."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    owned_rel = "/uploads/banners/ownedfile.png"
    owned_file = Path(owned_rel.lstrip("/"))
    owned_file.parent.mkdir(parents=True, exist_ok=True)
    owned_file.write_bytes(b"fake banner asset")

    try:
        create = client.post(
            "/api/v1/admin/banners",
            json=_banner_payload(image_url=owned_rel, mobile_image_url=owned_rel),
            headers=h,
        )
        assert create.status_code == 201
        banner_id = create.json()["id"]

        dele = client.delete(f"/api/v1/admin/banners/{banner_id}", headers=h)
        assert dele.status_code == 200

        assert not owned_file.exists(), "Banner-owned file was not cleaned up"
    finally:
        if owned_file.exists():
            owned_file.unlink()


def test_update_banner_replacing_media_file_keeps_it(client, db):
    """Replacing a Media Library image with another must not delete the previous file."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    media_rel = "/uploads/media/keepme2.png"
    media_file = Path(media_rel.lstrip("/"))
    media_file.parent.mkdir(parents=True, exist_ok=True)
    media_file.write_bytes(b"fake media asset")

    try:
        create = client.post(
            "/api/v1/admin/banners",
            json=_banner_payload(image_url=media_rel),
            headers=h,
        )
        assert create.status_code == 201
        banner_id = create.json()["id"]

        upd = client.put(
            f"/api/v1/admin/banners/{banner_id}",
            json={"image_url": "/uploads/banners/newfile.png"},
            headers=h,
        )
        assert upd.status_code == 200

        assert media_file.exists(), "Media Library asset was wrongly deleted on replace"
    finally:
        if media_file.exists():
            media_file.unlink()


# ─── Phase 24.4 — image-first banner / product destination ──────────────────


def test_banner_image_only_creates(client, db):
    """A banner with only a desktop image (no title/description/buttons) is valid."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(
            title=None,
            description=None,
            button_text=None,
            button_link=None,
            target_category_id=None,
            target_product_id=None,
        ),
        headers=h,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == ""
    assert body["description"] is None
    assert body["button_text"] is None
    assert body["button_link"] is None
    assert body["target_product_id"] is None
    assert body["target_product_slug"] is None
    assert body["image_url"] == "/uploads/banners/abc123.jpg"


def test_banner_empty_optional_fields_accepted(client, db):
    """Empty title/description/button fields no longer block creation."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(
            title="",
            description="",
            button_text="",
            button_link="",
            target_category_id=None,
            target_product_id=None,
        ),
        headers=h,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == ""
    assert body["description"] == ""
    assert body["button_text"] == ""
    assert body["button_link"] is None


def test_banner_without_desktop_image_fails(client, db):
    """The desktop image remains a hard requirement."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(image_url=""),
        headers=h,
    )
    assert resp.status_code == 422


def test_banner_with_product_destination(client, db):
    """A banner linked to a product exposes its slug on the storefront API."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)
    product = _create_product(db)
    product_id = product.id
    slug = product.slug

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(target_product_id=product_id),
        headers=h,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["target_product_id"] == product_id
    assert body["target_product_slug"] == slug

    public = client.get("/api/v1/banners")
    assert public.status_code == 200
    assert any(b["target_product_slug"] == slug for b in public.json())


def test_banner_with_product_and_no_button_works(client, db):
    """Product destination must not require button text/link."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)
    product = _create_product(db)
    product_id = product.id
    slug = product.slug

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(
            target_product_id=product_id,
            button_text=None,
            button_link=None,
        ),
        headers=h,
    )
    assert resp.status_code == 201
    assert resp.json()["target_product_slug"] == slug


def test_banner_invalid_product_rejected(client, db):
    """A non-existent product reference is safely rejected."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(target_product_id=999999),
        headers=h,
    )
    assert resp.status_code == 422


def test_banner_target_product_null_accepted(client, db):
    """target_product_id may be null (image-only or CTA-only banner)."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(target_product_id=None),
        headers=h,
    )
    assert resp.status_code == 201
    assert resp.json()["target_product_id"] is None


def test_banner_existing_button_link_preserved(client, db):
    """Existing button_link values remain untouched by the product feature."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)

    resp = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(button_link="/special-offer"),
        headers=h,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["button_link"] == "/special-offer"
    assert body["target_product_id"] is None
    assert body["target_product_slug"] is None


def test_banner_update_product_destination(client, db):
    """Editing a banner can attach a product destination."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)
    product = _create_product(db)
    product_id = product.id
    slug = product.slug

    create = client.post("/api/v1/admin/banners", json=_banner_payload(), headers=h)
    assert create.status_code == 201
    banner_id = create.json()["id"]

    upd = client.put(
        f"/api/v1/admin/banners/{banner_id}",
        json={"target_product_id": product_id},
        headers=h,
    )
    assert upd.status_code == 200
    assert upd.json()["target_product_id"] == product_id
    assert upd.json()["target_product_slug"] == slug

    cleared = client.put(
        f"/api/v1/admin/banners/{banner_id}",
        json={"target_product_id": None},
        headers=h,
    )
    assert cleared.status_code == 200
    assert cleared.json()["target_product_id"] is None


def test_banner_product_deletion_does_not_break_banner(client, db):
    """Deleting a referenced product must not break the banner system."""
    _create_admin(db)
    token = _login_token(client)
    h = _auth(token)
    product = _create_product(db)
    product_id = product.id

    create = client.post(
        "/api/v1/admin/banners",
        json=_banner_payload(target_product_id=product_id),
        headers=h,
    )
    assert create.status_code == 201
    banner_id = create.json()["id"]

    delete_prod = client.delete(f"/api/v1/admin/products/{product_id}", headers=h)
    assert delete_prod.status_code == 200

    listing = client.get("/api/v1/admin/banners", headers=h)
    assert listing.status_code == 200
    assert any(b["id"] == banner_id for b in listing.json())

    public = client.get("/api/v1/banners")
    assert public.status_code == 200
    assert any(b["id"] == banner_id for b in public.json())
