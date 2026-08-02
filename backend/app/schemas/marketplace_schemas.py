from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from datetime import datetime

from app.models.models import MarketplaceCode


# ─── Listing schemas ──────────────────────────────────────────────────────────


class MarketplaceListingBase(BaseModel):
    product_id: int = Field(..., gt=0)
    variant_id: Optional[int] = Field(None, gt=0)
    marketplace: MarketplaceCode
    external_product_id: str = Field(..., min_length=1, max_length=255)
    external_url: str = Field(..., min_length=1, max_length=2048)
    display_label: Optional[str] = Field(None, max_length=255)
    allow_variant_fallback: bool = False
    is_active: bool = True
    priority: int = Field(0, ge=0)


class MarketplaceListingCreate(MarketplaceListingBase):
    pass


class MarketplaceListingUpdate(BaseModel):
    variant_id: Optional[int] = Field(None, gt=0)
    marketplace: Optional[MarketplaceCode] = None
    external_product_id: Optional[str] = Field(None, min_length=1, max_length=255)
    external_url: Optional[str] = Field(None, min_length=1, max_length=2048)
    display_label: Optional[str] = Field(None, max_length=255)
    allow_variant_fallback: Optional[bool] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0)


class MarketplaceListingResponse(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    marketplace: str
    external_product_id: str
    external_url: str
    display_label: Optional[str] = None
    allow_variant_fallback: bool
    is_active: bool
    priority: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicMarketplaceListingResponse(BaseModel):
    id: int
    marketplace: str
    external_product_id: str
    external_url: str
    display_label: Optional[str] = None
    variant_id: Optional[int] = None
    is_product_level: bool = False

    class Config:
        from_attributes = True


# ─── Resolve schemas ──────────────────────────────────────────────────────────


class ResolveItem(BaseModel):
    product_id: int = Field(..., gt=0)
    variant_id: Optional[int] = Field(None, gt=0)


class ResolveRequest(BaseModel):
    items: List[ResolveItem] = Field(..., max_length=200)


class ResolveResponse(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    listings: List[PublicMarketplaceListingResponse]


# ─── Click tracking schemas ───────────────────────────────────────────────────


class ClickCreate(BaseModel):
    marketplace_listing_id: int = Field(..., gt=0)
    product_id: int = Field(..., gt=0)
    variant_id: Optional[int] = Field(None, gt=0)
    source_page: Optional[str] = Field(None, max_length=255)


class ClickResponse(BaseModel):
    redirect_url: str
    marketplace: str


# ─── Analytics schemas ────────────────────────────────────────────────────────


class MarketplaceAnalyticsSummary(BaseModel):
    total_clicks: int = 0


class MarketplaceAnalyticsBreakdownItem(BaseModel):
    marketplace: str
    clicks: int = 0
    share: float = 0.0


class MarketplaceSourceBreakdownItem(BaseModel):
    source_page: Optional[str] = None
    clicks: int = 0
    share: float = 0.0


class MarketplaceDailyTrendItem(BaseModel):
    date: str
    clicks: int = 0


class MarketplaceTopProductItem(BaseModel):
    product_id: int
    name: str = ""
    is_active: bool = True
    clicks: int = 0
    marketplace_clicks: Dict[str, int] = {}
    source_clicks: Dict[str, int] = {}


class MarketplaceRecentClickItem(BaseModel):
    id: int
    marketplace: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    variant_id: Optional[int] = None
    variant_label: Optional[str] = None
    source_page: Optional[str] = None
    clicked_at: Optional[datetime] = None


class MarketplaceAnalyticsResponse(BaseModel):
    summary: MarketplaceAnalyticsSummary
    marketplace_breakdown: List[MarketplaceAnalyticsBreakdownItem] = []
    source_breakdown: List[MarketplaceSourceBreakdownItem] = []
    daily_trend: List[MarketplaceDailyTrendItem] = []
    top_products: List[MarketplaceTopProductItem] = []
    recent_clicks: List[MarketplaceRecentClickItem] = []
