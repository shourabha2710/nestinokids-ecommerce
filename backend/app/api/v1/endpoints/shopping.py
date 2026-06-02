from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.schemas import (
    AddressCreate, AddressResponse, OrderCreate, OrderResponse,
    CartItemResponse, WishlistItemResponse, CouponResponse
)
from app.models.models import (
    User, Address, Order, OrderItem, Product, ProductVariant,
    Coupon, Inventory, wishlist_association, cart_association
)
from app.api.v1.endpoints.auth import get_current_user
from app.utils.helpers import generate_order_number
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["shopping"])


# Address Endpoints
@router.get("/addresses", response_model=List[AddressResponse])
def get_user_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's addresses"""
    return current_user.addresses


@router.post("/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(
    address: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new address"""
    # If this is the first address, make it default
    if not current_user.addresses:
        address.is_default = True
    
    db_address = Address(**address.dict(), user_id=current_user.id)
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    return db_address


@router.put("/addresses/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: int,
    address: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update address"""
    db_address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()
    
    if not db_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    update_data = address.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_address, field, value)
    
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    return db_address


@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete address"""
    db_address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()
    
    if not db_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    db.delete(db_address)
    db.commit()
    return {"message": "Address deleted successfully"}


# Wishlist Endpoints
@router.get("/wishlist", response_model=List[WishlistItemResponse])
def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's wishlist"""
    return current_user.wishlist


@router.post("/wishlist/{product_id}")
def add_to_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add product to wishlist"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product not in current_user.wishlist:
        current_user.wishlist.append(product)
        db.add(current_user)
        db.commit()
    
    return {"message": "Product added to wishlist"}


@router.delete("/wishlist/{product_id}")
def remove_from_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove product from wishlist"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product in current_user.wishlist:
        current_user.wishlist.remove(product)
        db.add(current_user)
        db.commit()
    
    return {"message": "Product removed from wishlist"}


# Cart Endpoints
@router.get("/cart", response_model=List[CartItemResponse])
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's cart"""
    cart_items = []
    for product in current_user.cart_items:
        item = {
            "id": product.id,
            "name": product.name,
            "price": product.price,
            "quantity": 1,  # This should be stored properly
            "total": product.price,
            "images": product.images
        }
        cart_items.append(item)
    return cart_items


@router.post("/cart/{product_id}")
def add_to_cart(
    product_id: int,
    quantity: int = Query(1, ge=1),
    variant_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add product to cart"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product not in current_user.cart_items:
        current_user.cart_items.append(product)
        db.add(current_user)
        db.commit()
    
    return {"message": "Product added to cart"}


@router.delete("/cart/{product_id}")
def remove_from_cart(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove product from cart"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product in current_user.cart_items:
        current_user.cart_items.remove(product)
        db.add(current_user)
        db.commit()
    
    return {"message": "Product removed from cart"}


# Order Endpoints
@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new order"""
    # Verify addresses
    shipping_address = db.query(Address).filter(
        Address.id == order_data.shipping_address_id,
        Address.user_id == current_user.id
    ).first()
    
    if not shipping_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping address not found"
        )
    
    # Calculate totals
    total_amount = 0
    order_items_list = []
    
    for item_data in order_data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_data.product_id} not found"
            )
        
        item_total = product.price * item_data.quantity
        total_amount += item_total
        
        order_items_list.append({
            "product": product,
            "quantity": item_data.quantity,
            "price": product.price,
            "total": item_total,
            "variant_id": item_data.variant_id
        })
    
    # Apply coupon if provided
    discount_amount = 0
    coupon_id = None
    if order_data.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.code == order_data.coupon_code,
            Coupon.is_active == True
        ).first()
        
        if coupon:
            if coupon.discount_type == "percentage":
                discount_amount = (total_amount * coupon.discount_value) / 100
                if coupon.maximum_discount:
                    discount_amount = min(discount_amount, coupon.maximum_discount)
            else:
                discount_amount = coupon.discount_value
            
            coupon_id = coupon.id
            coupon.usage_count += 1
            db.add(coupon)
    
    # Calculate final amount
    tax_amount = (total_amount - discount_amount) * 0.05  # 5% tax
    final_amount = total_amount - discount_amount + tax_amount
    
    # Create order
    db_order = Order(
        user_id=current_user.id,
        order_number=generate_order_number(),
        total_amount=total_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        final_amount=final_amount,
        shipping_address_id=shipping_address.id,
        billing_address_id=order_data.billing_address_id,
        payment_method=order_data.payment_method,
        coupon_id=coupon_id
    )
    db.add(db_order)
    db.flush()
    
    # Create order items
    for item in order_items_list:
        order_item = OrderItem(
            order_id=db_order.id,
            product_id=item["product"].id,
            quantity=item["quantity"],
            price=item["price"],
            total=item["total"],
            variant_id=item["variant_id"]
        )
        db.add(order_item)
        
        # Update inventory
        inventory = db.query(Inventory).filter(
            Inventory.product_id == item["product"].id
        ).first()
        if inventory:
            inventory.reserved_quantity += item["quantity"]
            db.add(inventory)
    
    db.commit()
    db.refresh(db_order)
    return db_order


@router.get("/orders", response_model=List[OrderResponse])
def get_user_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's orders"""
    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).all()
    return orders


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific order"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return order


# Coupon Validation
@router.get("/coupons/{code}", response_model=CouponResponse)
def validate_coupon(
    code: str,
    total_amount: float = Query(..., gt=0),
    db: Session = Depends(get_db)
):
    """Validate coupon code"""
    coupon = db.query(Coupon).filter(
        Coupon.code == code,
        Coupon.is_active == True
    ).first()
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found or expired"
        )
    
    if coupon.maximum_discount and total_amount < coupon.minimum_order_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order value is {coupon.minimum_order_value}"
        )
    
    if coupon.max_usage and coupon.usage_count >= coupon.max_usage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon usage limit exceeded"
        )
    
    return coupon
