import logging
from typing import List, Optional

from sqlalchemy.orm import Session
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

from app.models.models import (
    MarketplaceCode,
    MarketplaceListing,
    MarketplaceRedirectClick,
    Product,
    ProductVariant,
)
from app.schemas.marketplace_schemas import MarketplaceListingCreate, MarketplaceListingUpdate
from app.services.settings_service import get_feature_flag

logger = logging.getLogger(__name__)


# ─── Feature flags ────────────────────────────────────────────────────────────

DIRECT_CHECKOUT_ENABLED_KEY = "direct_checkout_enabled"
MARKETPLACE_PURCHASE_ENABLED_KEY = "marketplace_purchase_enabled"


def is_direct_checkout_enabled(db: Session) -> bool:
    return get_feature_flag(db, DIRECT_CHECKOUT_ENABLED_KEY)


def is_marketplace_purchase_enabled(db: Session) -> bool:
    return get_feature_flag(db, MARKETPLACE_PURCHASE_ENABLED_KEY)


# ─── Marketplace validation ───────────────────────────────────────────────────

# Domain allowlists keyed by MarketplaceCode. Only official, legitimate
# domains for each marketplace are accepted. Add future marketplaces here.
MARKETPLACE_DOMAINS: dict[str, set[str]] = {
    MarketplaceCode.AMAZON.value: {"amazon.in", "www.amazon.in", "amazon.com", "www.amazon.com"},
    MarketplaceCode.FLIPKART.value: {"flipkart.com", "www.flipkart.com"},
    MarketplaceCode.MYNTRA.value: {"myntra.com", "www.myntra.com"},
    MarketplaceCode.FIRSTCRY.value: {"firstcry.com", "www.firstcry.com"},
    MarketplaceCode.MEESHO.value: {"meesho.com", "www.meesho.com"},
}

# Conservative allowlist of well-known tracking params that are safe to strip.
TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "tag", "ref", "psc", "smid", "th", "psr", "sprefix", "keywords", "gclid",
    "fbclid", "ref_", "pd_rd_r", "pd_rd_w", "pd_rd_wg", "pf_rd_r", "pf_rd_p",
}

ALLOWED_SCHEMES = {"https"}


def validate_marketplace(marketplace) -> str:
    """Return the normalized marketplace code or raise ValueError."""
    if isinstance(marketplace, MarketplaceCode):
        code = marketplace.value
    else:
        code = str(marketplace or "").strip().upper()
    valid = {m.value for m in MarketplaceCode}
    if code not in valid:
        raise ValueError(f"Unsupported marketplace: {marketplace!r}")
    return code


def _strip_tracking_params(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.query:
        return url
    pairs = parse_qsl(parsed.query, keep_blank_values=True)
    kept = [(k, v) for k, v in pairs if k.lower() not in TRACKING_PARAMS]
    if len(kept) == len(pairs):
        return url
    return urlunparse(parsed._replace(query=urlencode(kept)))


def validate_and_normalize_url(url: str, marketplace) -> str:
    """Validate and conservatively normalize a marketplace URL.

    - Stored URL is the source of truth; we never reconstruct URLs from ASIN/PID.
    - HTTPS only; HTTP is safely upgraded to HTTPS.
    - Host must be in the marketplace-specific allowlist.
    - Obvious tracking params are stripped; then the result is re-validated.
    """
    if not url or not url.strip():
        raise ValueError("URL is required")
    code = validate_marketplace(marketplace)

    raw = url.strip()
    parsed = urlparse(raw)
    scheme = (parsed.scheme or "").lower()
    if scheme == "http":
        raw = "https://" + raw[len("http://"):]
        parsed = urlparse(raw)
        scheme = parsed.scheme
    if scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"Unsupported URL scheme: {scheme or '(none)'}")

    host = (parsed.netloc or "").lower()
    allowed = MARKETPLACE_DOMAINS.get(code, set())
    if host not in allowed:
        raise ValueError(f"URL host '{host}' is not allowed for {code}")

    normalized = _strip_tracking_params(raw)

    # Re-validate the normalized URL (never trust intermediate steps).
    n = urlparse(normalized)
    if n.scheme not in ALLOWED_SCHEMES:
        raise ValueError("Normalized URL failed scheme validation")
    if (n.netloc or "").lower() not in allowed:
        raise ValueError("Normalized URL failed host validation")
    return normalized


