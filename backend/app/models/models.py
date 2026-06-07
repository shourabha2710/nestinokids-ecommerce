from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, Table, Enum, JSON, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
from enum import Enum as PyEnum
from datetime import datetime


# Association table for wishlist
wishlist_association = Table(
    'wishlist_association',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('product_id', Integer, ForeignKey('products.id'), primary_key=True),
)

# Association table for cart
cart_association = Table(
    'cart_association',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('product_id', Integer, ForeignKey('products.id'), primary_key=True),
    Column('quantity', Integer, default=1),
    Column('variant_id', Integer, ForeignKey('product_variants.id'), nullable=True),
)


class RoleEnum(str, PyEnum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"


class OrderStatusEnum(str, PyEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PACKED = "packed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


class PaymentStatusEnum(str, PyEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.USER)
    profile_image = Column(String(255), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    wishlist = relationship("Product", secondary=wishlist_association, back_populates="wishlisted_by")
    cart_items = relationship("Product", secondary=cart_association, back_populates="in_carts")
    
    __table_args__ = (
        Index('idx_user_email', 'email'),
        Index('idx_user_active', 'is_active'),
    )


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    image = Column(String(255), nullable=True)
    parent_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("Category", remote_side=[id], backref="subcategories")
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_category_slug', 'slug'),
    )


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    short_description = Column(String(500), nullable=True)
    price = Column(Float, nullable=False)
    discount_price = Column(Float, nullable=True)
    sku = Column(String(100), unique=True, nullable=False)
    quantity = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True, index=True)
    
    # SEO
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)
    meta_keywords = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan",
                          order_by="ProductImage.is_primary.desc(), ProductImage.order.asc(), ProductImage.id.asc()")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    inventory = relationship("Inventory", back_populates="product", uselist=False, cascade="all, delete-orphan")
    wishlisted_by = relationship("User", secondary=wishlist_association, back_populates="wishlist")
    in_carts = relationship("User", secondary=cart_association, back_populates="cart_items")
    
    __table_args__ = (
        Index('idx_product_slug', 'slug'),
        Index('idx_product_category', 'category_id'),
        Index('idx_product_active', 'is_active'),
    )


class ProductImage(Base):
    __tablename__ = "product_images"
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    image_url = Column(String(255), nullable=False)
    alt_text = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="images")
    
    __table_args__ = (
        Index('idx_product_image_product', 'product_id'),
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    size = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    price_modifier = Column(Float, default=0.0)
    quantity = Column(Integer, default=0)
    sku = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="variants")
    
    __table_args__ = (
        Index('idx_variant_product', 'product_id'),
        UniqueConstraint('product_id', 'size', 'color', name='uq_product_size_color'),
    )


class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), unique=True, nullable=False)
    total_quantity = Column(Integer, default=0)
    available_quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=10)
    last_restocked = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="inventory")
    
    __table_args__ = (
        Index('idx_inventory_product', 'product_id'),
    )


class Address(Base):
    __tablename__ = "addresses"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    address_line_1 = Column(String(255), nullable=False)
    address_line_2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), default="India")
    is_default = Column(Boolean, default=False)
    address_type = Column(String(50), default="residential")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="addresses")
    
    __table_args__ = (
        Index('idx_address_user', 'user_id'),
    )


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    order_number = Column(String(50), unique=True, nullable=False)
    status = Column(Enum(OrderStatusEnum), default=OrderStatusEnum.PENDING, index=True)
    total_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    shipping_amount = Column(Float, default=0.0)
    final_amount = Column(Float, nullable=False)
    
    # Address info
    shipping_address_id = Column(Integer, ForeignKey('addresses.id'), nullable=True)
    billing_address_id = Column(Integer, ForeignKey('addresses.id'), nullable=True)
    
    # Payment info
    payment_method = Column(String(50), nullable=True)
    payment_status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.PENDING)
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    
    # Coupon
    coupon_id = Column(Integer, ForeignKey('coupons.id'), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    coupon = relationship("Coupon", back_populates="orders")
    
    __table_args__ = (
        Index('idx_order_user', 'user_id'),
        Index('idx_order_number', 'order_number'),
        Index('idx_order_status', 'status'),
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    variant_id = Column(Integer, ForeignKey('product_variants.id'), nullable=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    
    __table_args__ = (
        Index('idx_order_item_order', 'order_id'),
    )


class Coupon(Base):
    __tablename__ = "coupons"
    
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    discount_type = Column(String(20), nullable=False)  # percentage or fixed
    discount_value = Column(Float, nullable=False)
    minimum_order_value = Column(Float, default=0.0)
    maximum_discount = Column(Float, nullable=True)
    max_usage = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    orders = relationship("Order", back_populates="coupon")
    
    __table_args__ = (
        Index('idx_coupon_code', 'code'),
    )


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_verified_purchase = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    
    __table_args__ = (
        Index('idx_review_product', 'product_id'),
        Index('idx_review_user', 'user_id'),
    )


class Banner(Base):
    __tablename__ = "banners"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    image_url = Column(String(255), nullable=False)
    mobile_image_url = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    button_text = Column(String(50), nullable=True)
    button_link = Column(String(255), nullable=True)
    target_category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_banner_active', 'is_active'),
    )


class InstagramPost(Base):
    __tablename__ = "instagram_posts"

    id = Column(Integer, primary_key=True)
    post_url = Column(String(500), nullable=False)
    thumbnail_image = Column(String(255), nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    clicks = relationship("InstagramPostClick", back_populates="instagram_post",
                          cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_instagram_active_order', 'is_active', 'display_order'),
    )


class InstagramPostClick(Base):
    __tablename__ = "instagram_post_clicks"

    id = Column(Integer, primary_key=True)
    instagram_post_id = Column(Integer, ForeignKey('instagram_posts.id'), nullable=False)
    clicked_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45), nullable=True)

    instagram_post = relationship("InstagramPost", back_populates="clicks")

    __table_args__ = (
        Index('idx_instagram_click_post', 'instagram_post_id'),
    )
