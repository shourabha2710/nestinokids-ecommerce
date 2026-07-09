from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    AnalyticsSummaryResponse,
    SalesTrendItem,
    TopProductItem,
    OrderStatusItem,
    LowStockItem,
)
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.services import analytics_service
from typing import List

router = APIRouter(prefix="/api/v1/admin/analytics", tags=["admin-analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def sales_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    return analytics_service.get_sales_summary(db, days)


@router.get("/sales-trend", response_model=List[SalesTrendItem])
def sales_trend(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    return analytics_service.get_sales_trend(db, days)


@router.get("/top-products", response_model=List[TopProductItem])
def top_products(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    return analytics_service.get_top_products(db, limit)


@router.get("/order-status", response_model=List[OrderStatusItem])
def order_status_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    return analytics_service.get_order_status_breakdown(db)


@router.get("/low-stock", response_model=List[LowStockItem])
def low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    return analytics_service.get_low_stock_products(db)
