from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    referral_code: Optional[str] = Field(None, max_length=20)
    
    @field_validator('password')
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserResponse(UserBase):
    id: int
    is_active: bool
    role: str
    referral_code: Optional[str] = None
    referred_by: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    date_of_birth: Optional[datetime] = None


# Authentication Schemas
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# Category Schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: bool = True
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: int
    parent_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CategoryTreeResponse(CategoryBase):
    id: int
    parent_name: Optional[str] = None
    created_at: datetime
    children: List['CategoryTreeResponse'] = []
    
    class Config:
        from_attributes = True


# Product Image Schemas
class ProductImageBase(BaseModel):
    image_url: str
    alt_text: Optional[str] = None
    is_primary: bool = False
    order: int = 0


class ProductImageResponse(ProductImageBase):
    id: int
    
    class Config:
        from_attributes = True


# Product Variant Schemas
class ProductVariantBase(BaseModel):
    size: Optional[str] = None
    color: Optional[str] = None
    price_modifier: float = 0.0
    quantity: int = 0
    sku: str


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantResponse(ProductVariantBase):
    id: int
    
    class Config:
        from_attributes = True


# Product Schemas
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    description: str
    short_description: Optional[str] = None
    category_id: int
    price: float = Field(..., gt=0)
    discount_price: Optional[float] = None
    sku: str
    quantity: int = 0
    is_featured: bool = False
    is_active: bool = True
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None


class ProductCreate(ProductBase):
    images: Optional[List[ProductImageBase]] = []
    variants: Optional[List[ProductVariantBase]] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    sku: Optional[str] = None
    quantity: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    rating: float
    review_count: int
    images: List[ProductImageResponse] = []
    variants: List[ProductVariantResponse] = []
    category: Optional[CategoryResponse] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Address Schemas
class AddressBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: EmailStr
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_default: bool = False
    address_type: str = "residential"


class AddressCreate(AddressBase):
    pass


class AddressResponse(AddressBase):
    id: int
    
    class Config:
        from_attributes = True


# Order Item Schemas
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    variant_id: Optional[int] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    quantity: int
    price: float
    total: float
    variant_id: Optional[int] = None
    variant_name: Optional[str] = None
    variant_sku: Optional[str] = None
    variant_size: Optional[str] = None
    
    class Config:
        from_attributes = True


# Order Schemas
class OrderBase(BaseModel):
    shipping_address_id: int
    billing_address_id: Optional[int] = None
    payment_method: Optional[str] = None
    coupon_code: Optional[str] = None


class OrderCreate(OrderBase):
    items: List[OrderItemBase] = Field(..., min_items=1)


class CheckoutRequest(BaseModel):
    shipping_address_id: int
    billing_address_id: Optional[int] = None
    coupon_code: Optional[str] = None
    loyalty_points_to_redeem: int = 0


class OrderResponse(BaseModel):
    id: int
    order_number: str
    status: str
    total_amount: float
    discount_amount: float
    tax_amount: float
    shipping_amount: float
    final_amount: float
    payment_status: str
    created_at: datetime
    items: List[OrderItemResponse] = []
    
    class Config:
        from_attributes = True


# Order Lifecycle Schemas
class OrderTransitionRequest(BaseModel):
    new_status: str
    remarks: Optional[str] = None


class OrderStatusHistoryResponse(BaseModel):
    id: int
    old_status: Optional[str] = None
    new_status: str
    label: str = ""
    changed_by_admin_id: Optional[int] = None
    changed_by_user_id: Optional[int] = None
    remarks: Optional[str] = None
    metadata: Optional[dict] = None
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True


class OrderTimelineEntry(BaseModel):
    status: str
    label: str
    timestamp: Optional[str] = None
    remarks: Optional[str] = None


class OrderTimelineResponse(BaseModel):
    order_id: int
    current_status: str
    allowed_transitions: list[str]
    timeline: list[OrderTimelineEntry]


class AdminOrderResponse(BaseModel):
    id: int
    order_number: str
    customer_name: str
    customer_email: str
    total_amount: float
    discount_amount: float
    tax_amount: float
    shipping_amount: float
    final_amount: float
    payment_status: str
    order_status: str
    item_count: int
    created_at: datetime
    items: List[OrderItemResponse] = []
    allowed_transitions: List[str] = []
    status_history: List[OrderStatusHistoryResponse] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


