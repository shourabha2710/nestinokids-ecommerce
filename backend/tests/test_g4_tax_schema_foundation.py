"""G4.1 - GST / tax schema foundation tests.

Verifies the additive schema is purely structural and backward-compatible:

  - every new tax column is nullable (or safely defaulted) so orders,
    order items, products, categories and store settings can be created and
    loaded exactly as before - the engine remains tax-exempt;
  - the new snapshot columns are writable and persist (round-trip), proving
    a future GST phase can populate them;
  - order-time product snapshots and the G1 shipping-address snapshot keep
    their immutable-document semantics;
  - the ``invoices`` foundation table exists, enforces one-invoice-per-order,
    and never interferes with plain order creation;
  - cart calculation still returns ``tax == 0.0`` (existing assertions in
    test_cart_shipping.py / test_checkout_cod_flow.py are unchanged).

G2/G3 regression is covered by their dedicated suites; this file deliberately
does not weaken any existing ``tax == 0.0`` assertion.
"""
import itertools
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.models.models import (
    Category,
    Invoice,
    Order,
    OrderItem,
    Product,
    RoleEnum,
    User,
)
from app.services.order_calculation_service import calculate_order
from app.services.settings_service import get_settings


# ─── helpers ──────────────────────────────────────────────────────────────────

_seq = itertools.count(1)


