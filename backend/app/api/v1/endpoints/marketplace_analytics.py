from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.models import User
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.schemas.marketplace_schemas import MarketplaceAnalyticsResponse
from app.services.marketplace_analytics_service import (
    DEFAULT_RECENT_LIMIT,
    MAX_RECENT_LIMIT,
    get_click_analytics,
)

router = APIRouter(prefix="/api/v1/admin/marketplace/analytics", tags=["admin-marketplace"])


@router.get("", response_model=MarketplaceAnalyticsResponse)
def get_marketplace_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD, inclusive)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD, inclusive)"),
    marketplace: Optional[str] = Query(None, description="Marketplace code, e.g. AMAZON"),
    product_id: Optional[int] = Query(None, ge=1),
    source_page: Optional[str] = Query(None, description="Source page label; 'unknown' matches null"),
    limit: int = Query(DEFAULT_RECENT_LIMIT, ge=1, le=MAX_RECENT_LIMIT),
    admin: User = Depends(require_permission(Permissions.MARKETPLACE_VIEW)),
    db: Session = Depends(get_db),
):
    """Admin-only aggregated marketplace click analytics."""
    try:
        return get_click_analytics(
            db,
            start_date=start_date,
            end_date=end_date,
            marketplace=marketplace,
            product_id=product_id,
            source_page=source_page,
            recent_limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
