"""
Initial data seeding script for NestinoKids
"""

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import Category, Product, Banner
from app.utils.helpers import generate_slug
from datetime import datetime, timedelta


def seed_categories(db: Session):
    """Seed initial categories"""
    categories_data = [
        {
            "name": "Kids Bloomers",
            "description": "Comfortable and breathable bloomers for kids",
        },
        {
            "name": "Kids Camisoles",
            "description": "Soft camisoles perfect for everyday wear",
        },
        {
            "name": "Baby Booties",
            "description": "Cozy booties for your baby's little feet",
        },
        {
            "name": "Innerwear",
            "description": "Premium quality innerwear for kids",
        },
        {
            "name": "Nightwear",
            "description": "Comfortable nightwear for better sleep",
        },
    ]

    for cat_data in categories_data:
        existing = db.query(Category).filter(
            Category.slug == generate_slug(cat_data["name"])
        ).first()

        if not existing:
            category = Category(
                name=cat_data["name"],
                slug=generate_slug(cat_data["name"]),
                description=cat_data["description"],
                is_active=True,
            )
            db.add(category)

    db.commit()
    print("✓ Categories seeded")


def seed_products(db: Session):
    """Seed initial products"""
    # Get first category
    category = db.query(Category).first()
    if not category:
        print("⚠ No categories found. Run seed_categories first.")
        return

    products_data = [
        {
            "name": "Classic Kids Bloomers - Pink",
            "description": "Soft and breathable cotton bloomers perfect for active kids",
            "price": 299.99,
            "discount_price": 249.99,
            "quantity": 100,
        },
        {
            "name": "Baby Camisole - White",
            "description": "Pure white camisole made from 100% organic cotton",
            "price": 199.99,
            "discount_price": 149.99,
            "quantity": 50,
        },
        {
            "name": "Soft Baby Booties - Blue",
            "description": "Warm and cozy booties for your little one",
            "price": 149.99,
            "discount_price": None,
            "quantity": 75,
        },
    ]

    for prod_data in products_data:
        existing = db.query(Product).filter(
            Product.slug == generate_slug(prod_data["name"])
        ).first()

        if not existing:
            product = Product(
                category_id=category.id,
                name=prod_data["name"],
                slug=generate_slug(prod_data["name"]),
                description=prod_data["description"],
                price=prod_data["price"],
                discount_price=prod_data["discount_price"],
                sku=f"SK-{prod_data['name'][:5].upper()}-001",
                quantity=prod_data["quantity"],
                is_active=True,
                is_featured=True,
            )
            db.add(product)

    db.commit()
    print("✓ Products seeded")


def seed_banners(db: Session):
    """Seed initial banners"""
    banners_data = [
        {
            "title": "Summer Collection",
            "description": "New summer collection now available",
            "button_text": "Shop Now",
            "button_link": "/products?category=summer",
            "order": 1,
        },
        {
            "title": "Exclusive Offer",
            "description": "Get 30% off on selected items",
            "button_text": "Explore",
            "button_link": "/sale",
            "order": 2,
        },
    ]

    for banner_data in banners_data:
        existing = db.query(Banner).filter(
            Banner.title == banner_data["title"]
        ).first()

        if not existing:
            banner = Banner(
                title=banner_data["title"],
                image_url="/images/banner1.jpg",
                description=banner_data["description"],
                button_text=banner_data["button_text"],
                button_link=banner_data["button_link"],
                is_active=True,
                order=banner_data["order"],
            )
            db.add(banner)

    db.commit()
    print("✓ Banners seeded")


def main():
    """Run all seeding"""
    db = SessionLocal()
    try:
        print("🌱 Seeding initial data...")
        seed_categories(db)
        seed_products(db)
        seed_banners(db)
        print("✅ Data seeding complete!")
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