# Coupon Schemas
class CouponBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: str  # percentage or fixed
    discount_value: float = Field(..., gt=0)
    minimum_order_value: float = 0.0
    maximum_discount: Optional[float] = None
    max_usage: Optional[int] = None
    per_user_limit: Optional[int] = None
    applicable_scope: str = "GLOBAL"  # GLOBAL, CATEGORY, PRODUCT
    priority: int = 0
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    start_date: datetime
    end_date: datetime
    is_active: bool = True

    @field_validator('end_date')
    def validate_dates(cls, v, info):
        start = info.data.get('start_date')
        if start and v < start:
            raise ValueError('end_date must be >= start_date')
        return v

    @field_validator('code')
    def validate_code(cls, v):
        return v.strip().upper()


class CouponCreate(CouponBase):
    pass


class CouponResponse(CouponBase):
    id: int
    usage_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    minimum_order_value: Optional[float] = None
    maximum_discount: Optional[float] = None
    max_usage: Optional[int] = None
    per_user_limit: Optional[int] = None
    applicable_scope: Optional[str] = None
    priority: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class CouponValidateRequest(BaseModel):
    coupon_code: str
    cart_total: float = 0.0
    product_ids: list[int] = []
    category_ids: list[int] = []


class CouponValidateResponse(BaseModel):
    valid: bool
    discount: float = 0.0
    discount_type: Optional[str] = None
    final_total: float = 0.0
    message: str = ""


# Review Schemas
class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ReviewCreate(ReviewBase):
    product_id: int


class ReviewResponse(ReviewBase):
    id: int
    product_id: int
    user_id: int
    is_verified_purchase: bool
    helpful_count: int
    is_approved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Wishlist Schemas
class WishlistItemResponse(BaseModel):
    id: int
    name: str
    slug: str
    price: float
    discount_price: Optional[float] = None
    images: List[ProductImageResponse] = []
    variants: List[ProductVariantResponse] = []
    
    class Config:
        from_attributes = True


# Cart Schemas
class CartItemResponse(BaseModel):
    id: int
    product_id: int
    name: str
    price: float
    quantity: int
    total: float
    images: List[ProductImageResponse] = []
    variant_id: Optional[int] = None
    variant_name: Optional[str] = None
    variant_sku: Optional[str] = None
    variant_size: Optional[str] = None
    
    class Config:
        from_attributes = True


# Inventory Schemas
class LatestOrderWidgetItem(BaseModel):
    order_number: str
    customer_name: str
    total_amount: float
    discount_amount: float
    tax_amount: float
    shipping_amount: float
    final_amount: float
    payment_status: str
    order_status: str
    item_count: int
    created_at: datetime


class LowStockWidgetItem(BaseModel):
    product_id: int
    product_name: str
    total_quantity: int
    available_quantity: int
    reserved_quantity: int
    low_stock_threshold: int


class TopSellingProductWidgetItem(BaseModel):
    product_id: int
    product_name: str
    total_sold: int


class DashboardWidgetsResponse(BaseModel):
    latest_orders: list[LatestOrderWidgetItem] = []
    low_stock_products: list[LowStockWidgetItem] = []
    top_selling_products: list[TopSellingProductWidgetItem] = []


class InventoryResponse(BaseModel):
    product_id: int
    product_name: str
    total_quantity: int
    available_quantity: int
    reserved_quantity: int
    low_stock_threshold: int
    last_restocked: Optional[datetime] = None
    low_stock: bool = False
    has_variants: bool = False

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    total_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None

    @field_validator('total_quantity', 'available_quantity', 'reserved_quantity', 'low_stock_threshold')
    def validate_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError('Value cannot be negative')
        return v


# Banner Schemas
def _validate_banner_image_url(v: str) -> str:
    """Allow local /uploads/... paths and http(s) URLs. Reject unsafe schemes."""
    value = (v or "").strip()
    if not value:
        raise ValueError("image URL cannot be empty")
    if value.startswith("/"):
        return value
    if value.lower().startswith(("http://", "https://")):
        return value
    raise ValueError("image URL must be a relative /uploads/... path or an http(s) URL")


