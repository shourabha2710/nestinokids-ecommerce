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
    created_at: datetime
    
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
    description: Optional[str] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    quantity: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    rating: float
    review_count: int
    images: List[ProductImageResponse] = []
    variants: List[ProductVariantResponse] = []
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
    quantity: int
    price: float
    total: float
    
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
    price: float
    discount_price: Optional[float]
    images: List[ProductImageResponse] = []
    
    class Config:
        from_attributes = True


# Cart Schemas
class CartItemResponse(BaseModel):
    id: int
    name: str
    price: float
    quantity: int
    total: float
    images: List[ProductImageResponse] = []
    
    class Config:
        from_attributes = True


# Inventory Schemas
class InventoryResponse(BaseModel):
    product_id: int
    product_name: str
    total_quantity: int
    available_quantity: int
    reserved_quantity: int
    low_stock_threshold: int
    last_restocked: Optional[datetime] = None
    low_stock: bool = False

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    available_quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None

    @field_validator('available_quantity', 'reserved_quantity', 'low_stock_threshold')
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
