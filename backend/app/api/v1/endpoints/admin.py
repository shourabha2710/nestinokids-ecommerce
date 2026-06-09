import os
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db.database import get_db
from app.schemas.schemas import (
    AdminOrderResponse,
    BannerCreate,
    BannerResponse,
    BannerUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    InstagramPostCreate,
    InstagramPostResponse,
    InstagramPostUpdate,
    InventoryUpdate,
    InventoryResponse,
    OrderItemResponse,
    OrderStatusUpdate,
    ProductCreate,
    ProductImageResponse,
    ProductResponse,
    ProductUpdate,
)
from sqlalchemy.orm import joinedload
from app.models.models import (
    Product, Category, Order, OrderItem, User, ProductImage, Inventory,
    Banner, InstagramPost, InstagramPostClick, OrderStatusEnum, PaymentStatusEnum,
    LoyaltyTransaction, SupportTicket, Notification, wishlist_association,
)
from app.api.v1.endpoints.auth import require_admin
from app.utils.helpers import generate_slug, generate_sku
from app.core.config import settings
from typing import List, Optional
from pydantic import BaseModel

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class DashboardResponse(BaseModel):
    total_products: int
    total_categories: int
    total_orders: int
    total_users: int
    total_inventory_items: int
    low_stock_products: int
    out_of_stock_products: int
    pending_orders: int
    delivered_orders: int
    total_revenue: float
    total_loyalty_points_issued: int = 0
    total_loyalty_points_redeemed: int = 0
    total_referrals: int = 0
    repeat_customer_rate: float = 0.0
    most_wishlisted_products: list = []
    open_tickets: int = 0
    resolved_tickets: int = 0
    total_notifications_sent: int = 0


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    total_inventory = db.query(func.count(Inventory.id)).scalar() or 0
    low_stock = (
        db.query(func.count(Inventory.id))
        .filter(Inventory.available_quantity <= Inventory.low_stock_threshold)
        .filter(Inventory.available_quantity > 0)
        .scalar() or 0
    )
    out_of_stock = (
        db.query(func.count(Inventory.id))
        .filter(Inventory.available_quantity <= 0)
        .scalar() or 0
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(Order.final_amount), 0))
        .filter(Order.status == OrderStatusEnum.DELIVERED)
        .scalar()
    )

    # Loyalty analytics
    total_loyalty_points_issued = (
        db.query(func.coalesce(func.sum(LoyaltyTransaction.points), 0))
        .filter(LoyaltyTransaction.transaction_type.in_(["earned", "signup_bonus", "referral_bonus", "admin_adjustment"]), LoyaltyTransaction.points > 0)
        .scalar() or 0
    )
    total_loyalty_points_redeemed = (
        db.query(func.coalesce(func.sum(LoyaltyTransaction.points), 0))
        .filter(LoyaltyTransaction.transaction_type == "redeemed")
        .scalar() or 0
    )

    # Referral analytics
    total_referrals = (
        db.query(func.count(User.id))
        .filter(User.referred_by.isnot(None))
        .scalar() or 0
    )

    # Repeat customer rate (users with >1 delivered order)
    total_users_with_orders = (
        db.query(func.count(func.distinct(Order.user_id)))
        .filter(Order.status == OrderStatusEnum.DELIVERED)
        .scalar() or 0
    )
    repeat_customers = (
        db.query(func.count(func.distinct(Order.user_id)))
        .filter(Order.status == OrderStatusEnum.DELIVERED)
        .group_by(Order.user_id)
        .having(func.count(Order.id) > 1)
        .subquery()
    )
    repeat_count = db.query(func.count()).select_from(repeat_customers).scalar() or 0
    repeat_customer_rate = round((repeat_count / total_users_with_orders * 100), 1) if total_users_with_orders > 0 else 0.0

    # Most wishlisted products
    most_wishlisted = (
        db.query(
            wishlist_association.c.product_id,
            func.count(wishlist_association.c.user_id).label("wishlist_count"),
        )
        .group_by(wishlist_association.c.product_id)
        .order_by(desc("wishlist_count"))
        .limit(5)
        .all()
    )
    most_wishlisted_products = []
    for product_id, count in most_wishlisted:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            most_wishlisted_products.append({
                "id": product.id,
                "name": product.name,
                "wishlist_count": count,
            })

    # Support ticket stats
    open_tickets = db.query(func.count(SupportTicket.id)).filter(
        SupportTicket.status.in_(["Open", "In Progress"])
    ).scalar() or 0
    resolved_tickets = db.query(func.count(SupportTicket.id)).filter(
        SupportTicket.status == "Resolved"
    ).scalar() or 0

    # Notification stats
    total_notifications_sent = db.query(func.count(Notification.id)).scalar() or 0

    return DashboardResponse(
        total_products=db.query(func.count(Product.id)).scalar() or 0,
        total_categories=db.query(func.count(Category.id)).scalar() or 0,
        total_orders=db.query(func.count(Order.id)).scalar() or 0,
        total_users=db.query(func.count(User.id)).scalar() or 0,
        total_inventory_items=total_inventory,
        low_stock_products=low_stock,
        out_of_stock_products=out_of_stock,
        pending_orders=db.query(func.count(Order.id)).filter(Order.status == OrderStatusEnum.PENDING).scalar() or 0,
        delivered_orders=db.query(func.count(Order.id)).filter(Order.status == OrderStatusEnum.DELIVERED).scalar() or 0,
        total_revenue=total_revenue,
        total_loyalty_points_issued=total_loyalty_points_issued,
        total_loyalty_points_redeemed=total_loyalty_points_redeemed,
        total_referrals=total_referrals,
        repeat_customer_rate=repeat_customer_rate,
        most_wishlisted_products=most_wishlisted_products,
        open_tickets=open_tickets,
        resolved_tickets=resolved_tickets,
        total_notifications_sent=total_notifications_sent,
    )


