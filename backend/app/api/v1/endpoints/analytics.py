from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
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
from app.services import analytics_service, report_export_service
from typing import List, Optional

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


@router.get("/export/sales")
def export_sales(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    csv_content = report_export_service.generate_sales_csv(db, start_date, end_date)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales-report.csv"},
    )


@router.get("/export/products")
def export_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    csv_content = report_export_service.generate_products_csv(db)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products-report.csv"},
    )


@router.get("/export/inventory")
def export_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.REPORT_VIEW)),
):
    csv_content = report_export_service.generate_inventory_csv(db)
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory-report.csv"},
    )
