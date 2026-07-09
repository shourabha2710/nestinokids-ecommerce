import csv
import io
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import Order, Product, ProductVariant, Inventory, User, Category, OrderStatusEnum


def generate_sales_csv(db: Session, start_date: str = None, end_date: str = None) -> str:
    query = (
        db.query(Order, User)
        .join(User, Order.user_id == User.id)
    )

    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.filter(Order.created_at >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            query = query.filter(Order.created_at <= ed)
        except ValueError:
            pass

    rows = query.order_by(Order.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order ID", "Customer", "Email", "Date", "Status", "Total Amount"])

    for order, user in rows:
        writer.writerow([
            order.order_number,
            f"{user.first_name} {user.last_name}",
            user.email,
            order.created_at.strftime("%Y-%m-%d %H:%M:%S") if order.created_at else "",
            order.status.value if hasattr(order.status, "value") else str(order.status),
            round(order.final_amount, 2),
        ])

    return output.getvalue()


def generate_products_csv(db: Session) -> str:
    rows = (
        db.query(Product, Category)
        .join(Category, Product.category_id == Category.id)
        .order_by(Product.name)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Product ID", "Name", "Category", "Price", "Stock", "Status"])

    for product, category in rows:
        writer.writerow([
            product.id,
            product.name,
            category.name,
            round(product.price, 2),
            product.quantity,
            "Active" if product.is_active else "Inactive",
        ])

    return output.getvalue()


def generate_inventory_csv(db: Session) -> str:
    rows = (
        db.query(Inventory, Product, ProductVariant)
        .join(Product, Inventory.product_id == Product.id)
        .outerjoin(ProductVariant, ProductVariant.product_id == Product.id)
        .order_by(Product.name)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Product", "Variant", "Current Stock", "Threshold", "Status"])

    seen = set()
    for inv, product, variant in rows:
        key = (product.id, variant.id if variant else None)
        if key in seen:
            continue
        seen.add(key)

        variant_label = ""
        if variant:
            parts = []
            if variant.size:
                parts.append(variant.size)
            if variant.color:
                parts.append(variant.color)
            variant_label = " / ".join(parts)

        status = "Low Stock" if inv.available_quantity < inv.low_stock_threshold else "In Stock"
        writer.writerow([
            product.name,
            variant_label,
            inv.available_quantity,
            inv.low_stock_threshold,
            status,
        ])

    return output.getvalue()