def _validate_banner_link(v: Optional[str]) -> Optional[str]:
    """Validate CTA link: internal relative links, anchors, mailto, or http(s). Reject unsafe schemes."""
    if v is None:
        return v
    value = v.strip()
    if not value:
        return None
    lowered = value.lower()
    if value.startswith(("/", "#", "mailto:", "tel:")) or lowered.startswith(("http://", "https://")):
        return value
    raise ValueError("button_link must be an internal path or an http(s)/mailto/tel URL")


class BannerBase(BaseModel):
    title: Optional[str] = None
    image_url: str
    mobile_image_url: Optional[str] = None
    description: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    target_category_id: Optional[int] = None
    target_product_id: Optional[int] = None
    is_active: bool = True
    order: int = 0

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is None:
            return ""
        return v.strip()

    @field_validator('image_url')
    @classmethod
    def validate_image_url(cls, v):
        return _validate_banner_image_url(v)

    @field_validator('mobile_image_url')
    @classmethod
    def validate_mobile_image_url(cls, v):
        if v is None:
            return v
        return _validate_banner_image_url(v)

    @field_validator('button_link')
    @classmethod
    def validate_button_link(cls, v):
        return _validate_banner_link(v)

    @field_validator('order')
    @classmethod
    def validate_order(cls, v):
        if v is not None and v < 0:
            raise ValueError('Order must be >= 0')
        return v


class BannerCreate(BannerBase):
    pass


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    description: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    target_category_id: Optional[int] = None
    target_product_id: Optional[int] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is None:
            return None
        return v.strip()

    @field_validator('image_url')
    @classmethod
    def validate_image_url(cls, v):
        if v is None:
            return v
        return _validate_banner_image_url(v)

    @field_validator('mobile_image_url')
    @classmethod
    def validate_mobile_image_url(cls, v):
        if v is None:
            return v
        return _validate_banner_image_url(v)

    @field_validator('button_link')
    @classmethod
    def validate_button_link(cls, v):
        return _validate_banner_link(v)

    @field_validator('order')
    @classmethod
    def validate_order(cls, v):
        if v is not None and v < 0:
            raise ValueError('Order must be >= 0')
        return v


class BannerUploadResponse(BaseModel):
    url: str


class BannerResponse(BannerBase):
    id: int
    target_product_slug: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Site Settings Schemas
class SiteSettingsResponse(BaseModel):
    site_name: str = "NestinoKids"
    instagram_url: str = "https://instagram.com/nestinokids"
    facebook_url: str = "https://facebook.com/nestinokids"
    youtube_url: str = "https://youtube.com/@nestinokids"
    whatsapp_number: str = ""
    support_email: str = "support@nestinokids.com"
    support_phone: str = "9015957377"
    address: str = "F-3/339 Street No., Sangam Vihar, New Delhi 110080"
    free_shipping_threshold: float = 999.0
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SiteSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    youtube_url: Optional[str] = None
    whatsapp_number: Optional[str] = None
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    address: Optional[str] = None
    free_shipping_threshold: Optional[float] = None


# Customer Review Schemas (homepage testimonials)
class CustomerReviewBase(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=255)
    review_text: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)
    city: Optional[str] = None
    is_featured: bool = False
    display_order: int = 0
    is_active: bool = True


class CustomerReviewCreate(CustomerReviewBase):
    pass


class CustomerReviewUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_image: Optional[str] = None
    review_text: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    city: Optional[str] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class CustomerReviewResponse(CustomerReviewBase):
    id: int
    customer_image: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Instagram Post Schemas
class InstagramPostBase(BaseModel):
    post_url: str
    thumbnail_image: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class InstagramPostCreate(InstagramPostBase):
    pass


class InstagramPostUpdate(BaseModel):
    post_url: Optional[str] = None
    thumbnail_image: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class InstagramPostResponse(InstagramPostBase):
    id: int
    click_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Hero Slide Schemas
