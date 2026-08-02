from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.models import User, MarketplaceListing
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.core.constants import AuditAction, AuditEntityType
from app.services.audit_service import audit_service
from app.services import marketplace_service
from app.schemas.marketplace_schemas import (
    ClickCreate,
    ClickResponse,
    MarketplaceListingCreate,
    MarketplaceListingResponse,
    MarketplaceListingUpdate,
    PublicMarketplaceListingResponse,
    ResolveRequest,
    ResolveResponse,
)

router = APIRouter(prefix="/api/v1/marketplace", tags=["marketplace"])


def _public_listing(listing: MarketplaceListing) -> dict:
    return {
        "id": listing.id,
        "marketplace": listing.marketplace,
        "external_product_id": listing.external_product_id,
        "external_url": listing.external_url,
        "display_label": listing.display_label,
        "variant_id": listing.variant_id,
        "is_product_level": listing.variant_id is None,
    }


@router.get("/products/{product_id}/listings", response_model=List[PublicMarketplaceListingResponse])
def get_product_listings(
    product_id: int,
    variant_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    """Return only resolved ACTIVE marketplace listings for a product."""
    resolved = marketplace_service.resolve_listings(db, product_id, variant_id)
    return [_public_listing(l) for l in resolved]


@router.post("/listings/resolve", response_model=List[ResolveResponse])
def resolve_batch_listings(
    data: ResolveRequest,
    db: Session = Depends(get_db),
):
    """Resolve marketplace options for many cart items efficiently (single query)."""
    results = marketplace_service.resolve_batch(db, data.items)
    return [
        {
            "product_id": r["product_id"],
            "variant_id": r["variant_id"],
            "listings": [_public_listing(l) for l in r["listings"]],
        }
        for r in results
    ]


@router.post("/clicks", response_model=ClickResponse)
def track_marketplace_click(
    data: ClickCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Record a marketplace redirect click.

    The redirect URL is derived server-side from the stored listing; the client
    never supplies an authoritative URL. Tracking failures never break the
    redirect response.
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    try:
        return marketplace_service.record_click(
            db,
            marketplace_listing_id=data.marketplace_listing_id,
            product_id=data.product_id,
            variant_id=data.variant_id,
            source_page=data.source_page,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# ─── Admin CRUD ───────────────────────────────────────────────────────────────

admin_router = APIRouter(prefix="/api/v1/admin/marketplace", tags=["admin-marketplace"])


@admin_router.get("/listings", response_model=List[MarketplaceListingResponse])
def admin_list_listings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    product_id: Optional[int] = Query(None, ge=1),
    marketplace: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    admin: User = Depends(require_permission(Permissions.MARKETPLACE_VIEW)),
    db: Session = Depends(get_db),
):
    return marketplace_service.list_listings(
        db,
        skip=skip,
        limit=limit,
        product_id=product_id,
        marketplace=marketplace,
        include_inactive=include_inactive,
    )


@admin_router.get("/listings/{listing_id}", response_model=MarketplaceListingResponse)
def admin_get_listing(
    listing_id: int,
    admin: User = Depends(require_permission(Permissions.MARKETPLACE_VIEW)),
    db: Session = Depends(get_db),
):
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")
    return listing


@admin_router.post("/listings", response_model=MarketplaceListingResponse, status_code=status.HTTP_201_CREATED)
def admin_create_listing(
    data: MarketplaceListingCreate,
    request: Request,
    admin: User = Depends(require_permission(Permissions.MARKETPLACE_MANAGE)),
    db: Session = Depends(get_db),
):
    try:
        listing = marketplace_service.create_listing(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    audit_service.create_log(
        db=db,
        user=admin,
        action=AuditAction.CREATE,
        entity_type=AuditEntityType.MARKETPLACE_LISTING,
        entity_id=listing.id,
        description=f"Created {listing.marketplace} listing for product {listing.product_id}",
        new_values={
            "product_id": listing.product_id,
            "variant_id": listing.variant_id,
            "marketplace": listing.marketplace,
            "external_product_id": listing.external_product_id,
            "external_url": listing.external_url,
        },
        request=request,
    )
    return listing


@admin_router.put("/listings/{listing_id}", response_model=MarketplaceListingResponse)
def admin_update_listing(
    listing_id: int,
    data: MarketplaceListingUpdate,
    request: Request,
    admin: User = Depends(require_permission(Permissions.MARKETPLACE_MANAGE)),
    db: Session = Depends(get_db),
):
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")

    old_values = {
        "variant_id": listing.variant_id,
        "marketplace": listing.marketplace,
        "external_product_id": listing.external_product_id,
        "external_url": listing.external_url,
        "allow_variant_fallback": listing.allow_variant_fallback,
        "is_active": listing.is_active,
        "priority": listing.priority,
    }

    try:
        updated = marketplace_service.update_listing(db, listing_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    audit_service.create_log(
        db=db,
        user=admin,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.MARKETPLACE_LISTING,
        entity_id=updated.id,
        description=f"Updated {updated.marketplace} listing for product {updated.product_id}",
        old_values=old_values,
        new_values={
            "variant_id": updated.variant_id,
            "marketplace": updated.marketplace,
            "external_product_id": updated.external_product_id,
            "external_url": updated.external_url,
            "allow_variant_fallback": updated.allow_variant_fallback,
            "is_active": updated.is_active,
            "priority": updated.priority,
        },
        request=request,
    )
    return updated


@admin_router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_listing(
    listing_id: int,
    request: Request,
    admin: User = Depends(require_permission(Permissions.MARKETPLACE_MANAGE)),
    db: Session = Depends(get_db),
):
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")

    old_values = {
        "product_id": listing.product_id,
        "variant_id": listing.variant_id,
        "marketplace": listing.marketplace,
        "external_product_id": listing.external_product_id,
        "external_url": listing.external_url,
    }
    try:
        marketplace_service.delete_listing(db, listing_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    audit_service.create_log(
        db=db,
        user=admin,
        action=AuditAction.DELETE,
        entity_type=AuditEntityType.MARKETPLACE_LISTING,
        entity_id=listing_id,
        description=f"Deleted {old_values['marketplace']} listing for product {old_values['product_id']}",
        old_values=old_values,
        request=request,
    )
