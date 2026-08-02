"""Phase 23.9E — Marketplace click analytics aggregation.

Aggregates `MarketplaceRedirectClick` rows into the admin analytics payload.
Clicks are reported as clicks only — never labeled as sales/orders/revenue.
Private fields (ip_address, user_agent) are never returned.
"""
import logging
from datetime import datetime, time, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    MarketplaceRedirectClick,
    Product,
    ProductVariant,
)
from app.services.marketplace_service import validate_marketplace

logger = logging.getLogger(__name__)

# A 365-day cap keeps the gap-filled daily trend from generating thousands of
# zero-day records (mirrors the existing analytics `days Query(ge=1, le=365)`).
MAX_ANALYTICS_DAYS = 365
DEFAULT_DAYS = 30
DEFAULT_RECENT_LIMIT = 10
MAX_RECENT_LIMIT = 50
UNKNOWN_LABEL = "unknown"


def _parse_date(value: Optional[str], field: str) -> Optional[datetime]:
    if value is None:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Invalid {field}: expected YYYY-MM-DD")


def _resolve_date_range(
    start_date: Optional[str],
    end_date: Optional[str],
) -> Tuple[datetime, datetime]:
    """Normalize to day-inclusive UTC boundaries (start 00:00:00, end 23:59:59.999999)."""
    start = _parse_date(start_date, "start_date")
    end = _parse_date(end_date, "end_date")

    if end is None:
        end = datetime.now(timezone.utc)
    else:
        end = end.replace(tzinfo=timezone.utc)
    end = end.replace(
        hour=time.max.hour,
        minute=time.max.minute,
        second=time.max.second,
        microsecond=time.max.microsecond,
    )

    if start is None:
        start = end - timedelta(days=DEFAULT_DAYS - 1)
    else:
        start = start.replace(tzinfo=timezone.utc)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    if start > end:
        raise ValueError("start_date cannot be after end_date")
    if (end - start).days + 1 > MAX_ANALYTICS_DAYS:
        raise ValueError(f"Date range cannot exceed {MAX_ANALYTICS_DAYS} days")
    return start, end


def _click_filters(
    start: datetime,
    end: datetime,
    marketplace: Optional[str],
    product_id: Optional[int],
    source_page: Optional[str],
) -> List:
    filters = [
        MarketplaceRedirectClick.clicked_at >= start,
        MarketplaceRedirectClick.clicked_at <= end,
    ]
    if marketplace:
        filters.append(MarketplaceRedirectClick.marketplace == validate_marketplace(marketplace))
    if product_id is not None:
        filters.append(MarketplaceRedirectClick.product_id == product_id)
    if source_page:
        if source_page == UNKNOWN_LABEL:
            filters.append(MarketplaceRedirectClick.source_page.is_(None))
        else:
            filters.append(MarketplaceRedirectClick.source_page == source_page)
    return filters


def _variant_label(variant) -> Optional[str]:
    if variant is None:
        return None
    parts = [p for p in (variant.size, variant.color) if p]
    return " / ".join(parts) or None