class HeroSlideBase(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    media_type: str = "image"
    media_url: str
    mobile_media_url: Optional[str] = None
    primary_button_text: Optional[str] = None
    primary_button_link: Optional[str] = None
    secondary_button_text: Optional[str] = None
    secondary_button_link: Optional[str] = None
    badge_text: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class HeroSlideCreate(HeroSlideBase):
    pass


class HeroSlideUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    mobile_media_url: Optional[str] = None
    primary_button_text: Optional[str] = None
    primary_button_link: Optional[str] = None
    secondary_button_text: Optional[str] = None
    secondary_button_link: Optional[str] = None
    badge_text: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class HeroSlideResponse(HeroSlideBase):
    id: int
    view_count: int = 0
    click_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Recently Viewed Schemas
class RecentlyViewedResponse(BaseModel):
    id: int
    product_id: int
    viewed_at: datetime

    class Config:
        from_attributes = True


# Recommendation Schemas
class RecommendationResponse(BaseModel):
    products: List[ProductResponse]
    source: str = ""


# Loyalty Schemas
class LoyaltySummaryResponse(BaseModel):
    current_points: int = 0
    lifetime_earned: int = 0
    lifetime_redeemed: int = 0
    current_tier: str = "bronze"
    tier_progress: dict = {}


class LoyaltyTransactionResponse(BaseModel):
    id: int
    points: int
    transaction_type: str
    description: Optional[str] = None
    order_id: Optional[int] = None
    balance_after: int = 0
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    expires_at: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoyaltyHistoryResponse(BaseModel):
    total: int = 0
    items: list[LoyaltyTransactionResponse] = []


class LoyaltyAdjustRequest(BaseModel):
    user_id: int
    points: int
    reason: str = "Admin adjustment"


class LoyaltyRedeemRequest(BaseModel):
    points: int
    order_amount: float


class LoyaltyRedeemableResponse(BaseModel):
    available_points: int = 0
    max_redeemable_points: int = 0
    max_discount: float = 0.0
    redemption_rate: float = 1.0
    max_redemption_percent: float = 50.0


class LoyaltyAccountAdminResponse(BaseModel):
    user_id: int
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    current_points: int = 0
    lifetime_earned: int = 0
    lifetime_redeemed: int = 0
    current_tier: str = "bronze"


class LoyaltyAdminListResponse(BaseModel):
    total: int = 0
    items: list[LoyaltyAccountAdminResponse] = []


# Referral Schemas
class ReferralApplyRequest(BaseModel):
    code: str


class ReferralResponse(BaseModel):
    referral_code: str
    referred_users_count: int = 0
    referral_link: str = ""


class ReferralAnalyticsResponse(BaseModel):
    total_referrals: int = 0
    successful_referrals: int = 0
    points_awarded: int = 0


# Admin Analytics Extension
class LoyaltyAnalyticsResponse(BaseModel):
    total_points_issued: int = 0
    total_points_redeemed: int = 0
    total_referrals: int = 0
    repeat_customer_rate: float = 0.0
    most_wishlisted_products: list = []


class DashboardResponse(BaseModel):
    total_products: int
    active_products: int = 0
    total_categories: int
    total_orders: int
    pending_orders: int
    delivered_orders: int
    cancelled_orders: int = 0
    total_users: int
    total_inventory_items: int
    inventory_value: float = 0.0
    low_stock_products: int
    out_of_stock_products: int
    total_revenue: float
    total_loyalty_points_issued: int = 0
    total_loyalty_points_redeemed: int = 0
    total_referrals: int = 0
    repeat_customer_rate: float = 0.0
    most_wishlisted_products: list = []
    open_tickets: int = 0
    resolved_tickets: int = 0
    total_notifications_sent: int = 0


class DashboardChartsResponse(BaseModel):
    revenue_trend: list[dict] = []
    orders_trend: list[dict] = []
    order_status: list[dict] = []


# ─── Phase 8 Schemas ───

# Order Tracking Schemas
class OrderTrackingEventResponse(BaseModel):
    id: int
    order_id: int
    status: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OrderTrackingCreate(BaseModel):
    status: str
    note: Optional[str] = None


# Support Ticket Schemas
class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)


class SupportTicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None


class SupportTicketResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    message: str
    status: str
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True


class SupportTicketAdminResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    message: str
    status: str
    priority: str
    created_at: datetime
    user_name: str = ""
    user_email: str = ""

    class Config:
        from_attributes = True


