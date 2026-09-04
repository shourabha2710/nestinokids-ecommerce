from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, Table, Enum, JSON, UniqueConstraint, Index, BigInteger, text
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
    Column('id', Integer, primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), nullable=False),
    Column('product_id', Integer, ForeignKey('products.id'), nullable=False),
    Column('quantity', Integer, default=1),
    Column('variant_id', Integer, ForeignKey('product_variants.id'), nullable=True),
)


class RoleEnum(str, PyEnum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    SUPPORT = "support"
    INVENTORY_MANAGER = "inventory_manager"


class OrderStatusEnum(str, PyEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PACKED = "packed"
    SHIPPED = "shipped"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURN_REQUESTED = "return_requested"
    RETURNED = "returned"
    REFUND_INITIATED = "refund_initiated"
    REFUNDED = "refunded"
    FAILED = "failed"


class LoyaltyTierEnum(str, PyEnum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class LoyaltyTransactionTypeEnum(str, PyEnum):
    EARN = "earn"
    REDEEM = "redeem"
    EXPIRE = "expire"
    ADJUSTMENT = "adjustment"
    REFUND = "refund"
    REFERRAL_BONUS = "referral_bonus"
    PROMOTION_BONUS = "promotion_bonus"


class PaymentStatusEnum(str, PyEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PromotionTypeEnum(str, PyEnum):
    PERCENTAGE = "PERCENTAGE"
    FIXED_AMOUNT = "FIXED_AMOUNT"


class PromotionRuleTypeEnum(str, PyEnum):
    MINIMUM_CART_VALUE = "MINIMUM_CART_VALUE"
    BUY_X_GET_Y = "BUY_X_GET_Y"
    QUANTITY_BASED = "QUANTITY_BASED"
    CATEGORY_BASED = "CATEGORY_BASED"
    PRODUCT_BASED = "PRODUCT_BASED"
    FREE_SHIPPING = "FREE_SHIPPING"


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
    referral_code = Column(String(20), unique=True, nullable=True, index=True)
    referred_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    wishlist = relationship("Product", secondary=wishlist_association, back_populates="wishlisted_by")
    cart_items = relationship("Product", secondary=cart_association, back_populates="in_carts")
    referrer = relationship("User", remote_side=[id], backref="referred_users")
    loyalty_transactions = relationship("LoyaltyTransaction", back_populates="user", cascade="all, delete-orphan")
    loyalty_account = relationship("LoyaltyAccount", back_populates="user", uselist=False)
    recently_viewed = relationship("RecentlyViewed", back_populates="user", cascade="all, delete-orphan")
    support_tickets = relationship("SupportTicket", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
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
    
    # SEO
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)
    meta_keywords = Column(String(500), nullable=True)
    
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
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at")
    
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
    variant = relationship("ProductVariant", foreign_keys=[variant_id])
    
    __table_args__ = (
        Index('idx_order_item_order', 'order_id'),
    )


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    description = Column(String(500), nullable=True)
    discount_type = Column(String(20), nullable=False)  # percentage or fixed
    discount_value = Column(Float, nullable=False)
    minimum_order_value = Column(Float, default=0.0)
    maximum_discount = Column(Float, nullable=True)
    max_usage = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0)
    per_user_limit = Column(Integer, nullable=True)
    applicable_scope = Column(String(20), default='GLOBAL', nullable=False)  # GLOBAL, CATEGORY, PRODUCT
    priority = Column(Integer, default=0, nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    orders = relationship("Order", back_populates="coupon")
    category = relationship("Category", foreign_keys=[category_id])
    product = relationship("Product", foreign_keys=[product_id])

    __table_args__ = (
        Index('idx_coupon_code', 'code'),
        Index('idx_coupon_active', 'is_active'),
        Index('idx_coupon_dates', 'start_date', 'end_date'),
        Index('idx_coupon_scope', 'applicable_scope'),
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
    target_product_id = Column(Integer, ForeignKey('products.id', ondelete='SET NULL'), nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    target_product = relationship("Product")

    __table_args__ = (
        Index('idx_banner_active', 'is_active'),
    )

    @property
    def target_product_slug(self):
        return self.target_product.slug if self.target_product else None


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


class SiteSettings(Base):
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True)
    site_name = Column(String(255), default="NestinoKids")
    instagram_url = Column(String(500), default="https://instagram.com/nestinokids")
    facebook_url = Column(String(500), default="https://facebook.com/nestinokids")
    youtube_url = Column(String(500), default="https://youtube.com/@nestinokids")
    whatsapp_number = Column(String(20), default="")
    support_email = Column(String(255), default="support@nestinokids.com")
    support_phone = Column(String(20), default="9015957377")
    address = Column(Text, default="F-3/339 Street No., Sangam Vihar, New Delhi 110080")
    free_shipping_threshold = Column(Float, default=999.0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StoreSetting(Base):
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True)
    store_name = Column(String(255), nullable=False, default="NestinoKids")
    store_email = Column(String(255), nullable=True)
    store_phone = Column(String(20), nullable=True)
    store_address = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    currency = Column(String(10), nullable=False, default="INR")
    timezone = Column(String(50), nullable=False, default="Asia/Kolkata")
    gst_number = Column(String(50), nullable=True)
    tax_enabled = Column(Boolean, default=False)
    tax_percentage = Column(Float, default=0)
    free_shipping_enabled = Column(Boolean, default=False)
    free_shipping_min = Column(Float, default=0)
    cod_enabled = Column(Boolean, default=True)
    online_payment_enabled = Column(Boolean, default=True)
    maintenance_mode = Column(Boolean, default=False)

    # Marketplace / direct checkout feature flags
    direct_checkout_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    marketplace_purchase_enabled = Column(Boolean, nullable=False, default=True, server_default="true")

    # SEO defaults
    default_meta_title = Column(String(255), nullable=True)
    default_meta_description = Column(String(500), nullable=True)
    default_meta_keywords = Column(String(500), nullable=True)
    default_og_image = Column(String(500), nullable=True)
    default_canonical_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CustomerReview(Base):
    __tablename__ = "customer_reviews"

    id = Column(Integer, primary_key=True)
    customer_name = Column(String(255), nullable=False)
    customer_image = Column(String(255), nullable=True)
    review_text = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False)
    city = Column(String(100), nullable=True)
    is_featured = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class OrderTrackingEvent(Base):
    __tablename__ = "order_tracking_events"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    status = Column(String(50), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order")

    __table_args__ = (
        Index('idx_tracking_order', 'order_id'),
    )


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    old_status = Column(Enum(OrderStatusEnum), nullable=True)
    new_status = Column(Enum(OrderStatusEnum), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    changed_by_admin_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    remarks = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="status_history")
    changed_by_user = relationship("User", foreign_keys=[changed_by_user_id])
    changed_by_admin = relationship("User", foreign_keys=[changed_by_admin_id])

    __table_args__ = (
        Index('idx_status_history_order', 'order_id'),
        Index('idx_status_history_new_status', 'new_status'),
    )


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="Open")
    priority = Column(String(20), default="Medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="support_tickets")

    __table_args__ = (
        Index('idx_ticket_user', 'user_id'),
        Index('idx_ticket_status', 'status'),
    )


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index('idx_faq_category_active', 'category', 'is_active'),
    )


class AnnouncementBar(Base):
    __tablename__ = "announcement_bars"

    id = Column(Integer, primary_key=True)
    message = Column(String(500), nullable=False)
    link = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_announcement_active', 'is_active'),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String(30), default="Promotion")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index('idx_notification_user', 'user_id'),
        Index('idx_notification_read', 'user_id', 'is_read'),
    )


class RecentlyViewed(Base):
    __tablename__ = "recently_viewed"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    session_id = Column(String(100), nullable=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="recently_viewed")
    product = relationship("Product")

    __table_args__ = (
        Index('idx_recently_viewed_user', 'user_id'),
        Index('idx_recently_viewed_session', 'session_id'),
        Index('idx_recently_viewed_product', 'product_id'),
    )


class LoyaltyAccount(Base):
    __tablename__ = "loyalty_accounts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    current_points = Column(Integer, default=0, nullable=False)
    lifetime_earned = Column(Integer, default=0, nullable=False)
    lifetime_redeemed = Column(Integer, default=0, nullable=False)
    current_tier = Column(Enum(LoyaltyTierEnum), default=LoyaltyTierEnum.BRONZE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="loyalty_account")
    transactions = relationship("LoyaltyTransaction", back_populates="loyalty_account", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_loyalty_account_user', 'user_id'),
    )


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id = Column(Integer, primary_key=True)
    loyalty_account_id = Column(Integer, ForeignKey('loyalty_accounts.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=True)
    transaction_type = Column(Enum(LoyaltyTransactionTypeEnum), nullable=False)
    points = Column(Integer, nullable=False)
    balance_after = Column(Integer, default=0, nullable=False)
    description = Column(String(500), nullable=True)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    loyalty_account = relationship("LoyaltyAccount", back_populates="transactions")
    user = relationship("User", back_populates="loyalty_transactions")
    order = relationship("Order")

    __table_args__ = (
        Index('idx_loyalty_tx_user', 'user_id'),
        Index('idx_loyalty_tx_account', 'loyalty_account_id'),
        Index('idx_loyalty_tx_order', 'order_id'),
        Index('idx_loyalty_tx_type', 'transaction_type'),
    )


class HeroSlide(Base):
    __tablename__ = "hero_slides"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=True)
    subtitle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    media_type = Column(String(10), default="image")
    media_url = Column(String(500), nullable=False)
    mobile_media_url = Column(String(500), nullable=True)
    primary_button_text = Column(String(100), nullable=True)
    primary_button_link = Column(String(500), nullable=True)
    secondary_button_text = Column(String(100), nullable=True)
    secondary_button_link = Column(String(500), nullable=True)
    badge_text = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    view_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_audit_created_at", "created_at"),
        Index("idx_audit_entity_type", "entity_type"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_user_id", "user_id"),
    )


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False, index=True)
    file_size = Column(BigInteger, default=0)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    alt_text = Column(String(255), nullable=True)
    folder = Column(String(100), nullable=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    uploader = relationship("User", foreign_keys=[uploaded_by])

    __table_args__ = (
        Index("idx_media_folder", "folder"),
        Index("idx_media_file_type", "file_type"),
        Index("idx_media_created_at", "created_at"),
    )


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    promotion_type = Column(Enum(PromotionTypeEnum), nullable=False)
    discount_value = Column(Float, nullable=False)
    minimum_order_amount = Column(Float, default=0.0)
    maximum_discount_amount = Column(Float, nullable=True)
    priority = Column(Integer, default=0)
    is_stackable = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    banner_text = Column(String(500), nullable=True)
    badge_text = Column(String(100), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Future support — not fully implemented yet
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)

    creator = relationship("User", foreign_keys=[created_by])
    category = relationship("Category", foreign_keys=[category_id])
    product = relationship("Product", foreign_keys=[product_id])
    rules = relationship("PromotionRule", back_populates="promotion", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_promotion_active", "is_active"),
        Index("idx_promotion_dates", "start_date", "end_date"),
        Index("idx_promotion_priority", "priority"),
    )


class PromotionRule(Base):
    __tablename__ = "promotion_rules"

    id = Column(Integer, primary_key=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=False, index=True)
    rule_type = Column(Enum(PromotionRuleTypeEnum), nullable=False)

    # Condition parameters (varies by rule_type)
    minimum_cart_amount = Column(Float, nullable=True)
    minimum_quantity = Column(Integer, nullable=True)
    buy_quantity = Column(Integer, nullable=True)
    get_quantity = Column(Integer, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    target_product_id = Column(Integer, ForeignKey("products.id"), nullable=True)

    # Optional rule-level discount override
    discount_type = Column(String(20), nullable=True)
    discount_value = Column(Float, nullable=True)

    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    promotion = relationship("Promotion", back_populates="rules")
    category = relationship("Category", foreign_keys=[category_id])
    product = relationship("Product", foreign_keys=[product_id])
    target_product = relationship("Product", foreign_keys=[target_product_id])

    __table_args__ = (
        Index("idx_promotion_rule_promo", "promotion_id"),
        Index("idx_promotion_rule_type", "rule_type"),
    )


class MarketplaceCode(str, PyEnum):
    """Supported marketplaces.

    Stored as VARCHAR in PostgreSQL (application-level validation only) so that
    adding a new marketplace never requires an ALTER TYPE migration.
    """
    AMAZON = "AMAZON"
    FLIPKART = "FLIPKART"
    MYNTRA = "MYNTRA"
    FIRSTCRY = "FIRSTCRY"
    MEESHO = "MEESHO"


class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    marketplace = Column(String(20), nullable=False)
    external_product_id = Column(String(255), nullable=False)
    external_url = Column(String(2048), nullable=False)
    display_label = Column(String(255), nullable=True)
    allow_variant_fallback = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    priority = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    product = relationship("Product", foreign_keys=[product_id])
    variant = relationship("ProductVariant", foreign_keys=[variant_id])
    clicks = relationship("MarketplaceRedirectClick", back_populates="listing")

    __table_args__ = (
        Index('idx_marketplace_listing_product_active', 'product_id', 'is_active'),
        Index('idx_marketplace_listing_marketplace', 'marketplace'),
        Index(
    'uq_marketplace_listing_variant',
    'product_id',
    'variant_id',
    'marketplace',
    unique=True,
    postgresql_where=text('variant_id IS NOT NULL'),
    sqlite_where=text('variant_id IS NOT NULL'),
),
Index(
    'uq_marketplace_listing_product_level',
    'product_id',
    'marketplace',
    unique=True,
    postgresql_where=text('variant_id IS NULL'),
    sqlite_where=text('variant_id IS NULL'),
),
    )


class MarketplaceRedirectClick(Base):
    __tablename__ = "marketplace_redirect_clicks"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    marketplace_listing_id = Column(
        Integer,
        ForeignKey("marketplace_listings.id", ondelete="SET NULL"),
        nullable=True,
    )
    marketplace = Column(String(20), nullable=False)
    product_id = Column(Integer, nullable=True)
    variant_id = Column(Integer, nullable=True)
    source_page = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    clicked_at = Column(DateTime(timezone=True), server_default=func.now())

    listing = relationship("MarketplaceListing", back_populates="clicks")

    __table_args__ = (
        Index('idx_marketplace_click_listing', 'marketplace_listing_id'),
        Index('idx_marketplace_click_marketplace_time', 'marketplace', 'clicked_at'),
    )
