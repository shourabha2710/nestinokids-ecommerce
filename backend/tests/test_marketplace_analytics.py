"""Phase 23.9E — Marketplace click analytics tests."""
import pytest
from sqlalchemy import event
from datetime import datetime, timedelta, timezone

from app.core.permissions import Permissions
from app.core.security import hash_password
from app.models.models import (
    User, RoleEnum, Category, Product, ProductVariant, Inventory,
    MarketplaceRedirectClick,
)
from app.services.marketplace_service import create_listing
from tests.test_marketplace import (
    _create_user,
    _login_token,
    _create_product,
    _make_listing_data,
)


# ─── helpers ──────────────────────────────────────────────────────────────────


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _today():
    return datetime.now(timezone.utc).date()


def _dt(hour=10, minute=0, second=0, day_offset=0):
    base = datetime(
        _today().year, _today().month, _today().day,
        hour, minute, second, tzinfo=timezone.utc,
    )
    return base + timedelta(days=day_offset)


def _record_click(db, marketplace="AMAZON", product_id=None, variant_id=None,
                  source_page=None, clicked_at=None):
    click = MarketplaceRedirectClick(
        marketplace=marketplace,
        product_id=product_id,
        variant_id=variant_id,
        source_page=source_page,
        ip_address="127.0.0.1",
        user_agent="pytest-agent",
        clicked_at=clicked_at or datetime.now(timezone.utc),
    )
    db.add(click)
    db.commit()
    db.refresh(click)
    return click


def _find_keys(obj, key):
    results = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                results.append(v)
            results.extend(_find_keys(v, key))
    elif isinstance(obj, list):
        for item in obj:
            results.extend(_find_keys(item, key))
    return results


# ─── Access control ───────────────────────────────────────────────────────────


def test_analytics_requires_authentication(client, db):
    resp = client.get("/api/v1/admin/marketplace/analytics")
    assert resp.status_code == 401


def test_analytics_forbidden_for_user_role(client, db):
    _create_user(db, "analytics-user@test.com", RoleEnum.USER)
    token = _login_token(client, "analytics-user@test.com")
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    assert resp.status_code == 403


def test_analytics_allowed_for_manager(client, db):
    _create_user(db, "analytics-mgr@test.com", RoleEnum.MANAGER)
    token = _login_token(client, "analytics-mgr@test.com")
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    assert resp.status_code == 200


# ─── Empty / summary ──────────────────────────────────────────────────────────


def test_analytics_empty_response_zeroed(client, db):
    _create_user(db, "analytics-empty@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-empty@test.com")
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["summary"]["total_clicks"] == 0
    assert body["marketplace_breakdown"] == []
    assert body["source_breakdown"] == []
    assert body["top_products"] == []
    assert body["recent_clicks"] == []
    assert len(body["daily_trend"]) == 30
    assert all(item["clicks"] == 0 for item in body["daily_trend"])


# ─── Marketplace breakdown ────────────────────────────────────────────────────


def test_analytics_amazon_only_breakdown(client, db):
    _create_user(db, "analytics-amz@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-amz@test.com")
    product, _ = _create_product(db, name="AmzProd", slug="amzprod")
    for _ in range(3):
        _record_click(db, marketplace="AMAZON", product_id=product.id)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    assert body["summary"]["total_clicks"] == 3
    assert len(body["marketplace_breakdown"]) == 1
    assert body["marketplace_breakdown"][0]["marketplace"] == "AMAZON"
    assert body["marketplace_breakdown"][0]["clicks"] == 3
    assert body["marketplace_breakdown"][0]["share"] == 100.0


def test_analytics_flipkart_only_breakdown(client, db):
    _create_user(db, "analytics-flip@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-flip@test.com")
    product, _ = _create_product(db, name="FlipProd", slug="flipprod")
    _record_click(db, marketplace="FLIPKART", product_id=product.id)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    assert body["summary"]["total_clicks"] == 1
    assert body["marketplace_breakdown"][0]["marketplace"] == "FLIPKART"
    assert body["marketplace_breakdown"][0]["share"] == 100.0


def test_analytics_mixed_breakdown_shares(client, db):
    _create_user(db, "analytics-mix@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-mix@test.com")
    product, _ = _create_product(db, name="MixProd", slug="mixprod")
    for _ in range(3):
        _record_click(db, marketplace="AMAZON", product_id=product.id)
    _record_click(db, marketplace="FLIPKART", product_id=product.id)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    breakdown = {b["marketplace"]: b for b in body["marketplace_breakdown"]}
    assert body["summary"]["total_clicks"] == 4
    assert breakdown["AMAZON"]["clicks"] == 3
    assert breakdown["AMAZON"]["share"] == 75.0
    assert breakdown["FLIPKART"]["clicks"] == 1
    assert breakdown["FLIPKART"]["share"] == 25.0
    assert [b["marketplace"] for b in body["marketplace_breakdown"]] == ["AMAZON", "FLIPKART"]