# ─── Resolution ───────────────────────────────────────────────────────────────

def _apply_resolution(listings: List[MarketplaceListing], variant_id: Optional[int]) -> List[MarketplaceListing]:
    """Apply the resolution algorithm to an already-loaded, ordered list."""
    if variant_id is not None:
        exact = [l for l in listings if l.variant_id == variant_id]
        if exact:
            return exact
        return [l for l in listings if l.variant_id is None and l.allow_variant_fallback]
    return [l for l in listings if l.variant_id is None]


def resolve_listings(
    db: Session,
    product_id: int,
    variant_id: Optional[int] = None,
    marketplace: Optional[str] = None,
) -> List[MarketplaceListing]:
    """Resolve ACTIVE listings for a product (and optional variant).

    Order: priority DESC, then marketplace ASC. Exact variant matches are
    preferred; product-level fallback is only used when allow_variant_fallback
    is true. No external-SKU matching, no silent fallback.
    """
    query = db.query(MarketplaceListing).filter(
        MarketplaceListing.product_id == product_id,
        MarketplaceListing.is_active == True,  # noqa: E712
    )
    if marketplace:
        query = query.filter(MarketplaceListing.marketplace == validate_marketplace(marketplace))
    listings = (
        query
        .order_by(
            MarketplaceListing.priority.desc(),
            MarketplaceListing.marketplace.asc(),
        )
        .all()
    )
    return _apply_resolution(listings, variant_id)


def resolve_batch(db: Session, items) -> List[dict]:
    """Resolve many (product_id, variant_id) pairs with a single query (no N+1)."""
    if not items:
        return []
    product_ids = list({i.product_id for i in items})
    rows = (
        db.query(MarketplaceListing)
        .filter(
            MarketplaceListing.product_id.in_(product_ids),
            MarketplaceListing.is_active == True,  # noqa: E712
        )
        .order_by(
            MarketplaceListing.priority.desc(),
            MarketplaceListing.marketplace.asc(),
        )
        .all()
    )
    by_product: dict[int, List[MarketplaceListing]] = {}
    for row in rows:
        by_product.setdefault(row.product_id, []).append(row)

    results = []
    for item in items:
        product_listings = by_product.get(item.product_id, [])
        resolved = _apply_resolution(product_listings, item.variant_id)
        results.append({
            "product_id": item.product_id,
            "variant_id": item.variant_id,
            "listings": resolved,
        })
    return results


# ─── Admin CRUD ───────────────────────────────────────────────────────────────