# FAQ Schemas
class FAQCreate(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    category: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class FAQResponse(BaseModel):
    id: int
    question: str
    answer: str
    category: Optional[str] = None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Announcement Bar Schemas
class AnnouncementCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    link: Optional[str] = None
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    message: Optional[str] = None
    link: Optional[str] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: int
    message: str
    link: Optional[str] = None
    is_active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Notification Schemas
class NotificationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: Optional[str] = None
    type: str = "Promotion"
    target_user_id: Optional[int] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: Optional[str] = None
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationType:
    NEW_ORDER = "NEW_ORDER"
    LOW_STOCK = "LOW_STOCK"
    SUPPORT_TICKET = "SUPPORT_TICKET"
    ORDER_CANCELLED = "ORDER_CANCELLED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    SYSTEM = "SYSTEM"


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    count: int = 0


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: str = ""
    user_email: str = ""
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    description: Optional[str] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int


class GlobalSearchResult(BaseModel):
    type: str
    id: int
    title: str
    subtitle: str
    url: str
    metadata: Optional[dict] = None


class GlobalSearchResponse(BaseModel):
    query: str
    results: dict[str, list[GlobalSearchResult]]
    total_results: int


# ─── Staff Management ───


class StaffUserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StaffCreateRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str


class StaffUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class StaffPasswordResetRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=100)


# ─── Store Settings ───


class StoreSettingResponse(BaseModel):
    id: int
    store_name: str = "NestinoKids"
    store_email: Optional[str] = None
    store_phone: Optional[str] = None
    store_address: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    gst_number: Optional[str] = None
    tax_enabled: bool = False
    tax_percentage: float = 0
    free_shipping_enabled: bool = False
    free_shipping_min: float = 0
    cod_enabled: bool = True
    online_payment_enabled: bool = True
    maintenance_mode: bool = False
    direct_checkout_enabled: bool = False
    marketplace_purchase_enabled: bool = True
    default_meta_title: Optional[str] = None
    default_meta_description: Optional[str] = None
    default_meta_keywords: Optional[str] = None
    default_og_image: Optional[str] = None
    default_canonical_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StoreSettingUpdate(BaseModel):
    store_name: Optional[str] = None
    store_email: Optional[str] = None
    store_phone: Optional[str] = None
    store_address: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    gst_number: Optional[str] = None
    tax_enabled: Optional[bool] = None
    tax_percentage: Optional[float] = None
    free_shipping_enabled: Optional[bool] = None
    free_shipping_min: Optional[float] = None
    cod_enabled: Optional[bool] = None
    online_payment_enabled: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    direct_checkout_enabled: Optional[bool] = None
    marketplace_purchase_enabled: Optional[bool] = None
    default_meta_title: Optional[str] = None
    default_meta_description: Optional[str] = None
    default_meta_keywords: Optional[str] = None
    default_og_image: Optional[str] = None
    default_canonical_url: Optional[str] = None


# ─── Analytics ───


class AnalyticsSummaryResponse(BaseModel):
    total_revenue: float = 0
    total_orders: int = 0
    average_order_value: float = 0
    total_customers: int = 0
    pending_orders: int = 0


class SalesTrendItem(BaseModel):
    date: str
    revenue: float = 0
    orders: int = 0


class TopProductItem(BaseModel):
    product_id: int
    name: str = ""
    image: Optional[str] = None
    sold_quantity: int = 0
    revenue: float = 0


class OrderStatusItem(BaseModel):
    status: str
    count: int = 0


class LowStockItem(BaseModel):
    product_id: int
    name: str = ""
    image: Optional[str] = None
    available_quantity: int = 0
    low_stock_threshold: int = 0
    store_email: Optional[str] = None
    store_phone: Optional[str] = None
    store_address: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    gst_number: Optional[str] = None
    tax_enabled: Optional[bool] = None
    tax_percentage: Optional[float] = None
    free_shipping_enabled: Optional[bool] = None
    free_shipping_min: Optional[float] = None
    cod_enabled: Optional[bool] = None
    online_payment_enabled: Optional[bool] = None
    maintenance_mode: Optional[bool] = None


# ─── Media ───


class MediaAssetResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_url: str
    file_type: str
    file_size: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    alt_text: Optional[str] = None
    folder: Optional[str] = None
    uploaded_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MediaListResponse(BaseModel):
    items: list[MediaAssetResponse]
    total: int


class MediaUpdateRequest(BaseModel):
    alt_text: Optional[str] = None
    folder: Optional[str] = None


# ─── Promotions ───


class PromotionRuleCreate(BaseModel):
    rule_type: str
    minimum_cart_amount: Optional[float] = None
    minimum_quantity: Optional[int] = None
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    target_product_id: Optional[int] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    priority: int = 0
    is_active: bool = True