# ─── Source breakdown ─────────────────────────────────────────────────────────


def test_analytics_source_breakdown(client, db):
    _create_user(db, "analytics-src@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-src@test.com")
    product, _ = _create_product(db, name="SrcProd", slug="srcprod")
    _record_click(db, product_id=product.id, source_page="product_detail")
    _record_click(db, product_id=product.id, source_page="product_detail")
    _record_click(db, product_id=product.id, source_page="cart")
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    by_source = {b["source_page"]: b for b in body["source_breakdown"]}
    assert body["summary"]["total_clicks"] == 3
    assert by_source["product_detail"]["clicks"] == 2
    assert by_source["product_detail"]["share"] == round(2 / 3 * 100, 1)
    assert by_source["cart"]["clicks"] == 1
    assert by_source["cart"]["share"] == round(1 / 3 * 100, 1)


def test_analytics_null_source_becomes_unknown(client, db):
    _create_user(db, "analytics-null@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-null@test.com")
    product, _ = _create_product(db, name="NullSrc", slug="nullsrc")
    _record_click(db, product_id=product.id, source_page=None)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    assert body["source_breakdown"][0]["source_page"] == "unknown"
    assert body["source_breakdown"][0]["clicks"] == 1
    assert body["source_breakdown"][0]["share"] == 100.0


# ─── Date range ───────────────────────────────────────────────────────────────


def test_analytics_date_range_filtering(client, db):
    _create_user(db, "analytics-range@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-range@test.com")
    product, _ = _create_product(db, name="RangeProd", slug="rangeprod")
    _record_click(db, product_id=product.id, clicked_at=_dt(hour=10))
    _record_click(db, product_id=product.id, clicked_at=_dt(hour=10, day_offset=-1))
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"start_date": _today().isoformat(), "end_date": _today().isoformat()},
        headers=_auth(token),
    )
    body = resp.json()
    assert body["summary"]["total_clicks"] == 1
    assert body["recent_clicks"][0]["product_id"] == product.id


def test_analytics_start_date_inclusive(client, db):
    _create_user(db, "analytics-start@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-start@test.com")
    product, _ = _create_product(db, name="StartIncl", slug="startincl")
    _record_click(db, product_id=product.id, clicked_at=_dt(hour=0))
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"start_date": _today().isoformat(), "end_date": _today().isoformat()},
        headers=_auth(token),
    )
    assert resp.json()["summary"]["total_clicks"] == 1


def test_analytics_end_date_inclusive(client, db):
    _create_user(db, "analytics-end@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-end@test.com")
    product, _ = _create_product(db, name="EndIncl", slug="endincl")
    _record_click(db, product_id=product.id, clicked_at=_dt(hour=23, minute=59, second=59))
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"start_date": _today().isoformat(), "end_date": _today().isoformat()},
        headers=_auth(token),
    )
    assert resp.json()["summary"]["total_clicks"] == 1


# ─── Filters ─────────────────────────────────────────────────────────────────


def test_analytics_marketplace_filter_param(client, db):
    _create_user(db, "analytics-mkt@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-mkt@test.com")
    product, _ = _create_product(db, name="MktFilt", slug="mktfilt")
    _record_click(db, marketplace="AMAZON", product_id=product.id)
    _record_click(db, marketplace="FLIPKART", product_id=product.id)
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"marketplace": "FLIPKART"},
        headers=_auth(token),
    )
    body = resp.json()
    assert body["summary"]["total_clicks"] == 1
    assert len(body["marketplace_breakdown"]) == 1
    assert body["marketplace_breakdown"][0]["marketplace"] == "FLIPKART"


def test_analytics_product_filter_param(client, db):
    _create_user(db, "analytics-pf@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-pf@test.com")
    p1, _ = _create_product(db, name="FiltA", slug="filta")
    p2, _ = _create_product(db, name="FiltB", slug="filtb")
    _record_click(db, product_id=p1.id)
    _record_click(db, product_id=p1.id)
    _record_click(db, product_id=p2.id)
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"product_id": p1.id},
        headers=_auth(token),
    )
    body = resp.json()
    assert body["summary"]["total_clicks"] == 2
    assert len(body["top_products"]) == 1
    assert body["top_products"][0]["product_id"] == p1.id


