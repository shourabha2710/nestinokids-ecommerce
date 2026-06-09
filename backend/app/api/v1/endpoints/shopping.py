from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from app.db.database import get_db
from app.schemas.schemas import (
    AddressCreate, AddressResponse, OrderCreate, OrderResponse,
    CheckoutRequest, CartItemResponse, WishlistItemResponse, CouponResponse,
    OrderItemResponse
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


def _get_cart_items(db: Session, user_id: int):
    """Get cart items with quantities from association table"""
    rows = db.execute(
        select(cart_association).where(cart_association.c.user_id == user_id)
    ).all()
    cart_qty_map = {}
    for row in rows:
        cart_qty_map[row.product_id] = {
            "quantity": row.quantity,
            "variant_id": row.variant_id,
        }
    return cart_qty_map


# Cart Endpoints
@router.get("/cart", response_model=List[CartItemResponse])
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's cart with quantities"""
    cart_qty_map = _get_cart_items(db, current_user.id)
    cart_items = []
    for product in current_user.cart_items:
        cart_data = cart_qty_map.get(product.id, {"quantity": 1, "variant_id": None})
        qty = cart_data["quantity"]
        price = product.discount_price or product.price
        cart_items.append({
            "id": product.id,
            "name": product.name,
            "price": price,
            "quantity": qty,
            "total": price * qty,
            "images": product.images,
        })
    return cart_items


@router.post("/cart/{product_id}")
def add_to_cart(
    product_id: int,
    quantity: int = Query(1, ge=1),
    variant_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add product to cart or update quantity"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    existing = db.execute(
        select(cart_association).where(
            cart_association.c.user_id == current_user.id,
            cart_association.c.product_id == product_id,
        )
    ).first()

    if existing:
        stmt = (
            update(cart_association)
            .where(
                cart_association.c.user_id == current_user.id,
                cart_association.c.product_id == product_id,
            )
            .values(quantity=existing.quantity + quantity, variant_id=variant_id or existing.variant_id)
        )
        db.execute(stmt)
    else:
        stmt = insert(cart_association).values(
            user_id=current_user.id,
            product_id=product_id,
            quantity=quantity,
            variant_id=variant_id,
        )
        db.execute(stmt)

    db.commit()
    return {"message": "Product added to cart", "quantity": existing.quantity + quantity if existing else quantity}


@router.put("/cart/{product_id}")
def update_cart_item(
    product_id: int,
    quantity: int = Query(..., ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update cart item quantity (0 to remove)"""
    existing = db.execute(
        select(cart_association).where(
            cart_association.c.user_id == current_user.id,
            cart_association.c.product_id == product_id,
        )
    ).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Item not in cart")

    if quantity == 0:
        stmt = delete(cart_association).where(
            cart_association.c.user_id == current_user.id,
            cart_association.c.product_id == product_id,
        )
        db.execute(stmt)
    else:
        stmt = (
            update(cart_association)
            .where(
                cart_association.c.user_id == current_user.id,
                cart_association.c.product_id == product_id,
            )
            .values(quantity=quantity)
        )
        db.execute(stmt)

    db.commit()
    return {"message": "Cart updated"}


@router.delete("/cart/{product_id}")
def remove_from_cart(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove product from cart"""
    stmt = delete(cart_association).where(
        cart_association.c.user_id == current_user.id,
        cart_association.c.product_id == product_id,
    )
    result = db.execute(stmt)
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not in cart")

    return {"message": "Product removed from cart"}


def _build_order_response(order: Order) -> dict:
    """Build order response dict with product names in items"""
    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status.value if hasattr(order.status, 'value') else order.status,
        "total_amount": order.total_amount,
        "discount_amount": order.discount_amount,
        "tax_amount": order.tax_amount,
        "shipping_amount": order.shipping_amount,
        "final_amount": order.final_amount,
        "payment_status": order.payment_status.value if hasattr(order.payment_status, 'value') else order.payment_status,
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


# Order Endpoints
@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new order from items list"""
    shipping_address = db.query(Address).filter(
        Address.id == order_data.shipping_address_id,
        Address.user_id == current_user.id
    ).first()

    if not shipping_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping address not found"
        )

    total_amount = 0
    order_items_list = []

    for item_data in order_data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_data.product_id} not found"
            )

        price = product.discount_price or product.price
        item_total = price * item_data.quantity
        total_amount += item_total

        # Validate inventory
        inventory = db.query(Inventory).filter(
            Inventory.product_id == item_data.product_id
        ).first()
        if inventory and inventory.available_quantity < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name}. Available: {inventory.available_quantity}, Requested: {item_data.quantity}",
            )

        order_items_list.append({
            "product": product,
            "quantity": item_data.quantity,
            "price": price,
            "total": item_total,
            "variant_id": item_data.variant_id
        })

    # Apply coupon
    discount_amount = 0
    coupon_id = None
    if order_data.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.code == order_data.coupon_code,
            Coupon.is_active == True
        ).first()

        if coupon:
            if total_amount < coupon.minimum_order_value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Minimum order value is {coupon.minimum_order_value}"
                )
            if coupon.max_usage and coupon.usage_count >= coupon.max_usage:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Coupon usage limit exceeded"
                )
            if coupon.discount_type == "percentage":
                discount_amount = (total_amount * coupon.discount_value) / 100
                if coupon.maximum_discount:
                    discount_amount = min(discount_amount, coupon.maximum_discount)
            else:
                discount_amount = coupon.discount_value

            coupon_id = coupon.id
            coupon.usage_count += 1
            db.add(coupon)

    shipping_amount = 0 if total_amount >= 500 else 50
    taxable = total_amount - discount_amount
    tax_amount = taxable * 0.05
    final_amount = taxable + tax_amount + shipping_amount

    db_order = Order(
        user_id=current_user.id,
        order_number=generate_order_number(),
        total_amount=total_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        shipping_amount=shipping_amount,
        final_amount=final_amount,
        shipping_address_id=shipping_address.id,
        billing_address_id=order_data.billing_address_id or shipping_address.id,
        payment_method=order_data.payment_method or "cod",
        coupon_id=coupon_id,
    )
    db.add(db_order)
    db.flush()

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

        inventory = db.query(Inventory).filter(
            Inventory.product_id == item["product"].id
        ).first()
        if inventory:
            inventory.available_quantity -= item["quantity"]
            inventory.reserved_quantity += item["quantity"]
            db.add(inventory)

    # Create initial tracking event
    from app.models.models import OrderTrackingEvent
    tracking = OrderTrackingEvent(
        order_id=db_order.id,
        status="Order Placed",
        note="Order has been placed successfully.",
    )
    db.add(tracking)

    # Clear cart items associated with this order
    for item in order_items_list:
        stmt = delete(cart_association).where(
            cart_association.c.user_id == current_user.id,
            cart_association.c.product_id == item["product"].id,
        )
        db.execute(stmt)

    db.commit()
    db.refresh(db_order)
    return _build_order_response(db_order)


@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Checkout: create order from cart items"""
    shipping_address = db.query(Address).filter(
        Address.id == data.shipping_address_id,
        Address.user_id == current_user.id
    ).first()

    if not shipping_address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipping address not found"
        )

    cart_qty_map = _get_cart_items(db, current_user.id)
    if not cart_qty_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty"
        )

    total_amount = 0
    order_items_list = []

    for product_id, cart_data in cart_qty_map.items():
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )

        qty = cart_data["quantity"]
        variant_id = cart_data["variant_id"]
        price = product.discount_price or product.price
        item_total = price * qty
        total_amount += item_total

        inventory = db.query(Inventory).filter(
            Inventory.product_id == product_id
        ).first()
        if inventory and inventory.available_quantity < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name}. Available: {inventory.available_quantity}, Requested: {qty}",
            )

        order_items_list.append({
            "product": product,
            "quantity": qty,
            "price": price,
            "total": item_total,
            "variant_id": variant_id,
        })

    # Apply coupon
    discount_amount = 0
    coupon_id = None
    if data.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.code == data.coupon_code,
            Coupon.is_active == True
        ).first()

        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found or expired")
        if total_amount < coupon.minimum_order_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum order value is {coupon.minimum_order_value}"
            )
        if coupon.max_usage and coupon.usage_count >= coupon.max_usage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coupon usage limit exceeded"
            )
        if coupon.discount_type == "percentage":
            discount_amount = (total_amount * coupon.discount_value) / 100
            if coupon.maximum_discount:
                discount_amount = min(discount_amount, coupon.maximum_discount)
        else:
            discount_amount = coupon.discount_value

        coupon_id = coupon.id
        coupon.usage_count += 1
        db.add(coupon)

    shipping_amount = 0 if total_amount >= 500 else 50
    taxable = total_amount - discount_amount
    tax_amount = taxable * 0.05
    final_amount = taxable + tax_amount + shipping_amount

    db_order = Order(
        user_id=current_user.id,
        order_number=generate_order_number(),
        total_amount=total_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        shipping_amount=shipping_amount,
        final_amount=final_amount,
        shipping_address_id=shipping_address.id,
        billing_address_id=data.billing_address_id or shipping_address.id,
        payment_method="cod",
        coupon_id=coupon_id,
    )
    db.add(db_order)
    db.flush()

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

        inventory = db.query(Inventory).filter(
            Inventory.product_id == item["product"].id
        ).first()
        if inventory:
            inventory.available_quantity -= item["quantity"]
            inventory.reserved_quantity += item["quantity"]
            db.add(inventory)

    # Create initial tracking event
    from app.models.models import OrderTrackingEvent
    tracking = OrderTrackingEvent(
        order_id=db_order.id,
        status="Order Placed",
        note="Order has been placed successfully.",
    )
    db.add(tracking)

    # Clear entire cart
    stmt = delete(cart_association).where(
        cart_association.c.user_id == current_user.id
    )
    db.execute(stmt)

    db.commit()
    db.refresh(db_order)
    return _build_order_response(db_order)


@router.get("/orders", response_model=List[OrderResponse])
def get_user_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's orders"""
    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).all()
    return [_build_order_response(o) for o in orders]


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
    return _build_order_response(order)


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

    if total_amount < coupon.minimum_order_value:
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
