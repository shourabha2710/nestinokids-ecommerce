"""Backfill inventory records for products that do not have one."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.database import SessionLocal
from app.models.models import Product, Inventory, ProductVariant
from sqlalchemy.orm import joinedload
from datetime import datetime


def backfill_inventory():
    db = SessionLocal()
    try:
        products = db.query(Product).options(
            joinedload(Product.variants)
        ).filter(
            ~db.query(Inventory).filter(Inventory.product_id == Product.id).exists()
        ).all()

        if not products:
            print("All products already have inventory records.")
            return

        count = 0
        for product in products:
            if product.variants:
                total_qty = sum(v.quantity for v in product.variants)
            else:
                total_qty = product.quantity

            inventory = Inventory(
                product_id=product.id,
                total_quantity=total_qty,
                available_quantity=total_qty,
                reserved_quantity=0,
                low_stock_threshold=10,
                last_restocked=datetime.utcnow(),
            )
            db.add(inventory)
            count += 1

        db.commit()
        print(f"Created {count} inventory records for products that were missing them.")

    finally:
        db.close()


if __name__ == "__main__":
    backfill_inventory()