def test_analytics_source_page_filter_param(client, db):
    _create_user(db, "analytics-sf@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-sf@test.com")
    product, _ = _create_product(db, name="SrcFilt", slug="srcfilt")
    _record_click(db, product_id=product.id, source_page="product_detail")
    _record_click(db, product_id=product.id, source_page=None)
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"source_page": "product_detail"},
        headers=_auth(token),
    )
    assert resp.json()["summary"]["total_clicks"] == 1
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"source_page": "unknown"},
        headers=_auth(token),
    )
    assert resp.json()["summary"]["total_clicks"] == 1


# ─── Daily trend ──────────────────────────────────────────────────────────────


def test_analytics_daily_trend_gap_filled(client, db):
    _create_user(db, "analytics-trend@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-trend@test.com")
    product, _ = _create_product(db, name="Trend", slug="trend")
    today = _today()
    _record_click(db, product_id=product.id, clicked_at=_dt(day_offset=0))
    _record_click(db, product_id=product.id, clicked_at=_dt(day_offset=-5))
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={
            "start_date": (today - timedelta(days=6)).isoformat(),
            "end_date": today.isoformat(),
        },
        headers=_auth(token),
    )
    body = resp.json()
    trend = {item["date"]: item["clicks"] for item in body["daily_trend"]}
    assert len(body["daily_trend"]) == 7
    assert trend[today.isoformat()] == 1
    assert trend[(today - timedelta(days=5)).isoformat()] == 1
    assert trend[(today - timedelta(days=3)).isoformat()] == 0
    assert trend[(today - timedelta(days=1)).isoformat()] == 0


# ─── Top products ─────────────────────────────────────────────────────────────


def test_analytics_top_products_aggregated(client, db):
    _create_user(db, "analytics-top@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-top@test.com")
    product, _ = _create_product(db, name="TopAgg", slug="topagg")
    _record_click(db, marketplace="AMAZON", product_id=product.id, source_page="product_detail")
    _record_click(db, marketplace="AMAZON", product_id=product.id, source_page="cart")
    _record_click(db, marketplace="FLIPKART", product_id=product.id, source_page="cart")
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    top = body["top_products"][0]
    assert top["product_id"] == product.id
    assert top["name"] == "TopAgg"
    assert top["is_active"] is True
    assert top["clicks"] == 3
    assert top["marketplace_clicks"] == {"AMAZON": 2, "FLIPKART": 1}
    assert top["source_clicks"] == {"product_detail": 1, "cart": 2}


def test_analytics_top_products_ordered_by_clicks(client, db):
    _create_user(db, "analytics-ord@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-ord@test.com")
    p1, _ = _create_product(db, name="LessClicked", slug="lessclicked")
    p2, _ = _create_product(db, name="MoreClicked", slug="moreclicked")
    _record_click(db, product_id=p2.id)
    _record_click(db, product_id=p2.id)
    _record_click(db, product_id=p1.id)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    ids = [t["product_id"] for t in resp.json()["top_products"]]
    assert ids == [p2.id, p1.id]


def test_analytics_deleted_product_name_fallback(client, db):
    _create_user(db, "analytics-del@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-del@test.com")
    _record_click(db, product_id=999999)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    top = body["top_products"][0]
    assert top["product_id"] == 999999
    assert top["name"] == "Product #999999"
    assert top["is_active"] is True
    assert body["recent_clicks"][0]["product_name"] == "Product #999999"


def test_analytics_inactive_product_flag(client, db):
    _create_user(db, "analytics-in@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-in@test.com")
    product, _ = _create_product(db, name="Inactive", slug="inactive")
    product.is_active = False
    db.commit()
    _record_click(db, product_id=product.id)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    assert resp.json()["top_products"][0]["is_active"] is False


# ─── Recent clicks ────────────────────────────────────────────────────────────


def test_analytics_recent_clicks_default_limit_and_order(client, db):
    _create_user(db, "analytics-rec@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-rec@test.com")
    product, _ = _create_product(db, name="Recent", slug="recent")
    for offset in range(12):
        _record_click(db, product_id=product.id, clicked_at=_dt(hour=offset % 24))
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    recent = resp.json()["recent_clicks"]
    assert len(recent) == 10
    ids = [c["id"] for c in recent]
    assert ids == sorted(ids, reverse=True)


def test_analytics_recent_clicks_limit_param(client, db):
    _create_user(db, "analytics-lim@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-lim@test.com")
    product, _ = _create_product(db, name="RecentL", slug="recentl")
    for _ in range(5):
        _record_click(db, product_id=product.id)
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"limit": 2},
        headers=_auth(token),
    )
    assert len(resp.json()["recent_clicks"]) == 2