def _build_inventory_response(inventory: Inventory) -> dict:
    return {
        "product_id": inventory.product_id,
        "product_name": inventory.product.name,
        "total_quantity": inventory.total_quantity,
        "available_quantity": inventory.available_quantity,
        "reserved_quantity": inventory.reserved_quantity,
        "low_stock_threshold": inventory.low_stock_threshold,
        "last_restocked": inventory.last_restocked,
        "low_stock": inventory.available_quantity <= inventory.low_stock_threshold,
    }


@router.get("/inventory", response_model=List[InventoryResponse])
def admin_get_inventory(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(Inventory).join(Product)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    inventory_list = query.order_by(Product.name.asc()).all()
    return [_build_inventory_response(inv) for inv in inventory_list]


@router.get("/inventory/{product_id}", response_model=InventoryResponse)
def admin_get_inventory_item(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found for this product")
    return _build_inventory_response(inventory)


@router.put("/inventory/{product_id}", response_model=InventoryResponse)
def admin_update_inventory(
    product_id: int,
    data: InventoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found for this product")

    update_data = data.dict(exclude_unset=True)

    if "available_quantity" in update_data:
        if update_data["available_quantity"] > inventory.total_quantity:
            raise HTTPException(
                status_code=400,
                detail="available_quantity cannot exceed total_quantity",
            )
        inventory.available_quantity = update_data["available_quantity"]

    if "reserved_quantity" in update_data:
        if update_data["reserved_quantity"] > inventory.total_quantity:
            raise HTTPException(
                status_code=400,
                detail="reserved_quantity cannot exceed total_quantity",
            )
        inventory.reserved_quantity = update_data["reserved_quantity"]

    if "low_stock_threshold" in update_data:
        inventory.low_stock_threshold = update_data["low_stock_threshold"]

    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    return _build_inventory_response(inventory)


@router.get("/banners", response_model=List[BannerResponse])
def admin_get_banners(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banners = (
        db.query(Banner)
        .order_by(Banner.order.asc(), Banner.created_at.desc())
        .all()
    )
    return banners


@router.get("/banners/{banner_id}", response_model=BannerResponse)
def admin_get_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return banner


@router.post("/banners", response_model=BannerResponse, status_code=status.HTTP_201_CREATED)
def admin_create_banner(
    data: BannerCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = Banner(**data.dict())
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


@router.put("/banners/{banner_id}", response_model=BannerResponse)
def admin_update_banner(
    banner_id: int,
    data: BannerUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(banner, field, value)

    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


@router.delete("/banners/{banner_id}")
def admin_delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    db.delete(banner)
    db.commit()
    return {"message": "Banner deleted successfully"}


def _build_admin_order(order: Order) -> dict:
    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_name": f"{order.user.first_name} {order.user.last_name}",
        "customer_email": order.user.email,
        "total_amount": order.total_amount,
        "discount_amount": order.discount_amount,
        "tax_amount": order.tax_amount,
        "shipping_amount": order.shipping_amount,
        "final_amount": order.final_amount,
        "payment_status": order.payment_status.value if hasattr(order.payment_status, 'value') else order.payment_status,
        "order_status": order.status.value if hasattr(order.status, 'value') else order.status,
        "item_count": len(order.items),
        "created_at": order.created_at,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else "",
                "quantity": item.quantity,
                "price": item.price,
                "total": item.total,
            }
            for item in order.items
        ],
    }


VALID_STATUS_TRANSITIONS = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["packed", "cancelled"],
    "packed": ["shipped"],
    "shipped": ["delivered"],
    "delivered": [],
    "cancelled": [],
    "returned": [],
}


@router.get("/orders", response_model=List[AdminOrderResponse])
def admin_get_orders(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = (
        db.query(Order)
        .join(User)
        .outerjoin(OrderItem)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
    )
    if search:
        query = query.filter(Order.order_number.ilike(f"%{search}%"))
    if status:
        query = query.filter(Order.status == status)
    orders = (
        query
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_build_admin_order(o) for o in orders]


@router.get("/orders/{order_id}", response_model=AdminOrderResponse)
def admin_get_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _build_admin_order(order)


@router.put("/orders/{order_id}/status", response_model=AdminOrderResponse)
def admin_update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    current_status = order.status.value if hasattr(order.status, 'value') else order.status
    new_status = data.status.lower()

    if new_status == current_status:
        raise HTTPException(status_code=400, detail="Order is already in this status")

    valid_next = VALID_STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in valid_next:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'. Valid transitions: {valid_next}",
        )

    order.status = new_status

    if new_status == "shipped":
        order.shipped_at = datetime.utcnow()
    elif new_status == "delivered":
        order.delivered_at = datetime.utcnow()

    db.add(order)
    db.flush()

    # Create tracking event for status change
    from app.models.models import OrderTrackingEvent
    tracking_note = data.note if hasattr(data, 'note') and data.note else f"Order status updated to {new_status}"
    tracking = OrderTrackingEvent(
        order_id=order_id,
        status=new_status.title(),
        note=tracking_note,
    )
    db.add(tracking)

    # Award loyalty points on delivery
    if new_status == "delivered":
        from app.api.v1.endpoints.engagement import award_loyalty_points_for_order
        award_loyalty_points_for_order(order_id, db)

    db.commit()
    db.refresh(order)
    return _build_admin_order(order)


@router.get("/products", response_model=List[ProductResponse])
def admin_get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    products = (
        db.query(Product)
        .order_by(Product.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return products


@router.get("/products/{product_id}", response_model=ProductResponse)
def admin_get_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def admin_create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = db.query(Category).filter(Category.id == product_data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    slug = product_data.slug or generate_slug(product_data.name)

    existing_slug = db.query(Product).filter(Product.slug == slug).first()
    if existing_slug:
        raise HTTPException(status_code=400, detail="Product with this slug already exists")

    sku = product_data.sku or generate_sku(category.name, product_data.name)

    existing_sku = db.query(Product).filter(Product.sku == sku).first()
    if existing_sku:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")

    product = Product(
        category_id=product_data.category_id,
        name=product_data.name,
        slug=slug,
        description=product_data.description,
        short_description=product_data.short_description,
        price=product_data.price,
        discount_price=product_data.discount_price,
        sku=sku,
        quantity=product_data.quantity,
        is_featured=product_data.is_featured,
        is_active=product_data.is_active,
        meta_title=product_data.meta_title,
        meta_description=product_data.meta_description,
        meta_keywords=product_data.meta_keywords,
    )
    db.add(product)
    db.flush()

    for img_data in product_data.images:
        image = ProductImage(
            product_id=product.id,
            image_url=img_data.image_url,
            alt_text=img_data.alt_text,
            is_primary=img_data.is_primary,
            order=img_data.order,
        )
        db.add(image)

    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
def admin_update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_data.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(product, field, value)

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _delete_image_files(images):
    for img in images:
        try:
            fpath = img.image_url
            if fpath.startswith(("http://", "https://")):
                from urllib.parse import urlparse
                fpath = urlparse(fpath).path.lstrip("/")
            file_path = Path(fpath)
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass


@router.delete("/products/{product_id}")
def admin_delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    _delete_image_files(product.images)

    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}


@router.post("/products/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
def admin_upload_product_image(
    product_id: int,
    request: Request,
    file: UploadFile = File(...),
    is_primary: bool = Form(False),
    alt_text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    contents = file.file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR) / "products"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / unique_name
    with open(file_path, "wb") as f:
        f.write(contents)

    if is_primary:
        db.query(ProductImage).filter(
            ProductImage.product_id == product_id,
            ProductImage.is_primary == True,
        ).update({"is_primary": False})

    max_order = db.query(func.coalesce(func.max(ProductImage.order), -1)).filter(
        ProductImage.product_id == product_id
    ).scalar()

    image = ProductImage(
        product_id=product_id,
        image_url=f"{str(request.base_url).rstrip('/')}/{settings.UPLOAD_DIR}/products/{unique_name}",
        alt_text=alt_text,
        is_primary=is_primary,
        order=max_order + 1,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.put("/products/{product_id}/images/{image_id}/primary")
def admin_set_primary_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    db.query(ProductImage).filter(
        ProductImage.product_id == product_id,
        ProductImage.is_primary == True,
    ).update({"is_primary": False})

    image.is_primary = True
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/products/{product_id}/images/{image_id}")
def admin_delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    _delete_image_files([image])

    db.delete(image)
    db.commit()
    return {"message": "Image deleted successfully"}


@router.get("/categories", response_model=List[CategoryResponse])
def admin_get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    categories = (
        db.query(Category)
        .order_by(Category.name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return categories


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def admin_create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    slug = category_data.slug or generate_slug(category_data.name)

    existing_slug = db.query(Category).filter(Category.slug == slug).first()
    if existing_slug:
        raise HTTPException(status_code=400, detail="Category with this slug already exists")

    existing_name = db.query(Category).filter(Category.name == category_data.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    category = Category(
        name=category_data.name,
        slug=slug,
        description=category_data.description,
        image=category_data.image,
        parent_id=category_data.parent_id,
        is_active=category_data.is_active,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def admin_update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = category_data.dict(exclude_unset=True)

    if "name" in update_data and update_data["name"] != category.name:
        existing_name = db.query(Category).filter(
            Category.name == update_data["name"],
            Category.id != category_id,
        ).first()
        if existing_name:
            raise HTTPException(status_code=400, detail="Category with this name already exists")

    if "slug" in update_data:
        slug = update_data["slug"]
    elif "name" in update_data:
        slug = generate_slug(update_data["name"])
    else:
        slug = None

    if slug:
        existing_slug = db.query(Category).filter(
            Category.slug == slug,
            Category.id != category_id,
        ).first()
        if existing_slug:
            raise HTTPException(status_code=400, detail="Category with this slug already exists")
        update_data["slug"] = slug

    for field, value in update_data.items():
        setattr(category, field, value)

    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
def admin_delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    product_count = db.query(func.count(Product.id)).filter(
        Product.category_id == category_id
    ).scalar() or 0

    if product_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category. {product_count} product(s) are assigned to this category. Reassign or delete them first.",
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}


@router.get("/instagram-posts", response_model=List[InstagramPostResponse])
def admin_list_instagram_posts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    posts = (
        db.query(InstagramPost)
        .options(joinedload(InstagramPost.clicks))
        .order_by(InstagramPost.display_order)
        .all()
    )
    for p in posts:
        p.click_count = len(p.clicks) if p.clicks else 0
    return posts


@router.get("/instagram-posts/{post_id}", response_model=InstagramPostResponse)
def admin_get_instagram_post(
    post_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    post = (
        db.query(InstagramPost)
        .options(joinedload(InstagramPost.clicks))
        .filter(InstagramPost.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Instagram post not found")
    post.click_count = len(post.clicks) if post.clicks else 0
    return post


@router.post("/instagram-posts/reorder")
def admin_reorder_instagram_posts(
    data: List[dict],
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    for item in data:
        post_id = item.get("id")
        order = item.get("display_order")
        if post_id is not None and order is not None:
            db.query(InstagramPost).filter(InstagramPost.id == post_id).update(
                {"display_order": order}
            )
    db.commit()
    return {"message": "Reordered successfully"}


@router.post("/instagram-posts", response_model=InstagramPostResponse, status_code=status.HTTP_201_CREATED)
def admin_create_instagram_post(
    request: Request,
    post_url: str = Form(...),
    thumbnail_url: Optional[str] = Form(None),
    display_order: int = Form(0),
    is_active: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not thumbnail_url and not image:
        raise HTTPException(
            status_code=400,
            detail="Either Thumbnail URL or an uploaded image is required",
        )

    final_thumbnail = thumbnail_url

    if image:
        ext = Path(image.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
            )

        contents = image.file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
            )

        unique_name = f"{uuid.uuid4().hex}{ext}"
        upload_dir = Path(settings.UPLOAD_DIR) / "instagram"
        upload_dir.mkdir(parents=True, exist_ok=True)
        with open(upload_dir / unique_name, "wb") as f:
            f.write(contents)

        final_thumbnail = f"{str(request.base_url).rstrip('/')}/{settings.UPLOAD_DIR}/instagram/{unique_name}"

    post = InstagramPost(
        post_url=post_url,
        thumbnail_image=final_thumbnail,
        display_order=display_order,
        is_active=is_active,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/instagram-posts/{post_id}", response_model=InstagramPostResponse)
def admin_update_instagram_post(
    post_id: int,
    request: Request,
    post_url: Optional[str] = Form(None),
    thumbnail_url: Optional[str] = Form(None),
    display_order: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    post = db.query(InstagramPost).filter(InstagramPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Instagram post not found")

    if post_url is not None:
        post.post_url = post_url
    if display_order is not None:
        post.display_order = display_order
    if is_active is not None:
        post.is_active = is_active
    if thumbnail_url is not None:
        post.thumbnail_image = thumbnail_url if thumbnail_url else None

    if image:
        ext = Path(image.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
            )

        contents = image.file.read()
        if len(contents) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
            )

        unique_name = f"{uuid.uuid4().hex}{ext}"
        upload_dir = Path(settings.UPLOAD_DIR) / "instagram"
        upload_dir.mkdir(parents=True, exist_ok=True)
        with open(upload_dir / unique_name, "wb") as f:
            f.write(contents)

        post.thumbnail_image = f"{str(request.base_url).rstrip('/')}/{settings.UPLOAD_DIR}/instagram/{unique_name}"

    db.commit()
    db.refresh(post)
    return post


@router.delete("/instagram-posts/{post_id}")
def admin_delete_instagram_post(
    post_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    post = db.query(InstagramPost).filter(InstagramPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Instagram post not found")

    if post.thumbnail_image:
        try:
            fpath = post.thumbnail_image
            if fpath.startswith(("http://", "https://")):
                from urllib.parse import urlparse
                fpath = urlparse(fpath).path.lstrip("/")
            file_path = Path(fpath)
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass

    db.delete(post)
    db.commit()
    return {"message": "Instagram post deleted successfully"}