def list_listings(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    product_id: Optional[int] = None,
    marketplace: Optional[str] = None,
    include_inactive: bool = False,
) -> List[MarketplaceListing]:
    query = db.query(MarketplaceListing)
    if not include_inactive:
        query = query.filter(MarketplaceListing.is_active == True)  # noqa: E712
    if product_id:
        query = query.filter(MarketplaceListing.product_id == product_id)
    if marketplace:
        query = query.filter(MarketplaceListing.marketplace == validate_marketplace(marketplace))
    return (
        query
        .order_by(MarketplaceListing.product_id.asc(), MarketplaceListing.priority.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def _find_duplicate(
    db: Session,
    product_id: int,
    marketplace: str,
    variant_id: Optional[int],
    exclude_id: Optional[int] = None,
) -> Optional[MarketplaceListing]:
    query = db.query(MarketplaceListing).filter(
        MarketplaceListing.product_id == product_id,
        MarketplaceListing.marketplace == marketplace,
    )
    if variant_id is None:
        query = query.filter(MarketplaceListing.variant_id.is_(None))
    else:
        query = query.filter(MarketplaceListing.variant_id == variant_id)
    if exclude_id is not None:
        query = query.filter(MarketplaceListing.id != exclude_id)
    return query.first()


def create_listing(db: Session, data: MarketplaceListingCreate) -> MarketplaceListing:
    marketplace = validate_marketplace(data.marketplace)
    external_url = validate_and_normalize_url(data.external_url, marketplace)

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise ValueError("Product not found")

    if data.variant_id is not None:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == data.variant_id,
            ProductVariant.product_id == data.product_id,
        ).first()
        if not variant:
            raise ValueError("Variant not found for this product")

    if _find_duplicate(db, data.product_id, marketplace, data.variant_id):
        raise ValueError("A listing for this product/variant/marketplace already exists")

    listing = MarketplaceListing(
        product_id=data.product_id,
        variant_id=data.variant_id,
        marketplace=marketplace,
        external_product_id=data.external_product_id,
        external_url=external_url,
        display_label=data.display_label,
        allow_variant_fallback=data.allow_variant_fallback,
        is_active=data.is_active,
        priority=data.priority,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


def update_listing(db: Session, listing_id: int, data: MarketplaceListingUpdate) -> MarketplaceListing:
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise ValueError("Listing not found")

    update_data = data.model_dump(exclude_unset=True)

    marketplace = listing.marketplace
    if "marketplace" in update_data and update_data["marketplace"] is not None:
        marketplace = validate_marketplace(update_data["marketplace"])
        update_data["marketplace"] = marketplace

    if "external_url" in update_data and update_data["external_url"] is not None:
        update_data["external_url"] = validate_and_normalize_url(update_data["external_url"], marketplace)

    new_variant_id = listing.variant_id
    if "variant_id" in update_data:
        new_variant_id = update_data["variant_id"]
        if new_variant_id is not None:
            variant = db.query(ProductVariant).filter(
                ProductVariant.id == new_variant_id,
                ProductVariant.product_id == listing.product_id,
            ).first()
            if not variant:
                raise ValueError("Variant not found for this product")

    if "product_id" not in update_data:
        if _find_duplicate(db, listing.product_id, marketplace, new_variant_id, exclude_id=listing.id):
            raise ValueError("A listing for this product/variant/marketplace already exists")

    for field, value in update_data.items():
        setattr(listing, field, value)

    db.commit()
    db.refresh(listing)
    return listing


def delete_listing(db: Session, listing_id: int) -> None:
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise ValueError("Listing not found")
    db.delete(listing)
    db.commit()


# ─── Click tracking ───────────────────────────────────────────────────────────

def record_click(
    db: Session,
    marketplace_listing_id: int,
    product_id: int,
    variant_id: Optional[int] = None,
    source_page: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> dict:
    """Validate a click and record it.

    The redirect URL is always derived from the stored listing — never from
    client-supplied input. A tracking-DB failure never blocks the redirect.
    """
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == marketplace_listing_id).first()
    if not listing:
        raise ValueError("Listing not found")
    if not listing.is_active:
        raise ValueError("Listing is not active")
    if listing.product_id != product_id:
        raise ValueError("Product does not match this listing")

    resolved_ids = {l.id for l in resolve_listings(db, product_id, variant_id)}
    if listing.id not in resolved_ids:
        raise ValueError("Listing is not a valid option for this product/variant")

    click = MarketplaceRedirectClick(
        marketplace_listing_id=listing.id,
        marketplace=listing.marketplace,
        product_id=product_id,
        variant_id=variant_id,
        source_page=source_page,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    try:
        db.add(click)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to record marketplace click for listing %s", marketplace_listing_id)

    return {
        "redirect_url": listing.external_url,
        "marketplace": listing.marketplace,
    }
