from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.schemas.schemas import (
    CategoryCreate, CategoryResponse, ProductCreate, ProductResponse,
    ProductUpdate, ProductImageResponse, ReviewCreate, ReviewResponse
)
from app.models.models import Category, Product, ProductImage, Review, User, Inventory, ProductVariant
from app.utils.helpers import generate_slug
from app.api.v1.endpoints.auth import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/api/v1", tags=["products"])


# Category Endpoints
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all categories"""
    categories = db.query(Category).filter(
        Category.is_active == True
    ).offset(skip).limit(limit).all()
    return categories


@router.get("/categories/{slug}", response_model=CategoryResponse)
def get_category(slug: str, db: Session = Depends(get_db)):
    """Get category by slug"""
    category = db.query(Category).filter(
        Category.slug == slug,
        Category.is_active == True
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


# Product Endpoints
@router.get("/products", response_model=List[ProductResponse])
def get_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    sort_by: str = Query("created_at", regex="^(price|rating|created_at)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all products with filtering and search"""
    query = db.query(Product).filter(Product.is_active == True)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.description.ilike(f"%{search}%"))
        )
    
    if featured is not None:
        query = query.filter(Product.is_featured == featured)
    
    # Sorting
    if sort_by == "price":
        query = query.order_by(Product.price)
    elif sort_by == "rating":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.created_at.desc())
    
    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/products/{slug}", response_model=ProductResponse)
def get_product(slug: str, db: Session = Depends(get_db)):
    """Get product by slug"""
    product = db.query(Product).filter(
        Product.slug == slug,
        Product.is_active == True
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.get("/products/{product_id}/reviews", response_model=List[ReviewResponse])
def get_product_reviews(
    product_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get reviews for a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    reviews = db.query(Review).filter(
        Review.product_id == product_id,
        Review.is_approved == True
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    return reviews


@router.post("/products/{product_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    product_id: int,
    review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a review for a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if user already reviewed
    existing_review = db.query(Review).filter(
        Review.product_id == product_id,
        Review.user_id == current_user.id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product"
        )
    
    db_review = Review(
        product_id=product_id,
        user_id=current_user.id,
        rating=review.rating,
        title=review.title,
        description=review.description,
        is_approved=True  # Auto-approve for now
    )
    db.add(db_review)
    
    # Update product rating
    all_reviews = db.query(Review).filter(Review.product_id == product_id).all()
    total_rating = sum([r.rating for r in all_reviews]) + review.rating
    avg_rating = total_rating / (len(all_reviews) + 1)
    product.rating = round(avg_rating, 1)
    product.review_count = len(all_reviews) + 1
    
    db.add(product)
    db.commit()
    db.refresh(db_review)
    
    return db_review


# Related Products
@router.get("/products/{product_id}/related", response_model=List[ProductResponse])
def get_related_products(
    product_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get related products in same category"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    related = db.query(Product).filter(
        Product.category_id == product.category_id,
        Product.id != product_id,
        Product.is_active == True
    ).limit(limit).all()
    
    return related


# Search Endpoint
@router.get("/search")
def search_products(
    q: str = Query(..., min_length=1),
    category_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search products by name and description"""
    query = db.query(Product).filter(Product.is_active == True)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    products = query.filter(
        (Product.name.ilike(f"%{q}%")) |
        (Product.description.ilike(f"%{q}%"))
    ).offset(skip).limit(limit).all()
    
    return {
        "query": q,
        "total": len(products),
        "results": products
    }
