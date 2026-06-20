import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.security import hash_password
from app.models.models import (
    Product, User, RoleEnum, Category, ProductVariant, Inventory,
    OrderItem, Order, RecentlyViewed,
    cart_association, wishlist_association,
)

_TEST_DB_URL = "sqlite:///./test.db"
_test_engine = create_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})
_TestSession = sessionmaker(bind=_test_engine)


def _create_test_session():
    return _TestSession()


def _ensure_admin(db):
    existing = db.query(User).filter(User.email == "fk-admin@test.com").first()
    if not existing:
        admin = User(
            email="fk-admin@test.com",
            first_name="Admin", last_name="User",
            phone="1000000000",
            hashed_password=hash_password("AdminPass123"),
            role=RoleEnum.ADMIN, is_active=True,
        )
        db.add(admin)
        db.commit()


def _login_token(client):
    resp = client.post("/api/v1/auth/login", json={
        "email": "fk-admin@test.com",
        "password": "AdminPass123",
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


# ─── Variant Delete Tests ─────────────────────────────────────────────


def test_delete_variant_with_cart_ref(client, db):
    _ensure_admin(db)
    cat = Category(name="VCat", slug="vcat", description="")
    db.add(cat); db.commit(); db.refresh(cat)
    cat_id = cat.id

    product = Product(
        category_id=cat_id, name="VP", slug="vp",
        description="", price=100, sku="VP-SKU", quantity=50,
    )
    db.add(product); db.commit(); db.refresh(product)
    product_id = product.id

    inv = Inventory(product_id=product_id, total_quantity=10, available_quantity=10)
    db.add(inv)
    variant = ProductVariant(product_id=product_id, size="M", quantity=10, sku="VP-V1")
    db.add(variant); db.commit(); db.refresh(variant)
    variant_id = variant.id

    user = User(
        email="vcart@test.com", first_name="C", last_name="U",
        phone="2000000001", hashed_password=hash_password("P"),
        role=RoleEnum.USER, is_active=True,
    )
    db.add(user); db.commit(); db.refresh(user)

    db.execute(cart_association.insert().values(
        user_id=user.id, product_id=product_id,
        variant_id=variant_id, quantity=1,
    ))
    db.commit()

    token = _login_token(client)
    resp = client.delete(
        f"/api/v1/admin/products/{product_id}/variants/{variant_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    sess = _create_test_session()
    try:
        assert sess.query(ProductVariant).filter(ProductVariant.id == variant_id).first() is None
        remaining = sess.execute(
            cart_association.select().where(cart_association.c.variant_id == variant_id)
        ).fetchall()
        assert len(remaining) == 0
    finally:
        sess.close()


def test_delete_variant_with_order_ref(client, db):
    _ensure_admin(db)
    cat = Category(name="VOCat", slug="vocat", description="")
    db.add(cat); db.commit(); db.refresh(cat)
    cat_id = cat.id

    product = Product(
        category_id=cat_id, name="VOP", slug="vop",
        description="", price=100, sku="VOP-SKU", quantity=50,
    )
    db.add(product); db.commit(); db.refresh(product)
    product_id = product.id

    inv = Inventory(product_id=product_id, total_quantity=10, available_quantity=10)
    db.add(inv)
    variant = ProductVariant(product_id=product_id, size="L", quantity=10, sku="VOP-V1")
    db.add(variant); db.commit(); db.refresh(variant)
    variant_id = variant.id

    user = User(
        email="vorder@test.com", first_name="O", last_name="U",
        phone="3000000002", hashed_password=hash_password("P"),
        role=RoleEnum.USER, is_active=True,
    )
    db.add(user); db.commit(); db.refresh(user)

    order = Order(user_id=user.id, order_number="ORD-FK-V1", total_amount=100, final_amount=100)
    db.add(order); db.flush()
    item = OrderItem(order_id=order.id, product_id=product_id, variant_id=variant_id,
                     quantity=1, price=100, total=100)
    db.add(item); db.commit()

    token = _login_token(client)
    resp = client.delete(
        f"/api/v1/admin/products/{product_id}/variants/{variant_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    assert "existing orders" in resp.json()["detail"].lower()

    sess = _create_test_session()
    try:
        assert sess.query(ProductVariant).filter(ProductVariant.id == variant_id).first() is not None
    finally:
        sess.close()


def test_delete_variant_clean(client, db):
    _ensure_admin(db)
    cat = Category(name="VCat2", slug="vcat2", description="")
    db.add(cat); db.commit(); db.refresh(cat)
    cat_id = cat.id

    product = Product(
        category_id=cat_id, name="VP2", slug="vp2",
        description="", price=100, sku="VP2-SKU", quantity=50,
    )
    db.add(product); db.commit(); db.refresh(product)
    product_id = product.id

    inv = Inventory(product_id=product_id, total_quantity=5, available_quantity=5)
    db.add(inv)
    variant = ProductVariant(product_id=product_id, size="S", quantity=5, sku="VP2-V1")
    db.add(variant); db.commit(); db.refresh(variant)
    variant_id = variant.id

    token = _login_token(client)
    resp = client.delete(
        f"/api/v1/admin/products/{product_id}/variants/{variant_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    sess = _create_test_session()
    try:
        assert sess.query(ProductVariant).filter(ProductVariant.id == variant_id).first() is None
    finally:
        sess.close()


# ─── Product Delete Tests ─────────────────────────────────────────────


def test_delete_product_with_recently_viewed(client, db):
    _ensure_admin(db)
    cat = Category(name="PCat", slug="pcat", description="")
    db.add(cat); db.commit(); db.refresh(cat)

    product = Product(
        category_id=cat.id, name="PP", slug="pp",
        description="", price=100, sku="PP-SKU", quantity=50,
    )
    db.add(product); db.commit(); db.refresh(product)
    product_id = product.id

    rv = RecentlyViewed(product_id=product_id, session_id="test-sess")
    db.add(rv); db.commit()

    token = _login_token(client)
    resp = client.delete(
        f"/api/v1/admin/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    sess = _create_test_session()
    try:
        assert sess.query(Product).filter(Product.id == product_id).first() is None
        assert sess.query(RecentlyViewed).filter(RecentlyViewed.product_id == product_id).first() is None
    finally:
        sess.close()


def test_delete_product_with_order_archives(client, db):
    _ensure_admin(db)
    cat = Category(name="POCat", slug="pocat", description="")
    db.add(cat); db.commit(); db.refresh(cat)

    product = Product(
        category_id=cat.id, name="POP", slug="pop",
        description="", price=100, sku="POP-SKU", quantity=50,
    )
    db.add(product); db.commit(); db.refresh(product)
    product_id = product.id

    user = User(
        email="porder@test.com", first_name="PO", last_name="U",
        phone="4000000003", hashed_password=hash_password("P"),
        role=RoleEnum.USER, is_active=True,
    )
    db.add(user); db.commit(); db.refresh(user)

    order = Order(user_id=user.id, order_number="ORD-ARCH", total_amount=100, final_amount=100)
    db.add(order); db.flush()
    item = OrderItem(order_id=order.id, product_id=product_id, quantity=1, price=100, total=100)
    db.add(item); db.commit()

    token = _login_token(client)
    resp = client.delete(
        f"/api/v1/admin/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert "archived" in resp.json()["message"].lower()

    sess = _create_test_session()
    try:
        p = sess.query(Product).filter(Product.id == product_id).first()
        assert p is not None
        assert p.is_active is False
    finally:
        sess.close()


def test_delete_product_clean(client, db):
    _ensure_admin(db)
    cat = Category(name="PCat2", slug="pcat2", description="")
    db.add(cat); db.commit(); db.refresh(cat)

    product = Product(
        category_id=cat.id, name="PP2", slug="pp2",
        description="", price=100, sku="PP2-SKU", quantity=50,
    )
    db.add(product); db.commit(); db.refresh(product)
    product_id = product.id

    token = _login_token(client)
    resp = client.delete(
        f"/api/v1/admin/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    sess = _create_test_session()
    try:
        assert sess.query(Product).filter(Product.id == product_id).first() is None
    finally:
        sess.close()


def test_delete_product_with_wishlist_and_cart(client, db):
    _ensure_admin(db)
    cat = Category(name="PWC", slug="pwc", description="")
    db.add(cat); db.commit(); db.refresh(cat)

    product = Product(
        category_id=cat.id, name="PWP", slug="pwp",
        description="", price=100, sku="PWP-SKU", quantity=50,
    )
    db.add(product); db.commit(); db.refresh(product)
    product_id = product.id

    user = User(
        email="wcart@test.com", first_name="WC", last_name="U",
        phone="5000000004", hashed_password=hash_password("P"),
        role=RoleEnum.USER, is_active=True,
    )
    db.add(user); db.commit(); db.refresh(user)

    db.execute(wishlist_association.insert().values(user_id=user.id, product_id=product_id))
    db.execute(cart_association.insert().values(user_id=user.id, product_id=product_id, quantity=1))
    db.commit()

    token = _login_token(client)
    resp = client.delete(
        f"/api/v1/admin/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    sess = _create_test_session()
    try:
        assert sess.query(Product).filter(Product.id == product_id).first() is None
        wl = sess.execute(
            wishlist_association.select().where(wishlist_association.c.product_id == product_id)
        ).fetchall()
        assert len(wl) == 0
        ca = sess.execute(
            cart_association.select().where(cart_association.c.product_id == product_id)
        ).fetchall()
        assert len(ca) == 0
    finally:
        sess.close()
