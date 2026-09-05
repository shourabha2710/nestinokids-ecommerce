"""Phase 25A Commit 4 — Upload security hardening tests.

Verifies that every backend upload endpoint enforces:
  - extension allowlist
  - magic-byte / content-signature validation (Content-Type is untrusted)
  - MAX_UPLOAD_SIZE
  - UUID-only filenames (no client-controlled paths)
"""
import re
from pathlib import Path

import pytest

from app.core.config import settings
from app.core.security import hash_password
from app.models.models import User, RoleEnum, Category, Product
from app.services.file_validation import upload_url


# ─── deterministic real-signature payloads ───────────────────────────────────

JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + b"\x00" * 16
MIN_WEBP = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"VP8 " + b"\x00" * 16
MIN_MP4 = b"\x00\x00\x00\x18" + b"ftypisom" + b"\x00" * 20
MIN_WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 8 + b"webm" + b"\x00" * 16
TEXT = b"plain text, definitely not a real image"
UUID_NAME_RE = re.compile(r"^[0-9a-f]{32}\.(jpe?g|png|webp|mp4|webm)$")


# ─── helpers ─────────────────────────────────────────────────────────────────


def _create_admin(db, email="upload-admin@test.com"):
    user = User(
        email=email,
        first_name="Upload",
        last_name="Admin",
        phone="9999999903",
        hashed_password=hash_password("TestPass123"),
        role=RoleEnum.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_product(db):
    cat = Category(name="Upload Cat", slug="upload-cat", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    product = Product(
        category_id=cat.id,
        name="Upload Product",
        slug="upload-product",
        description="A test product",
        price=100.0,
        sku="UPLOAD-PROD-1",
        quantity=10,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _login_token(client, email="upload-admin@test.com", password="TestPass123"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _uploads_snapshot():
    root = Path(settings.UPLOAD_DIR)
    if not root.exists():
        return set()
    return {
        (str(p.relative_to(root)), p.stat().st_size)
        for p in root.rglob("*")
        if p.is_file()
    }


def _delete_uploaded(path):
    try:
        Path(path.lstrip("/")).unlink(missing_ok=True)
    except Exception:
        pass


def _assert_uploaded(file_url, subdir):
    """Assert the response URL matches the server-controlled format and that
    the file physically landed inside the (isolated) upload root with a
    UUID-generated name."""
    prefix = f"/{settings.UPLOAD_DIR}/{subdir}/"
    assert file_url.startswith(prefix), f"unexpected URL {file_url!r}"
    name = file_url.rsplit("/", 1)[1]
    assert UUID_NAME_RE.match(name), f"stored filename is not UUID-based: {name!r}"
    saved = Path(settings.UPLOAD_DIR) / subdir / name
    assert saved.is_file(), f"expected file on disk at {saved}"
    return saved


def test_upload_url_uses_uploads_prefix():
    """With the production UPLOAD_DIR the URL contract must stay /uploads/..."""
    original = settings.UPLOAD_DIR
    settings.UPLOAD_DIR = "uploads"
    try:
        assert upload_url("banners", "aa" * 16 + ".jpg") == "/uploads/banners/" + "aa" * 16 + ".jpg"
        assert upload_url("hero", "bb" * 16 + ".mp4") == "/uploads/hero/" + "bb" * 16 + ".mp4"
    finally:
        settings.UPLOAD_DIR = original


@pytest.fixture(autouse=True)
def _isolated_upload_dir(tmp_path):
    """Redirect all upload writes to a temporary directory.

    Never touches the real backend/uploads tree, so tests cannot delete or
    pollute development uploads. The temp directory is removed automatically.
    """
    original = settings.UPLOAD_DIR
    settings.UPLOAD_DIR = str(tmp_path / "uploads")
    yield
    settings.UPLOAD_DIR = original


# ─── A. valid files ──────────────────────────────────────────────────────────


def test_banner_accepts_valid_jpeg(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("photo.jpg", JPEG, "image/jpeg")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    _assert_uploaded(resp.json()["url"], "banners")


def test_banner_accepts_valid_png(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("photo.png", PNG, "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    _assert_uploaded(resp.json()["url"], "banners")


def test_banner_accepts_valid_webp(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("photo.webp", MIN_WEBP, "image/webp")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    saved = _assert_uploaded(resp.json()["url"], "banners")
    saved.unlink(missing_ok=True)


def test_hero_accepts_valid_mp4(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/hero-slides",
        data={"title": "Slide", "media_type": "video"},
        files={"media_file": ("video.mp4", MIN_MP4, "video/mp4")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    _assert_uploaded(resp.json()["media_url"], "hero")
    assert resp.json()["media_type"] == "video"


def test_hero_accepts_valid_webm(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/hero-slides",
        data={"title": "Slide", "media_type": "video"},
        files={"media_file": ("video.webm", MIN_WEBM, "video/webm")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    _assert_uploaded(resp.json()["media_url"], "hero")
    assert resp.json()["media_type"] == "video"


def test_media_library_accepts_valid_png(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/media/upload",
        files={"file": ("pic.png", PNG, "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["file_url"].startswith(f"/{settings.UPLOAD_DIR}/media/")
    assert UUID_NAME_RE.match(resp.json()["filename"])
    _delete_uploaded(resp.json()["file_url"])


# ─── B. extension / content mismatch ─────────────────────────────────────────


def test_banner_rejects_png_bytes_named_jpg(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("photo.jpg", PNG, "image/jpeg")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_banner_rejects_jpeg_bytes_named_png(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("photo.png", JPEG, "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_banner_rejects_text_named_jpg(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("photo.jpg", TEXT, "image/jpeg")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_hero_rejects_image_bytes_named_mp4(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/hero-slides",
        data={"title": "Slide"},
        files={"media_file": ("video.mp4", PNG, "video/mp4")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_hero_rejects_non_video_bytes_named_mp4(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/hero-slides",
        data={"title": "Slide"},
        files={"media_file": ("video.mp4", TEXT, "video/mp4")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_hero_rejects_arbitrary_bytes_named_webm(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/hero-slides",
        data={"title": "Slide"},
        files={"media_file": ("video.webm", b"totally not a webm", "video/webm")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_product_image_rejects_png_named_jpg(client, db):
    product = _create_product(db)
    product_id = product.id
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        f"/api/v1/admin/products/{product_id}/images",
        data={"is_primary": "false"},
        files={"file": ("img.jpg", PNG, "image/jpeg")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_instagram_rejects_text_named_png(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/instagram-posts",
        data={"post_url": "https://instagram.com/p/aaa"},
        files={"image": ("thumb.png", TEXT, "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_review_rejects_text_named_png(client, db):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/reviews",
        data={"customer_name": "C", "review_text": "ok", "rating": "5"},
        files={"image": ("face.png", TEXT, "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_media_library_rejects_jpeg_bytes_named_png(client, db):
    """The shared media service must never bypass signature validation."""
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/media/upload",
        files={"file": ("pic.png", JPEG, "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


# ─── C. unsupported extensions ───────────────────────────────────────────────


@pytest.mark.parametrize("ext", ["exe", "php", "html", "js", "py", "zip"])
def test_banner_rejects_unsupported_extension(client, db, ext):
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": (f"evil.{ext}", TEXT, "application/octet-stream")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


def test_media_library_rejects_php(client, db):
    """The shared media service must not bypass endpoint-level validation."""
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/media/upload",
        files={"file": ("shell.php", b"<?php echo 'x'; ?>", "application/x-php")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text


# ─── D. size limit ───────────────────────────────────────────────────────────


def test_upload_exactly_at_max_size_accepted(client, db):
    _create_admin(db)
    token = _login_token(client)
    content = b"\xff\xd8\xff" + b"\x00" * (settings.MAX_UPLOAD_SIZE - 3)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("big.jpg", content, "image/jpeg")},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    _delete_uploaded(resp.json()["url"])


def test_upload_over_max_size_rejected(client, db):
    _create_admin(db)
    token = _login_token(client)
    content = b"\xff\xd8\xff" + b"\x00" * (settings.MAX_UPLOAD_SIZE - 3 + 1)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("big.jpg", content, "image/jpeg")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text
    assert "too large" in resp.json()["detail"].lower()


# ─── E. filename / path traversal ────────────────────────────────────────────


@pytest.mark.parametrize(
    "bad",
    [
        "../evil.jpg",
        "..\\evil.jpg",
        "../../evil.jpg",
        "/tmp/evil.jpg",
        "nested/path/evil.jpg",
    ],
)
def test_upload_rejects_traversal_filenames(client, db, bad):
    _create_admin(db)
    token = _login_token(client)
    before = _uploads_snapshot()
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": (bad, PNG, "image/png")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text
    assert _uploads_snapshot() == before, "traversal filename must not write any file"


# ─── F. content-type spoofing ────────────────────────────────────────────────


def test_banner_rejects_spoofed_content_type(client, db):
    """Client says image/jpeg but the bytes are PNG: must be rejected."""
    _create_admin(db)
    token = _login_token(client)
    resp = client.post(
        "/api/v1/admin/banners/upload",
        files={"file": ("photo.jpg", PNG, "image/jpeg")},
        headers=_auth(token),
    )
    assert resp.status_code == 400, resp.text