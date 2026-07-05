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


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None


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

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


# Coupon Schemas
class CouponBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = None
    discount_type: str  # percentage or fixed
    discount_value: float = Field(..., gt=0)
    minimum_order_value: float = 0.0
    maximum_discount: Optional[float] = None
    max_usage: Optional[int] = None
    start_date: datetime
    end_date: datetime
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponResponse(CouponBase):
    id: int
    usage_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    minimum_order_value: Optional[float] = None
    maximum_discount: Optional[float] = None
    max_usage: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None


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
class BannerBase(BaseModel):
    title: str
    image_url: str
    mobile_image_url: Optional[str] = None
    description: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    target_category_id: Optional[int] = None
    is_active: bool = True
    order: int = 0


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
    is_active: Optional[bool] = None
    order: Optional[int] = None


class BannerResponse(BannerBase):
    id: int
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


class LoyaltyTransactionResponse(BaseModel):
    id: int
    points: int
    transaction_type: str
    description: Optional[str] = None
    order_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoyaltyHistoryResponse(BaseModel):
    summary: LoyaltySummaryResponse
    transactions: list[LoyaltyTransactionResponse] = []


class LoyaltyAdjustRequest(BaseModel):
    user_id: int
    points: int
    description: str = "Admin adjustment"


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
