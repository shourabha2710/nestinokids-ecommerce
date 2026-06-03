"""
Initial data seeding script for NestinoKids
"""

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import Category, Product, ProductImage, Inventory, Banner
from app.utils.helpers import generate_slug, generate_sku
from datetime import datetime, timedelta


CATEGORIES = [
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


PRODUCTS = [
    # --- Kids Bloomers (4) ---
    {
        "name": "Classic Kids Bloomers - Pink",
        "category": "Kids Bloomers",
        "description": "Soft and breathable cotton bloomers perfect for active kids",
        "short_description": "Premium cotton bloomers in pink",
        "price": 299.99,
        "discount_price": 249.99,
        "quantity": 100,
        "is_featured": True,
    },
    {
        "name": "Classic Kids Bloomers - Blue",
        "category": "Kids Bloomers",
        "description": "Classic blue cotton bloomers with elastic waistband for all-day comfort",
        "short_description": "Classic blue cotton bloomers",
        "price": 299.99,
        "discount_price": None,
        "quantity": 85,
        "is_featured": True,
    },
    {
        "name": "Floral Printed Bloomers",
        "category": "Kids Bloomers",
        "description": "Beautiful floral print bloomers made from soft cotton fabric, perfect for summer days",
        "short_description": "Beautiful floral print bloomers",
        "price": 349.99,
        "discount_price": 299.99,
        "quantity": 60,
        "is_featured": True,
    },
    {
        "name": "Cotton Stretch Bloomers - Pastel",
        "category": "Kids Bloomers",
        "description": "Stretchable cotton blend bloomers in pastel shades with gentle elastic leg openings",
        "short_description": "Stretchable pastel bloomers",
        "price": 279.99,
        "discount_price": None,
        "quantity": 75,
        "is_featured": False,
    },
    # --- Kids Camisoles (4) ---
    {
        "name": "Baby Camisole - White",
        "category": "Kids Camisoles",
        "description": "Pure white camisole made from 100% organic cotton with snap buttons for easy dressing",
        "short_description": "Organic cotton white camisole",
        "price": 199.99,
        "discount_price": 149.99,
        "quantity": 50,
        "is_featured": True,
    },
    {
        "name": "Striped Camisole Set - 3 Pack",
        "category": "Kids Camisoles",
        "description": "Set of 3 striped camisoles in assorted colors, soft ribbed cotton material",
        "short_description": "3-pack striped camisole set",
        "price": 499.99,
        "discount_price": 449.99,
        "quantity": 40,
        "is_featured": True,
    },
    {
        "name": "Lace Trim Camisole - Pink",
        "category": "Kids Camisoles",
        "description": "Adorable pink camisole with delicate lace trim and adjustable spaghetti straps",
        "short_description": "Pink camisole with lace trim",
        "price": 249.99,
        "discount_price": None,
        "quantity": 65,
        "is_featured": False,
    },
    {
        "name": "Organic Cotton Camisole - Mint",
        "category": "Kids Camisoles",
        "description": "Eco-friendly organic cotton camisole in refreshing mint color with envelope neckline",
        "short_description": "Eco-friendly mint camisole",
        "price": 229.99,
        "discount_price": None,
        "quantity": 55,
        "is_featured": False,
    },
    # --- Baby Booties (4) ---
    {
        "name": "Soft Baby Booties - Blue",
        "category": "Baby Booties",
        "description": "Warm and cozy booties for your little one, made from ultra-soft fleece material",
        "short_description": "Cozy fleece baby booties",
        "price": 149.99,
        "discount_price": None,
        "quantity": 75,
        "is_featured": False,
    },
    {
        "name": "Knitted Baby Booties - Grey",
        "category": "Baby Booties",
        "description": "Hand-knitted style grey booties with cute bear ears, perfect for newborn photography",
        "short_description": "Hand-knitted grey booties",
        "price": 179.99,
        "discount_price": 159.99,
        "quantity": 45,
        "is_featured": True,
    },
    {
        "name": "Faux Leather Booties - Tan",
        "category": "Baby Booties",
        "description": "Stylish faux leather booties in tan with non-slip rubber sole for early walkers",
        "short_description": "Stylish faux leather booties",
        "price": 249.99,
        "discount_price": None,
        "quantity": 35,
        "is_featured": False,
    },
    {
        "name": "Animal Face Booties - Bear",
        "category": "Baby Booties",
        "description": "Adorable bear face booties with embroidered details and soft cotton lining",
        "short_description": "Cute bear face booties",
        "price": 199.99,
        "discount_price": 179.99,
        "quantity": 50,
        "is_featured": True,
    },
    # --- Innerwear (4) ---
    {
        "name": "Cotton Inner Vest Pack",
        "category": "Innerwear",
        "description": "Pack of 3 pure cotton inner vests with reinforced seams and tagless neck labels",
        "short_description": "Pack of 3 cotton inner vests",
        "price": 399.99,
        "discount_price": 349.99,
        "quantity": 80,
        "is_featured": True,
    },
    {
        "name": "Seamless Inner Shorts - 3 Pack",
        "category": "Innerwear",
        "description": "Ultra-soft seamless inner shorts pack of 3, invisible under clothing",
        "short_description": "3-pack seamless inner shorts",
        "price": 349.99,
        "discount_price": None,
        "quantity": 60,
        "is_featured": False,
    },
    {
        "name": "Bamboo Fiber Inner Set",
        "category": "Innerwear",
        "description": "Eco-friendly bamboo fiber innerwear set including vest and shorts, naturally antimicrobial",
        "short_description": "Bamboo fiber inner set",
        "price": 449.99,
        "discount_price": 399.99,
        "quantity": 40,
        "is_featured": True,
    },
    {
        "name": "Thermal Innerwear - Winter",
        "category": "Innerwear",
        "description": "Premium thermal innerwear set for winter, fleece-lined for extra warmth",
        "short_description": "Warm thermal innerwear set",
        "price": 599.99,
        "discount_price": None,
        "quantity": 30,
        "is_featured": False,
    },
    # --- Nightwear (4) ---
    {
        "name": "Cotton Night Suit - Stars",
        "category": "Nightwear",
        "description": "Soft cotton night suit with star print, featuring a button-down top and elastic waist pants",
        "short_description": "Star print cotton night suit",
        "price": 549.99,
        "discount_price": 499.99,
        "quantity": 45,
        "is_featured": True,
    },
    {
        "name": "Flannel Night Gown - Unicorn",
        "category": "Nightwear",
        "description": "Magical unicorn printed flannel night gown with ruffled hem and matching hairband",
        "short_description": "Unicorn flannel night gown",
        "price": 499.99,
        "discount_price": None,
        "quantity": 35,
        "is_featured": False,
    },
    {
        "name": "Two-Piece Pajama Set - Dinosaur",
        "category": "Nightwear",
        "description": "Fun dinosaur print two-piece pajama set in soft cotton jersey fabric",
        "short_description": "Dinosaur print pajama set",
        "price": 599.99,
        "discount_price": 549.99,
        "quantity": 50,
        "is_featured": True,
    },
    {
        "name": "Silk Nightgown - Butterfly",
        "category": "Nightwear",
        "description": "Luxurious silk nightgown with butterfly embroidery, satin trim, and adjustable straps",
        "short_description": "Silk butterfly nightgown",
        "price": 699.99,
        "discount_price": None,
        "quantity": 25,
        "is_featured": False,
    },
]


BANNERS = [
    {
        "title": "Summer Collection 2025",
        "description": "Discover our vibrant summer collection — lightweight fabrics and sunny colors for your little ones",
        "image_url": "/images/banners/summer-collection.jpg",
        "button_text": "Shop Summer",
        "button_link": "/products?category=summer",
        "order": 1,
    },
    {
        "title": "Exclusive Offer",
        "description": "Get 30% off on selected items — limited time offer on premium kids essentials",
        "image_url": "/images/banners/exclusive-offer.jpg",
        "button_text": "Explore Deals",
        "button_link": "/sale",
        "order": 2,
    },
    {
        "title": "Newborn Essentials",
        "description": "Curated collection of newborn must-haves — softness you can trust from day one",
        "image_url": "/images/banners/newborn-essentials.jpg",
        "button_text": "Shop Now",
        "button_link": "/products?category=newborn",
        "order": 3,
    },
]


def seed_categories(db: Session):
    """Seed 5 categories"""
    cat_map = {}
    for cat_data in CATEGORIES:
        slug = generate_slug(cat_data["name"])
        existing = db.query(Category).filter(Category.slug == slug).first()
        if not existing:
            category = Category(
                name=cat_data["name"],
                slug=slug,
                description=cat_data["description"],
                is_active=True,
            )
            db.add(category)
            db.flush()
            cat_map[cat_data["name"]] = category
        else:
            cat_map[cat_data["name"]] = existing
    db.commit()
    print(f"✓ {len(CATEGORIES)} categories seeded")
    return cat_map


def seed_products(db: Session, cat_map: dict):
    """Seed 20 products distributed across 5 categories"""
    for prod_data in PRODUCTS:
        slug = generate_slug(prod_data["name"])
        existing = db.query(Product).filter(Product.slug == slug).first()
        if existing:
            continue

        category = cat_map.get(prod_data["category"])
        if not category:
            print(f"⚠ Category '{prod_data['category']}' not found. Skipping {prod_data['name']}")
            continue

        sku = generate_sku(prod_data["category"], prod_data["name"])

        product = Product(
            category_id=category.id,
            name=prod_data["name"],
            slug=slug,
            description=prod_data["description"],
            short_description=prod_data.get("short_description"),
            price=prod_data["price"],
            discount_price=prod_data.get("discount_price"),
            sku=sku,
            quantity=prod_data["quantity"],
            is_active=True,
            is_featured=prod_data["is_featured"],
            meta_title=prod_data["name"],
            meta_description=prod_data.get("short_description"),
        )
        db.add(product)
        db.flush()

    db.commit()
    print(f"✓ {len(PRODUCTS)} products seeded")


def seed_inventory(db: Session):
    """Create inventory records for all products"""
    products = db.query(Product).all()
    count = 0
    for product in products:
        existing = db.query(Inventory).filter(Inventory.product_id == product.id).first()
        if existing:
            continue
        inventory = Inventory(
            product_id=product.id,
            total_quantity=product.quantity,
            available_quantity=product.quantity,
            reserved_quantity=0,
            low_stock_threshold=10,
            last_restocked=datetime.utcnow(),
        )
        db.add(inventory)
        count += 1
    db.commit()
    print(f"✓ {count} inventory records created")


def seed_product_images(db: Session):
    """Create at least one primary image per product"""
    products = db.query(Product).all()
    count = 0
    for product in products:
        existing_images = db.query(ProductImage).filter(
            ProductImage.product_id == product.id
        ).count()
        if existing_images > 0:
            continue

        image = ProductImage(
            product_id=product.id,
            image_url=f"/images/products/{product.slug}.jpg",
            alt_text=product.name,
            is_primary=True,
            order=1,
        )
        db.add(image)
        count += 1
    db.commit()
    print(f"✓ {count} product images created")


def seed_banners(db: Session):
    """Seed 3 active banners"""
    count = 0
    for banner_data in BANNERS:
        existing = db.query(Banner).filter(
            Banner.title == banner_data["title"]
        ).first()
        if existing:
            continue
        banner = Banner(
            title=banner_data["title"],
            image_url=banner_data["image_url"],
            description=banner_data["description"],
            button_text=banner_data["button_text"],
            button_link=banner_data["button_link"],
            is_active=True,
            order=banner_data["order"],
        )
        db.add(banner)
        count += 1
    db.commit()
    print(f"✓ {count} banners seeded")


def main():
    """Run all seeding"""
    db = SessionLocal()
    try:
        print("🌱 Seeding initial data...")
        cat_map = seed_categories(db)
        seed_products(db, cat_map)
        seed_inventory(db)
        seed_product_images(db)
        seed_banners(db)
        print("✅ Data seeding complete!")
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
