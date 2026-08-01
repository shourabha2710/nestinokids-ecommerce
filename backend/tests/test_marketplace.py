"""Phase 23.9A — Marketplace Foundation tests."""
import pytest
from sqlalchemy import event

from app.core.config import settings as app_settings
from app.core.permissions import Permissions
from app.core.rbac import has_permission
from app.core.security import hash_password
from app.models.models import (
    User, RoleEnum, Category, Product, ProductVariant, Inventory,
    MarketplaceRedirectClick,
)
from app.schemas.marketplace_schemas import (
    MarketplaceListingCreate,
    ResolveItem,
)
from app.services import marketplace_service
from app.services.marketplace_service import (
    validate_marketplace,
    validate_and_normalize_url,
    resolve_listings,
    resolve_batch,
    create_listing,
    record_click,
    is_direct_checkout_enabled,
    is_marketplace_purchase_enabled,
)
from app.services.settings_service import get_feature_flag, get_settings
from app.services.order_calculation_service import calculate_order


# ─── helpers ──────────────────────────────────────────────────────────────────


def _create_user(db, email, role=RoleEnum.USER):
    user = User(
        email=email,
        first_name="Test",
        last_name="User",
        phone="9999999900",
        hashed_password=hash_password("TestPass123"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login_token(client, email, password="TestPass123"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def _create_product(db, name="Test Product", slug=None, with_variants=True):
    slug = slug or name.lower().replace(" ", "-")
    cat = Category(name=f"Cat-{slug}", slug=f"cat-{slug}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    sku = slug + "-SKU"
    product = Product(
        category_id=cat.id, name=name,
        slug=slug,
        description="", price=100, sku=sku, quantity=50,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    inventory = Inventory(
        product_id=product.id, total_quantity=10, available_quantity=10,
        reserved_quantity=0, low_stock_threshold=10,
    )
    db.add(inventory)
    variant = None
    if with_variants:
        variant = ProductVariant(product_id=product.id, size="M", quantity=10, sku=f"{sku}-V1")
        db.add(variant)
        db.commit()
        db.refresh(variant)
    else:
        db.commit()
    return product, variant


def _make_listing_data(product_id, variant_id=None, marketplace="AMAZON",
                       ext_id="B0H6J3JRWT", url=None, **overrides):
    data = {
        "product_id": product_id,
        "variant_id": variant_id,
        "marketplace": marketplace,
        "external_product_id": ext_id,
        "external_url": url or ("https://www.amazon.in/dp/" + ext_id),
    }
    data.update(overrides)
    return MarketplaceListingCreate(**data)


# ─── Marketplace validation ───────────────────────────────────────────────────


def test_validate_marketplace_accepts_supported():
    assert validate_marketplace("AMAZON") == "AMAZON"
    assert validate_marketplace("flipkart") == "FLIPKART"
    assert validate_marketplace("Myntra") == "MYNTRA"
    assert validate_marketplace("FIRSTCRY") == "FIRSTCRY"
    assert validate_marketplace("MEESHO") == "MEESHO"


def test_validate_marketplace_rejects_unknown():
    with pytest.raises(ValueError):
        validate_marketplace("EBAY")
    with pytest.raises(ValueError):
        validate_marketplace("")


# ─── URL validation ───────────────────────────────────────────────────────────


def test_url_valid_amazon_in_accepted():
    url = validate_and_normalize_url("https://www.amazon.in/dp/B0H6J3JRWT", "AMAZON")
    assert url == "https://www.amazon.in/dp/B0H6J3JRWT"


def test_url_valid_flipkart_com_accepted():
    url = validate_and_normalize_url("https://www.flipkart.com/p/KPBHNUD9JS22MPHH", "FLIPKART")
    assert url == "https://www.flipkart.com/p/KPBHNUD9JS22MPHH"


def test_url_http_safely_upgraded():
    url = validate_and_normalize_url("http://www.amazon.in/dp/B0H6J3JRWT", "AMAZON")
    assert url.startswith("https://www.amazon.in/dp/B0H6J3JRWT")


def test_url_javascript_rejected():
    with pytest.raises(ValueError):
        validate_and_normalize_url("javascript:alert(1)", "AMAZON")


def test_url_data_rejected():
    with pytest.raises(ValueError):
        validate_and_normalize_url("data:text/html;base64,PHNjcmlwdD4=", "AMAZON")


def test_url_wrong_marketplace_host_rejected():
    with pytest.raises(ValueError):
        validate_and_normalize_url("https://www.amazon.in/dp/B0H6J3JRWT", "FLIPKART")
    with pytest.raises(ValueError):
        validate_and_normalize_url("https://www.evil-example.com/dp/B0H6J3JRWT", "AMAZON")


def test_url_tracking_params_safely_removed():
    url = validate_and_normalize_url(
        "https://www.amazon.in/dp/B0H6J3JRWT?tag=nestino-21&ref_=x1&utm_source=newsletter&smid=A1",
        "AMAZON",
    )
    assert url.startswith("https://www.amazon.in/dp/B0H6J3JRWT")
    assert "tag=" not in url
    assert "ref_=" not in url
    assert "utm_source" not in url
    assert "smid=" not in url


def test_url_normalized_and_revalidated():
    # Normalization produces a URL that still passes host/scheme validation.
    url = validate_and_normalize_url(
        "https://www.flipkart.com/p/XYZ?utm_source=google&gclid=abc&pid=keepme",
        "FLIPKART",
    )
    parsed = urlparse_for_test(url)
    assert parsed.scheme == "https"
    assert parsed.netloc == "www.flipkart.com"


def urlparse_for_test(url):
    from urllib.parse import urlparse
    return urlparse(url)


# ─── Resolution ───────────────────────────────────────────────────────────────


def test_resolution_exact_variant_match(db):
    product, variant = _create_product(db, name="Res1", slug="res1")
    listing = create_listing(db, _make_listing_data(product.id, variant_id=variant.id))
    resolved = resolve_listings(db, product.id, variant.id)
    assert [l.id for l in resolved] == [listing.id]


def test_resolution_variant_exact_preferred_over_fallback(db):
    product, variant = _create_product(db, name="Res2", slug="res2")
    create_listing(db, _make_listing_data(
        product.id, variant_id=None, ext_id="B0AMZP", allow_variant_fallback=True))
    exact = create_listing(db, _make_listing_data(
        product.id, variant_id=variant.id, ext_id="B0AMZV"))
    resolved = resolve_listings(db, product.id, variant.id)
    assert [l.id for l in resolved] == [exact.id]


def test_resolution_explicit_product_fallback_allowed(db):
    product, variant = _create_product(db, name="Res3", slug="res3")
    listing = create_listing(db, _make_listing_data(
        product.id, variant_id=None, marketplace="FLIPKART",
        ext_id="PID3", url="https://www.flipkart.com/p/PID3",
        allow_variant_fallback=True))
    resolved = resolve_listings(db, product.id, variant.id)
    assert [l.id for l in resolved] == [listing.id]


def test_resolution_fallback_false_unavailable(db):
    product, variant = _create_product(db, name="Res4", slug="res4")
    create_listing(db, _make_listing_data(
        product.id, variant_id=None, ext_id="B0NOPE", allow_variant_fallback=False))
    assert resolve_listings(db, product.id, variant.id) == []


def test_resolution_non_variant_product_level(db):
    product, _ = _create_product(db, name="Res5", slug="res5", with_variants=False)
    listing = create_listing(db, _make_listing_data(product.id))
    resolved = resolve_listings(db, product.id)
    assert [l.id for l in resolved] == [listing.id]


def test_resolution_inactive_excluded(db):
    product, variant = _create_product(db, name="Res6", slug="res6")
    create_listing(db, _make_listing_data(product.id, variant_id=variant.id, is_active=False))
    assert resolve_listings(db, product.id, variant.id) == []


def test_resolution_priority_ordering(db):
    product, variant = _create_product(db, name="Res7", slug="res7")
    low = create_listing(db, _make_listing_data(
        product.id, variant_id=variant.id, ext_id="B0LOW", priority=1))
    high = create_listing(db, _make_listing_data(
        product.id, variant_id=variant.id, marketplace="FLIPKART",
        ext_id="PID7", url="https://www.flipkart.com/p/PID7", priority=10))
    resolved = resolve_listings(db, product.id, variant.id)
    assert [l.id for l in resolved] == [high.id, low.id]


def test_resolution_marketplace_filter(db):
    product, variant = _create_product(db, name="Res8", slug="res8")
    amazon = create_listing(db, _make_listing_data(product.id, variant_id=variant.id))
    create_listing(db, _make_listing_data(
        product.id, variant_id=variant.id, marketplace="FLIPKART",
        ext_id="PID8", url="https://www.flipkart.com/p/PID8"))
    resolved = resolve_listings(db, product.id, variant.id, marketplace="AMAZON")
    assert [l.id for l in resolved] == [amazon.id]


# ─── Batch resolution ─────────────────────────────────────────────────────────


def test_batch_resolves_multiple_without_n_plus_1(db):
    p1, v1 = _create_product(db, name="BatchP1", slug="batchp1")
    p2, _ = _create_product(db, name="BatchP2", slug="batchp2")
    create_listing(db, _make_listing_data(p1.id, variant_id=v1.id, ext_id="B1"))
    create_listing(db, _make_listing_data(
        p2.id, variant_id=None, marketplace="FLIPKART",
        ext_id="P2", url="https://www.flipkart.com/p/P2"))

    counter = {"n": 0}
    engine = db.get_bind()

    def _count(conn, cursor, statement, parameters, context, executemany):
        lowered = (statement or "").lower()
        if lowered.startswith("select") and "marketplace_listings" in lowered:
            counter["n"] += 1

    event.listen(engine, "before_cursor_execute", _count)
    try:
        results = resolve_batch(db, [
            ResolveItem(product_id=p1.id, variant_id=v1.id),
            ResolveItem(product_id=p2.id, variant_id=None),
        ])
    finally:
        event.remove(engine, "before_cursor_execute", _count)

    assert counter["n"] == 1, "resolve_batch must use a single query"
    assert len(results) == 2
    assert results[0]["product_id"] == p1.id
    assert results[0]["listings"][0].external_product_id == "B1"
    assert results[1]["product_id"] == p2.id
    assert results[1]["listings"][0].external_product_id == "P2"


# ─── Click tracking ───────────────────────────────────────────────────────────


def test_click_valid_redirect_derived_from_db(client, db):
    product, variant = _create_product(db, name="ClickP", slug="clickp")
    listing = create_listing(db, _make_listing_data(product.id, variant_id=variant.id))
    product_id = product.id
    variant_id = variant.id
    resp = client.post("/api/v1/marketplace/clicks", json={
        "marketplace_listing_id": listing.id,
        "product_id": product_id,
        "variant_id": variant_id,
        "source_page": "product_detail",
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["redirect_url"] == listing.external_url
    assert body["marketplace"] == "AMAZON"

    click = db.query(MarketplaceRedirectClick).first()
    assert click is not None
    assert click.marketplace == "AMAZON"
    assert click.marketplace_listing_id == listing.id
    assert click.product_id == product_id
    assert click.variant_id == variant_id
    assert click.source_page == "product_detail"


def test_click_inactive_listing_rejected(client, db):
    product, variant = _create_product(db, name="ClickIn", slug="clickin")
    listing = create_listing(db, _make_listing_data(product.id, variant_id=variant.id, is_active=False))
    resp = client.post("/api/v1/marketplace/clicks", json={
        "marketplace_listing_id": listing.id,
        "product_id": product.id,
        "variant_id": variant.id,
    })
    assert resp.status_code == 400


def test_click_wrong_product_rejected(client, db):
    product, variant = _create_product(db, name="ClickW", slug="clickw")
    other, _ = _create_product(db, name="ClickO", slug="clicko")
    listing = create_listing(db, _make_listing_data(product.id, variant_id=variant.id))
    resp = client.post("/api/v1/marketplace/clicks", json={
        "marketplace_listing_id": listing.id,
        "product_id": other.id,
        "variant_id": variant.id,
    })
    assert resp.status_code == 400


def test_click_invalid_variant_mapping_rejected(client, db):
    product, variant = _create_product(db, name="ClickV", slug="clickv")
    listing = create_listing(db, _make_listing_data(
        product.id, variant_id=None, ext_id="B0PROD", allow_variant_fallback=False))
    resp = client.post("/api/v1/marketplace/clicks", json={
        "marketplace_listing_id": listing.id,
        "product_id": product.id,
        "variant_id": variant.id,
    })
    assert resp.status_code == 400


def test_click_tracking_failure_does_not_block_redirect(db):
    product, variant = _create_product(db, name="ClickF", slug="clickf")
    listing = create_listing(db, _make_listing_data(product.id, variant_id=variant.id))

    original_add = db.add

    def _boom(obj):
        if isinstance(obj, MarketplaceRedirectClick):
            raise RuntimeError("simulated tracking failure")
        return original_add(obj)

    db.add = _boom
    try:
        result = record_click(db, listing.id, product.id, variant.id)
    finally:
        db.add = original_add

    assert result["redirect_url"] == listing.external_url
    assert result["marketplace"] == "AMAZON"


# ─── Public API ───────────────────────────────────────────────────────────────


def test_public_product_listings_endpoint(client, db):
    product, variant = _create_product(db, name="PublicP", slug="publicp")
    listing = create_listing(db, _make_listing_data(product.id, variant_id=variant.id))
    resp = client.get(f"/api/v1/marketplace/products/{product.id}/listings?variant_id={variant.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == listing.id
    assert data[0]["is_product_level"] is False
    assert data[0]["marketplace"] == "AMAZON"
    assert data[0]["external_url"] == listing.external_url


def test_public_batch_resolve_endpoint(client, db):
    p1, v1 = _create_product(db, name="BatchA", slug="batcha")
    p2, _ = _create_product(db, name="BatchB", slug="batchb")
    create_listing(db, _make_listing_data(p1.id, variant_id=v1.id, ext_id="B1"))
    resp = client.post("/api/v1/marketplace/listings/resolve", json={
        "items": [
            {"product_id": p1.id, "variant_id": v1.id},
            {"product_id": p2.id, "variant_id": None},
        ]
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data) == 2
    assert data[0]["product_id"] == p1.id
    assert data[0]["listings"][0]["external_product_id"] == "B1"
    assert data[1]["listings"] == []


# ─── Feature flags ────────────────────────────────────────────────────────────


def test_flag_db_value_used_without_env(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = True
    db.commit()
    assert get_feature_flag(db, "direct_checkout_enabled") is True
    assert is_direct_checkout_enabled(db) is True


def test_flag_env_true_overrides_db_false(db, monkeypatch):
    monkeypatch.setattr(app_settings, "MARKETPLACE_PURCHASE_ENABLED", True)
    store = get_settings(db)
    store.marketplace_purchase_enabled = False
    db.commit()
    assert is_marketplace_purchase_enabled(db) is True


def test_flag_env_false_overrides_db_true(db, monkeypatch):
    monkeypatch.setattr(app_settings, "MARKETPLACE_PURCHASE_ENABLED", False)
    store = get_settings(db)
    store.marketplace_purchase_enabled = True
    db.commit()
    assert is_marketplace_purchase_enabled(db) is False


def test_flag_application_defaults_when_neither(db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    monkeypatch.setattr(app_settings, "MARKETPLACE_PURCHASE_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = None
    store.marketplace_purchase_enabled = None
    assert is_direct_checkout_enabled(db) is False
    assert is_marketplace_purchase_enabled(db) is True


def test_public_settings_exposes_marketplace_flag(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "MARKETPLACE_PURCHASE_ENABLED", None)
    store = get_settings(db)
    store.marketplace_purchase_enabled = True
    db.commit()
    resp = client.get("/api/v1/settings/public")
    assert resp.status_code == 200
    assert resp.json()["marketplace_purchase_enabled"] is True


# ─── Checkout gating (defense in depth) ──────────────────────────────────────


def _setup_buyer(client, db, email="buyer@test.com"):
    user = _create_user(db, email, RoleEnum.USER)
    token = _login_token(client, email)
    resp = client.post(
        "/api/v1/addresses",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "Test", "last_name": "Buyer", "phone": "9999999900",
            "email": email, "address_line_1": "1 Market St", "city": "New Delhi",
            "state": "Delhi", "postal_code": "110001", "country": "India",
        },
    )
    assert resp.status_code == 201, resp.text
    return user, token, resp.json()["id"]


def test_direct_checkout_disabled_rejects_order_placement(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = False
    db.commit()

    _, token, address_id = _setup_buyer(client, db)
    product, variant = _create_product(db, name="BuyMe", slug="buyme")

    resp = client.post(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [{"product_id": product.id, "quantity": 1, "variant_id": variant.id}],
            "shipping_address_id": address_id,
        },
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "DIRECT_CHECKOUT_DISABLED"


def test_checkout_endpoint_rejected_when_disabled(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = False
    db.commit()

    user, token, address_id = _setup_buyer(client, db, email="buyer2@test.com")
    product, variant = _create_product(db, name="BuyMe2", slug="buyme2")

    add_resp = client.post(
        f"/api/v1/cart/{product.id}?quantity=1&variant_id={variant.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert add_resp.status_code == 200, add_resp.text

    resp = client.post(
        "/api/v1/checkout",
        headers={"Authorization": f"Bearer {token}"},
        json={"shipping_address_id": address_id},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "DIRECT_CHECKOUT_DISABLED"


def test_cart_calculation_functional_when_checkout_disabled(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = False
    db.commit()

    user, token, _ = _setup_buyer(client, db, email="buyer3@test.com")
    product, variant = _create_product(db, name="BuyMe3", slug="buyme3")

    # Checkout gating must not break the calculation engine. The engine is
    # exercised directly (POST /cart/calculate is shadowed by an existing
    # /cart/{product_id} route registered earlier - pre-existing quirk).
    result = calculate_order(db, cart_items=[{
        "product_id": product.id,
        "category_id": product.category_id,
        "quantity": 2,
        "price": product.discount_price or product.price,
        "total": (product.discount_price or product.price) * 2,
        "variant_id": variant.id,
    }], user_id=user.id)
    assert result.item_count == 2
    assert result.subtotal == 200.0


def test_marketplace_api_functional_when_checkout_disabled(client, db, monkeypatch):
    monkeypatch.setattr(app_settings, "DIRECT_CHECKOUT_ENABLED", None)
    store = get_settings(db)
    store.direct_checkout_enabled = False
    db.commit()

    product, variant = _create_product(db, name="MktOk", slug="mktok")
    create_listing(db, _make_listing_data(product.id, variant_id=variant.id))
    resp = client.get(f"/api/v1/marketplace/products/{product.id}/listings?variant_id={variant.id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ─── Permissions ──────────────────────────────────────────────────────────────


def test_permission_constants_exist():
    assert Permissions.MARKETPLACE_VIEW == "marketplace:view"
    assert Permissions.MARKETPLACE_MANAGE == "marketplace:manage"


def test_role_permissions_mapping():
    assert has_permission(RoleEnum.SUPER_ADMIN, Permissions.MARKETPLACE_VIEW)
    assert has_permission(RoleEnum.SUPER_ADMIN, Permissions.MARKETPLACE_MANAGE)
    assert has_permission(RoleEnum.ADMIN, Permissions.MARKETPLACE_VIEW)
    assert has_permission(RoleEnum.ADMIN, Permissions.MARKETPLACE_MANAGE)
    assert has_permission(RoleEnum.MANAGER, Permissions.MARKETPLACE_VIEW)
    assert has_permission(RoleEnum.MANAGER, Permissions.MARKETPLACE_MANAGE)
    assert not has_permission(RoleEnum.USER, Permissions.MARKETPLACE_VIEW)
    assert not has_permission(RoleEnum.SUPPORT, Permissions.MARKETPLACE_MANAGE)
    assert not has_permission(RoleEnum.INVENTORY_MANAGER, Permissions.MARKETPLACE_MANAGE)


def test_admin_crud_permissions_and_flow(client, db):
    admin = _create_user(db, "mp-admin@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "mp-admin@test.com")
    product, _ = _create_product(db, name="CRUDP", slug="crudp")

    payload = {
        "product_id": product.id,
        "variant_id": None,
        "marketplace": "AMAZON",
        "external_product_id": "B0H6J3JRWT",
        "external_url": "https://www.amazon.in/dp/B0H6J3JRWT",
        "allow_variant_fallback": False,
        "is_active": True,
        "priority": 0,
    }

    resp = client.post(
        "/api/v1/admin/marketplace/listings",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert resp.status_code == 201, resp.text
    listing = resp.json()
    assert listing["marketplace"] == "AMAZON"
    assert listing["external_url"] == "https://www.amazon.in/dp/B0H6J3JRWT"

    resp = client.get(
        "/api/v1/admin/marketplace/listings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.put(
        f"/api/v1/admin/marketplace/listings/{listing['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False, "priority": 5},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["is_active"] is False
    assert resp.json()["priority"] == 5

    resp = client.delete(
        f"/api/v1/admin/marketplace/listings/{listing['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 204


def test_admin_crud_invalid_url_rejected(client, db):
    admin = _create_user(db, "mp-admin2@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "mp-admin2@test.com")
    product, _ = _create_product(db, name="BadURL", slug="badurl")

    resp = client.post(
        "/api/v1/admin/marketplace/listings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": product.id,
            "variant_id": None,
            "marketplace": "AMAZON",
            "external_product_id": "B0BAD",
            "external_url": "javascript:alert(1)",
        },
    )
    assert resp.status_code == 400


def test_unauthorized_role_rejected(client, db):
    user = _create_user(db, "regular@test.com", RoleEnum.USER)
    token = _login_token(client, "regular@test.com")
    product, _ = _create_product(db, name="NoPerm", slug="noperm")

    resp = client.post(
        "/api/v1/admin/marketplace/listings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": product.id,
            "variant_id": None,
            "marketplace": "AMAZON",
            "external_product_id": "B0X",
            "external_url": "https://www.amazon.in/dp/B0X",
        },
    )
    assert resp.status_code == 403

    resp = client.get(
        "/api/v1/admin/marketplace/listings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
