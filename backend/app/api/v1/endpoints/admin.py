import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.schemas.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductCreate,
    ProductImageResponse,
    ProductResponse,
    ProductUpdate,
)
from app.models.models import Product, Category, Order, User, ProductImage
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


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return DashboardResponse(
        total_products=db.query(func.count(Product.id)).scalar() or 0,
        total_categories=db.query(func.count(Category.id)).scalar() or 0,
        total_orders=db.query(func.count(Order.id)).scalar() or 0,
        total_users=db.query(func.count(User.id)).scalar() or 0,
    )


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