def _create_user(db, email):
    user = User(
        email=email,
        first_name="G4",
        last_name="Schema",
        phone=f"77777777{next(_seq) % 100:02d}",
        hashed_password=hash_password("TestPass123"),
        role=RoleEnum.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_category(db):
    n = next(_seq)
    cat = Category(name=f"G4Cat{n}", slug=f"g4cat-{n}", description="")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def _create_product(db, price=250.0):
    n = next(_seq)
    cat = _create_category(db)
    product = Product(
        category_id=cat.id,
        name=f"G4Prod{n}",
        slug=f"g4prod-{n}",
        description="",
        price=price,
        sku=f"G4SKU-{n}",
        quantity=100,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _create_order(db, user, **kwargs):
    order = Order(
        user_id=user.id,
        order_number=f"G4-{uuid4().hex[:12].upper()}",
        total_amount=kwargs.pop("total_amount", 100.0),
        final_amount=kwargs.pop("final_amount", 100.0),
        **kwargs,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


# ─── G4.1 schema compatibility ────────────────────────────────────────────────


def test_order_created_and_loaded_without_tax_snapshot_fields(db):
    user = _create_user(db, f"plain-{uuid4().hex[:8]}@example.com")
    order = _create_order(db, user)
    assert order.tax_amount == 0.0
    assert order.taxable_amount is None or order.taxable_amount == 0.0
    assert order.tax_type in (None, "none")
    assert order.place_of_supply is None
    assert order.seller_state is None
    assert order.invoice_number is None
    reloaded = db.query(Order).get(order.id)
    assert reloaded.order_number == order.order_number
    assert reloaded.final_amount == 100.0


def test_order_tax_snapshot_fields_persist_round_trip(db):
    user = _create_user(db, f"snap-{uuid4().hex[:8]}@example.com")
    order = _create_order(db, user)
    order.taxable_amount = 100.0
    order.cgst_amount = 9.0
    order.sgst_amount = 9.0
    order.igst_amount = 0.0
    order.tax_type = "none"
    order.place_of_supply = "27-Maharashtra"
    order.seller_state = "MAHARASHTRA"
    order.invoice_number = "IN-001-0001"
    db.commit()
    reloaded = db.query(Order).get(order.id)
    assert reloaded.taxable_amount == 100.0
    assert reloaded.cgst_amount == 9.0
    assert reloaded.sgst_amount == 9.0
    assert reloaded.igst_amount == 0.0
    assert reloaded.tax_type == "none"
    assert reloaded.place_of_supply == "27-Maharashtra"
    assert reloaded.seller_state == "MAHARASHTRA"
    assert reloaded.invoice_number == "IN-001-0001"


def test_order_item_created_without_tax_snapshot_fields(db):
    user = _create_user(db, f"item-{uuid4().hex[:8]}@example.com")
    product = _create_product(db)
    order = _create_order(db, user)
    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        quantity=2,
        price=100.0,
        total=200.0,
    )
    db.add(item)
    db.commit()
    reloaded = db.query(OrderItem).get(item.id)
    assert reloaded.hsn_code is None
    assert reloaded.tax_rate in (None, 0.0)
    assert reloaded.product_name is None
    assert reloaded.sku is None


def test_order_item_tax_and_product_snapshot_fields_persist(db):
    user = _create_user(db, f"isnap-{uuid4().hex[:8]}@example.com")
    product = _create_product(db)
    order = _create_order(db, user)
    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        quantity=1,
        price=100.0,
        total=100.0,
        hsn_code="6209",
        tax_rate=18.0,
        taxable_value=100.0,
        cgst_amount=9.0,
        sgst_amount=9.0,
        igst_amount=0.0,
        product_name="G4 Onesie",
        sku=product.sku,
    )
    db.add(item)
    db.commit()
    reloaded = db.query(OrderItem).get(item.id)
    assert reloaded.hsn_code == "6209"
    assert reloaded.tax_rate == 18.0
    assert reloaded.taxable_value == 100.0
    assert reloaded.cgst_amount == 9.0
    assert reloaded.sgst_amount == 9.0
    assert reloaded.igst_amount == 0.0
    assert reloaded.product_name == "G4 Onesie"
    assert reloaded.sku == product.sku


def test_product_hsn_and_gst_rate_persist(db):
    product = _create_product(db)
    assert product.hsn_code is None
    assert product.gst_rate is None
    product.hsn_code = "6209"
    product.gst_rate = 18.0
    db.commit()
    reloaded = db.query(Product).get(product.id)
    assert reloaded.hsn_code == "6209"
    assert reloaded.gst_rate == 18.0


def test_category_hsn_and_gst_rate_persist(db):
    cat = _create_category(db)
    assert cat.hsn_code is None
    assert cat.gst_rate is None
    cat.hsn_code = "6209"
    cat.gst_rate = 18.0
    db.commit()
    reloaded = db.query(Category).get(cat.id)
    assert reloaded.hsn_code == "6209"
    assert reloaded.gst_rate == 18.0


def test_store_setting_seller_state(db):
    settings = get_settings(db)
    assert settings.seller_state is None
    settings.seller_state = "MAHARASHTRA"
    db.commit()
    reloaded = get_settings(db)
    assert reloaded.seller_state == "MAHARASHTRA"


def test_legacy_order_columns_unchanged(db):
    user = _create_user(db, f"legacy-{uuid4().hex[:8]}@example.com")
    order = _create_order(
        db,
        user,
        tax_amount=10.0,
        discount_amount=5.0,
        shipping_amount=50.0,
        total_amount=200.0,
        final_amount=255.0,
    )
    reloaded = db.query(Order).get(order.id)
    assert reloaded.tax_amount == 10.0
    assert reloaded.discount_amount == 5.0
    assert reloaded.shipping_amount == 50.0
    assert reloaded.total_amount == 200.0
    assert reloaded.final_amount == 255.0


def test_g1_shipping_address_snapshot_still_persists(db):
    user = _create_user(db, f"g1-{uuid4().hex[:8]}@example.com")
    order = _create_order(db, user)
    order.shipping_address_snapshot = {
        "line1": "3 Idempotency Way",
        "city": "Mumbai",
        "state": "Maharashtra",
    }
    db.commit()
    reloaded = db.query(Order).get(order.id)
    assert reloaded.shipping_address_snapshot["city"] == "Mumbai"


def test_cart_calculation_still_tax_zero(db):
    user = _create_user(db, f"tax-{uuid4().hex[:8]}@example.com")
    product = _create_product(db, price=250.0)
    result = calculate_order(
        db,
        [
            {
                "product_id": product.id,
                "category_id": product.category_id,
                "quantity": 1,
                "price": 250.0,
                "total": 250.0,
            }
        ],
    )
    assert result.tax == 0.0


# ─── Invoices foundation ───────────────────────────────────────────────────────


def test_invoice_schema_and_one_invoice_per_order(db):
    user = _create_user(db, f"inv-{uuid4().hex[:8]}@example.com")
    order = _create_order(db, user)
    invoice = Invoice(order_id=order.id, invoice_number="IN-001-0001")
    db.add(invoice)
    db.commit()
    reloaded = db.query(Invoice).get(invoice.id)
    assert reloaded.order_id == order.id
    assert reloaded.invoice_number == "IN-001-0001"
    second = Invoice(order_id=order.id, invoice_number="IN-001-0002")
    db.add(second)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_orders_create_without_invoices(db):
    user = _create_user(db, f"noin-{uuid4().hex[:8]}@example.com")
    order = _create_order(db, user)
    order2 = _create_order(db, user)
    assert db.query(Invoice).count() == 0
    assert db.query(Order).count() == 2
    assert db.query(Order).get(order.id).id == order.id
    assert db.query(Order).get(order2.id).id == order2.id