def get_click_analytics(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    marketplace: Optional[str] = None,
    product_id: Optional[int] = None,
    source_page: Optional[str] = None,
    recent_limit: int = DEFAULT_RECENT_LIMIT,
) -> dict:
    start, end = _resolve_date_range(start_date, end_date)
    filters = _click_filters(start, end, marketplace, product_id, source_page)

    # ─── Summary ────────────────────────────────────────────────────────────
    total_clicks = db.query(MarketplaceRedirectClick).filter(*filters).count()
    denominator = total_clicks or 1

    # ─── Marketplace breakdown ──────────────────────────────────────────────
    marketplace_breakdown = [
        {
            "marketplace": row[0],
            "clicks": row[1],
            "share": round(row[1] / denominator * 100, 1),
        }
        for row in db.query(
            MarketplaceRedirectClick.marketplace,
            func.count(MarketplaceRedirectClick.id),
        )
        .filter(*filters)
        .group_by(MarketplaceRedirectClick.marketplace)
        .order_by(func.count(MarketplaceRedirectClick.id).desc())
        .all()
    ]

    # ─── Source-page breakdown (NULL -> "unknown") ─────────────────────────
    source_breakdown = [
        {
            "source_page": row[0],
            "clicks": row[1],
            "share": round(row[1] / denominator * 100, 1),
        }
        for row in db.query(
            func.coalesce(MarketplaceRedirectClick.source_page, UNKNOWN_LABEL),
            func.count(MarketplaceRedirectClick.id),
        )
        .filter(*filters)
        .group_by(func.coalesce(MarketplaceRedirectClick.source_page, UNKNOWN_LABEL))
        .order_by(func.count(MarketplaceRedirectClick.id).desc())
        .all()
    ]

    # ─── Daily trend (gap-filled) ──────────────────────────────────────────
    trend_counts = {
        str(day): count
        for day, count in db.query(
            func.date(MarketplaceRedirectClick.clicked_at),
            func.count(MarketplaceRedirectClick.id),
        )
        .filter(*filters)
        .group_by(func.date(MarketplaceRedirectClick.clicked_at))
        .all()
    }
    daily_trend = []
    cursor = start.date()
    last = end.date()
    while cursor <= last:
        key = cursor.isoformat()
        daily_trend.append({"date": key, "clicks": trend_counts.get(key, 0)})
        cursor += timedelta(days=1)

    # ─── Top products (single GROUP BY, no N+1) ────────────────────────────
    per_product: Dict[int, dict] = {}
    for row in (
        db.query(
            MarketplaceRedirectClick.product_id,
            MarketplaceRedirectClick.marketplace,
            func.coalesce(MarketplaceRedirectClick.source_page, UNKNOWN_LABEL),
            func.count(MarketplaceRedirectClick.id),
        )
        .filter(*filters, MarketplaceRedirectClick.product_id.isnot(None))
        .group_by(
            MarketplaceRedirectClick.product_id,
            MarketplaceRedirectClick.marketplace,
            func.coalesce(MarketplaceRedirectClick.source_page, UNKNOWN_LABEL),
        )
        .all()
    ):
        product_id_val, mk, src, count = row
        agg = per_product.setdefault(product_id_val, {
            "product_id": product_id_val,
            "clicks": 0,
            "marketplace_clicks": {},
            "source_clicks": {},
        })
        agg["clicks"] += count
        agg["marketplace_clicks"][mk] = agg["marketplace_clicks"].get(mk, 0) + count
        agg["source_clicks"][src] = agg["source_clicks"].get(src, 0) + count

    # ─── Recent clicks ─────────────────────────────────────────────────────
    recent_rows = (
        db.query(MarketplaceRedirectClick)
        .filter(*filters)
        .order_by(
            MarketplaceRedirectClick.clicked_at.desc(),
            MarketplaceRedirectClick.id.desc(),
        )
        .limit(recent_limit)
        .all()
    )

    # ─── Bulk lookups (products + variants) ────────────────────────────────
    product_ids = set(per_product.keys())
    product_ids.update(
        r.product_id for r in recent_rows if r.product_id is not None
    )
    product_map: Dict[int, Product] = {}
    if product_ids:
        for p in db.query(Product).filter(Product.id.in_(product_ids)).all():
            product_map[p.id] = p

    variant_ids = {r.variant_id for r in recent_rows if r.variant_id is not None}
    variant_map: Dict[int, ProductVariant] = {}
    if variant_ids:
        for v in db.query(ProductVariant).filter(ProductVariant.id.in_(variant_ids)).all():
            variant_map[v.id] = v

    def _product_name(pid: Optional[int]) -> Optional[str]:
        if pid is None:
            return None
        product = product_map.get(pid)
        return product.name if product else f"Product #{pid}"

    top_products = []
    for pid in sorted(
        per_product,
        key=lambda p: (-per_product[p]["clicks"], p),
    ):
        agg = per_product[pid]
        product = product_map.get(pid)
        top_products.append({
            "product_id": pid,
            "name": product.name if product else f"Product #{pid}",
            "is_active": bool(product.is_active) if product else True,
            "clicks": agg["clicks"],
            "marketplace_clicks": agg["marketplace_clicks"],
            "source_clicks": agg["source_clicks"],
        })

    recent_clicks = [
        {
            "id": click.id,
            "marketplace": click.marketplace,
            "product_id": click.product_id,
            "product_name": _product_name(click.product_id),
            "variant_id": click.variant_id,
            "variant_label": _variant_label(
                variant_map.get(click.variant_id) if click.variant_id is not None else None
            ),
            "source_page": click.source_page,
            "clicked_at": click.clicked_at,
        }
        for click in recent_rows
    ]

    return {
        "summary": {"total_clicks": total_clicks},
        "marketplace_breakdown": marketplace_breakdown,
        "source_breakdown": source_breakdown,
        "daily_trend": daily_trend,
        "top_products": top_products,
        "recent_clicks": recent_clicks,
    }