def test_analytics_recent_click_variant_label(client, db):
    _create_user(db, "analytics-vl@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-vl@test.com")
    product, variant = _create_product(db, name="VarLabel", slug="varlabel")
    variant.color = "Blue"
    db.commit()
    _record_click(db, product_id=product.id, variant_id=variant.id)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    recent = resp.json()["recent_clicks"][0]
    assert recent["variant_id"] == variant.id
    assert recent["variant_label"] == "M / Blue"
    assert recent["product_name"] == "VarLabel"


def test_analytics_recent_click_variant_null(client, db):
    _create_user(db, "analytics-vn@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-vn@test.com")
    product, _ = _create_product(db, name="NoVar", slug="novar")
    _record_click(db, product_id=product.id, variant_id=None)
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    recent = resp.json()["recent_clicks"][0]
    assert recent["variant_id"] is None
    assert recent["variant_label"] is None


def test_analytics_recent_clicks_filters_product(client, db):
    _create_user(db, "analytics-rp@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-rp@test.com")
    p1, _ = _create_product(db, name="RecP1", slug="recp1")
    p2, _ = _create_product(db, name="RecP2", slug="recp2")
    _record_click(db, product_id=p1.id)
    _record_click(db, product_id=p2.id)
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"product_id": p2.id},
        headers=_auth(token),
    )
    recent = resp.json()["recent_clicks"]
    assert len(recent) == 1
    assert recent[0]["product_id"] == p2.id


# ─── Privacy & schema contract ────────────────────────────────────────────────


def test_analytics_never_exposes_privacy_fields(client, db):
    _create_user(db, "analytics-pv@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-pv@test.com")
    product, variant = _create_product(db, name="Privacy", slug="privacy")
    for _ in range(3):
        _record_click(db, product_id=product.id, variant_id=variant.id, source_page="product_detail")
    resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
    body = resp.json()
    assert _find_keys(body, "ip_address") == []
    assert _find_keys(body, "user_agent") == []
    assert set(body.keys()) == {
        "summary", "marketplace_breakdown", "source_breakdown",
        "daily_trend", "top_products", "recent_clicks",
    }


# ─── Validation ───────────────────────────────────────────────────────────────


def test_analytics_invalid_date_format_rejected(client, db):
    _create_user(db, "analytics-bad@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-bad@test.com")
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"start_date": "not-a-date"},
        headers=_auth(token),
    )
    assert resp.status_code == 400


def test_analytics_start_after_end_rejected(client, db):
    _create_user(db, "analytics-sae@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-sae@test.com")
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"start_date": "2026-08-02", "end_date": "2026-08-01"},
        headers=_auth(token),
    )
    assert resp.status_code == 400


def test_analytics_range_exceeds_max_rejected(client, db):
    _create_user(db, "analytics-max@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-max@test.com")
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"start_date": "2020-01-01", "end_date": "2026-08-01"},
        headers=_auth(token),
    )
    assert resp.status_code == 400


def test_analytics_invalid_marketplace_filter_rejected(client, db):
    _create_user(db, "analytics-im@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-im@test.com")
    resp = client.get(
        "/api/v1/admin/marketplace/analytics",
        params={"marketplace": "EBAY"},
        headers=_auth(token),
    )
    assert resp.status_code == 400


# ─── Performance (no N+1) ─────────────────────────────────────────────────────


def test_analytics_top_products_no_n_plus_1(db, client):
    _create_user(db, "analytics-n1@test.com", RoleEnum.ADMIN)
    token = _login_token(client, "analytics-n1@test.com")
    products = []
    for i in range(3):
        product, _ = _create_product(db, name=f"Perf{i}", slug=f"perf{i}")
        products.append(product)
    for i in range(3):
        _record_click(db, product_id=products[i].id)

    counter = {"n": 0}
    engine = db.get_bind()

    def _count(conn, cursor, statement, parameters, context, executemany):
        lowered = (statement or "").lower()
        if lowered.startswith("select") and "products" in lowered:
            counter["n"] += 1

    event.listen(engine, "before_cursor_execute", _count)
    try:
        resp = client.get("/api/v1/admin/marketplace/analytics", headers=_auth(token))
        assert resp.status_code == 200
    finally:
        event.remove(engine, "before_cursor_execute", _count)

    assert counter["n"] == 1, "product name lookups must be a single bulk query"
    assert len(resp.json()["top_products"]) == 3