class PromotionRuleResponse(BaseModel):
    id: int
    promotion_id: int
    rule_type: str
    minimum_cart_amount: Optional[float] = None
    minimum_quantity: Optional[int] = None
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    target_product_id: Optional[int] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PromotionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    promotion_type: str  # PERCENTAGE or FIXED_AMOUNT
    discount_value: float = Field(..., gt=0)
    minimum_order_amount: float = 0.0
    maximum_discount_amount: Optional[float] = None
    priority: int = 0
    is_stackable: bool = False
    is_active: bool = True
    start_date: datetime
    end_date: datetime
    banner_text: Optional[str] = None
    badge_text: Optional[str] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    rules: list[PromotionRuleCreate] = []

    @field_validator('minimum_order_amount')
    def validate_minimum_order_amount(cls, v):
        if v < 0:
            raise ValueError('minimum_order_amount must be >= 0')
        return v

    @field_validator('maximum_discount_amount')
    def validate_maximum_discount_amount(cls, v):
        if v is not None and v < 0:
            raise ValueError('maximum_discount_amount must be >= 0')
        return v

    @field_validator('priority')
    def validate_priority(cls, v):
        if v < 0:
            raise ValueError('priority must be >= 0')
        return v

    @field_validator('end_date')
    def validate_dates(cls, v, info):
        start = info.data.get('start_date')
        if start and v < start:
            raise ValueError('end_date must be >= start_date')
        return v


class PromotionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    promotion_type: Optional[str] = None
    discount_value: Optional[float] = None
    minimum_order_amount: Optional[float] = None
    maximum_discount_amount: Optional[float] = None
    priority: Optional[int] = None
    is_stackable: Optional[bool] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    banner_text: Optional[str] = None
    badge_text: Optional[str] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    rules: Optional[list[PromotionRuleCreate]] = None


class PromotionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    promotion_type: str
    discount_value: float
    minimum_order_amount: float
    maximum_discount_amount: Optional[float] = None
    priority: int
    is_stackable: bool
    is_active: bool
    start_date: datetime
    end_date: datetime
    banner_text: Optional[str] = None
    badge_text: Optional[str] = None
    created_by: Optional[int] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    rules: list[PromotionRuleResponse] = []

    class Config:
        from_attributes = True


class PromotionListResponse(BaseModel):
    items: list[PromotionResponse]
    total: int


# Promotion Rule Evaluation Schemas
class CartItemEvaluation(BaseModel):
    product_id: int
    category_id: Optional[int] = None
    quantity: int
    price: float


class PromotionEvaluateRequest(BaseModel):
    cart_total: float
    items: list[CartItemEvaluation]


class EligiblePromotion(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    promotion_type: str
    discount_value: float
    badge_text: Optional[str] = None
    banner_text: Optional[str] = None


class PromotionEvaluateResponse(BaseModel):
    eligible_promotions: list[EligiblePromotion]
    best_promotion: Optional[EligiblePromotion] = None
    discount_amount: float = 0.0
    free_shipping: bool = False


# Order Calculation Engine Schemas
class CalculationNotification(BaseModel):
    type: str  # promotion, coupon, shipping, warning, info
    text: str


class CartCalculateRequest(BaseModel):
    coupon_code: Optional[str] = None


class AppliedPromotionInfo(BaseModel):
    id: int
    name: str
    badge_text: Optional[str] = None
    discount_amount: float = 0.0


class AppliedCouponInfo(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    discount_amount: float


class CalculationResponse(BaseModel):
    subtotal: float
    item_count: int

    promotion_discount: float = 0.0
    applied_promotions: list[AppliedPromotionInfo] = []
    free_shipping: bool = False

    coupon_discount: float = 0.0
    applied_coupon: Optional[AppliedCouponInfo] = None
    coupon_error: Optional[str] = None

    shipping: float = 0.0
    free_shipping_threshold: float = 500.0

    tax: float = 0.0

    wallet_discount: float = 0.0
    loyalty_discount: float = 0.0
    loyalty_points_redeemed: int = 0
    gift_card_discount: float = 0.0

    grand_total: float
    currency: str = "INR"
    calculated_at: datetime

    notifications: list[CalculationNotification] = []
