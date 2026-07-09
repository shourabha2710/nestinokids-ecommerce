from datetime import datetime, timedelta, timezone

from sqlalchemy import func, cast, Date, text
from sqlalchemy.orm import Session

from app.models.models import Order, OrderItem, OrderStatusEnum, User, Inventory, Product, ProductImage


DELIVERED = "DELIVERED"
PENDING = "PENDING"


def get_sales_summary(db: Session, days: int = 30) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    delivered_orders = db.query(Order).filter(
        Order.status == DELIVERED,
        Order.created_at >= cutoff,
    ).all()

    total_revenue = sum(o.final_amount for o in delivered_orders)
    total_orders = len(delivered_orders)
    total_customers = len(set(o.user_id for o in delivered_orders))

    pending_count = db.query(func.count(Order.id)).filter(
        Order.status == PENDING,
    ).scalar() or 0

    return {
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "average_order_value": round(total_revenue / total_orders, 2) if total_orders > 0 else 0,
        "total_customers": total_customers,
        "pending_orders": pending_count,
    }


def get_sales_trend(db: Session, days: int = 30) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (
        db.query(
            cast(Order.created_at, Date).label("date"),
            func.sum(Order.final_amount).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .filter(
            Order.status == DELIVERED,
            Order.created_at >= cutoff,
        )
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date))
        .all()
    )

    return [
        {"date": str(row.date), "revenue": round(float(row.revenue), 2), "orders": row.orders}
        for row in rows
    ]


def get_top_products(db: Session, limit: int = 10) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)

    rows = (
        db.query(
            OrderItem.product_id,
            func.sum(OrderItem.quantity).label("sold_qty"),
            func.sum(OrderItem.total).label("revenue"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.status == DELIVERED,
            Order.created_at >= cutoff,
        )
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )

    results = []
    for row in rows:
        product = db.query(Product).filter(Product.id == row.product_id).first()
        image = None
        if product:
            primary = (
                db.query(ProductImage)
                .filter(ProductImage.product_id == product.id, ProductImage.is_primary == True)
                .first()
            )
            if primary:
                image = primary.image_url
            if not image:
                first_img = (
                    db.query(ProductImage)
                    .filter(ProductImage.product_id == product.id)
                    .first()
                )
                if first_img:
                    image = first_img.image_url

        results.append({
            "product_id": row.product_id,
            "name": product.name if product else "Unknown",
            "image": image,
            "sold_quantity": int(row.sold_qty),
            "revenue": round(float(row.revenue), 2),
        })

    return results


def get_order_status_breakdown(db: Session) -> list[dict]:
    rows = (
        db.query(
            Order.status,
            func.count(Order.id).label("count"),
        )
        .group_by(Order.status)
        .order_by(Order.status)
        .all()
    )

    return [
        {"status": str(row.status), "count": row.count}
        for row in rows
    ]


def get_low_stock_products(db: Session) -> list[dict]:
    rows = (
        db.query(Inventory)
        .filter(Inventory.available_quantity < Inventory.low_stock_threshold)
        .all()
    )

    results = []
    for inv in rows:
        product = db.query(Product).filter(Product.id == inv.product_id).first()
        image = None
        if product:
            primary = (
                db.query(ProductImage)
                .filter(ProductImage.product_id == product.id, ProductImage.is_primary == True)
                .first()
            )
            if primary:
                image = primary.image_url

        results.append({
            "product_id": inv.product_id,
            "name": product.name if product else "Unknown",
            "image": image,
            "available_quantity": inv.available_quantity,
            "low_stock_threshold": inv.low_stock_threshold,
        })

    return results
