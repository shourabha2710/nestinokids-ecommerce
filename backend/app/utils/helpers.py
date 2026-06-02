from slugify import slugify
from sqlalchemy.orm import Session
from app.models.models import Product, Category
from datetime import datetime
import uuid


def generate_slug(text: str) -> str:
    """Generate URL-friendly slug from text"""
    return slugify(text)


def generate_order_number() -> str:
    """Generate unique order number"""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"ORD-{timestamp}-{unique_id}"


def generate_sku(category_name: str, product_name: str) -> str:
    """Generate SKU for product"""
    cat_code = category_name[:3].upper()
    prod_code = product_name[:3].upper()
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_id = str(uuid.uuid4())[:6].upper()
    return f"{cat_code}{prod_code}{timestamp}{unique_id}"


def calculate_discount_percentage(original_price: float, discount_price: float) -> int:
    """Calculate discount percentage"""
    if original_price <= 0:
        return 0
    discount = ((original_price - discount_price) / original_price) * 100
    return int(round(discount))


def get_product_by_slug(db: Session, slug: str):
    """Get product by slug"""
    return db.query(Product).filter(Product.slug == slug).first()


def get_category_by_slug(db: Session, slug: str):
    """Get category by slug"""
    return db.query(Category).filter(Category.slug == slug).first()
