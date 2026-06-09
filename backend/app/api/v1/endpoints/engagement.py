from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from app.db.database import get_db
from app.schemas.schemas import (
    RecentlyViewedResponse,
    RecommendationResponse,
    LoyaltySummaryResponse,
    LoyaltyHistoryResponse,
    LoyaltyTransactionResponse,
    LoyaltyAdjustRequest,
    ReferralResponse,
    ReferralApplyRequest,
)
from app.models.models import (
    User, Product, RecentlyViewed, LoyaltyTransaction, Order, OrderItem,
    OrderStatusEnum, wishlist_association,
)
from app.api.v1.endpoints.auth import get_current_user, require_admin
from typing import Optional
import math

router = APIRouter(prefix="/api/v1", tags=["engagement"])


# ─── Recently Viewed ───

TRACKED_PRODUCTS_LIMIT = 20
RECENTLY_VIEWED_LIMIT = 12


@router.post("/products/{product_id}/view")
def track_product_view(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Track a product view for logged-in or guest users."""
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if current_user:
        user_id = current_user.id
        session_id = None
    else:
        user_id = None
        session_id = request.headers.get("X-Session-Id") or request.client.host if request.client else "anonymous"

    # Remove duplicate (same user/session + same product)
    if user_id:
        db.query(RecentlyViewed).filter(
            RecentlyViewed.user_id == user_id,
            RecentlyViewed.product_id == product_id,
        ).delete()
    elif session_id:
        db.query(RecentlyViewed).filter(
            RecentlyViewed.session_id == session_id,
            RecentlyViewed.product_id == product_id,
        ).delete()

    rv = RecentlyViewed(
        user_id=user_id,
        product_id=product_id,
        session_id=session_id,
    )
    db.add(rv)

    # Keep only latest N records
    if user_id:
        ids = db.query(RecentlyViewed.id).filter(
            RecentlyViewed.user_id == user_id
        ).order_by(RecentlyViewed.viewed_at.desc()).all()
        if len(ids) > TRACKED_PRODUCTS_LIMIT:
            delete_ids = [id_[0] for id_ in ids[TRACKED_PRODUCTS_LIMIT:]]
            db.query(RecentlyViewed).filter(RecentlyViewed.id.in_(delete_ids)).delete(synchronize_session=False)
    elif session_id:
        ids = db.query(RecentlyViewed.id).filter(
            RecentlyViewed.session_id == session_id
        ).order_by(RecentlyViewed.viewed_at.desc()).all()
        if len(ids) > TRACKED_PRODUCTS_LIMIT:
            delete_ids = [id_[0] for id_ in ids[TRACKED_PRODUCTS_LIMIT:]]
            db.query(RecentlyViewed).filter(RecentlyViewed.id.in_(delete_ids)).delete(synchronize_session=False)

    db.commit()
    return {"message": "View tracked"}


@router.get("/recently-viewed", response_model=list)
def get_recently_viewed(
    request: Request,
    limit: int = Query(RECENTLY_VIEWED_LIMIT, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get recently viewed products."""
    query = db.query(RecentlyViewed).options(joinedload(RecentlyViewed.product).joinedload(Product.images))

    if current_user:
        query = query.filter(RecentlyViewed.user_id == current_user.id)
    else:
        session_id = request.headers.get("X-Session-Id") or request.client.host if request.client else "anonymous"
        query = query.filter(RecentlyViewed.session_id == session_id)

    rows = query.order_by(RecentlyViewed.viewed_at.desc()).limit(limit).all()

    products = []
    seen_ids = set()
    for rv in rows:
        if rv.product and rv.product.id not in seen_ids:
            products.append(rv.product)
            seen_ids.add(rv.product.id)

    return products


# ─── Personalized Recommendations ───

def _get_recommendation_sources(user_id: int, db: Session) -> set:
    """Collect category IDs the user has interacted with."""
    category_ids = set()

    # Recently viewed categories
    recent = (
        db.query(Product.category_id)
        .join(RecentlyViewed, RecentlyViewed.product_id == Product.id)
        .filter(RecentlyViewed.user_id == user_id)
        .distinct()
        .all()
    )
    for (cid,) in recent:
        if cid:
            category_ids.add(cid)

    # Wishlist categories
    wishlisted = (
        db.query(Product.category_id)
        .select_from(wishlist_association)
        .join(Product, Product.id == wishlist_association.c.product_id)
        .filter(wishlist_association.c.user_id == user_id)
        .distinct()
        .all()
    )
    for (cid,) in wishlisted:
        if cid:
            category_ids.add(cid)

    # Purchased categories
    purchased = (
        db.query(Product.category_id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.user_id == user_id, Order.status == OrderStatusEnum.DELIVERED)
        .distinct()
        .all()
    )
    for (cid,) in purchased:
        if cid:
            category_ids.add(cid)

    return category_ids


@router.get("/recommendations", response_model=RecommendationResponse)
def get_recommendations(
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get personalized product recommendations for the logged-in user."""
    if not current_user:
        # Fallback: best sellers / new arrivals
        products = (
            db.query(Product)
            .options(joinedload(Product.images))
            .filter(Product.is_active == True)
            .order_by(Product.rating.desc(), Product.created_at.desc())
            .limit(limit)
            .all()
        )
        return RecommendationResponse(products=products, source="fallback")

    category_ids = _get_recommendation_sources(current_user.id, db)

    if category_ids:
        # Recommend from same categories, excluding already purchased
        purchased_ids = (
            db.query(OrderItem.product_id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.user_id == current_user.id, Order.status == OrderStatusEnum.DELIVERED)
            .subquery()
        )

        products = (
            db.query(Product)
            .options(joinedload(Product.images))
            .filter(
                Product.is_active == True,
                Product.category_id.in_(category_ids),
                Product.id.notin_(purchased_ids),
            )
            .order_by(Product.rating.desc(), Product.created_at.desc())
            .limit(limit)
            .all()
        )
        source = "personalized"
    else:
        products = []
        source = "personalized"

    # Fallback: fill remaining slots with best sellers or new arrivals
    if len(products) < limit:
        existing_ids = {p.id for p in products}
        fallback = (
            db.query(Product)
            .options(joinedload(Product.images))
            .filter(Product.is_active == True, Product.id.notin_(existing_ids))
            .order_by(Product.rating.desc(), Product.created_at.desc())
            .limit(limit - len(products))
            .all()
        )
        products.extend(fallback)
        source = "mixed" if products else "fallback"

    return RecommendationResponse(products=products, source=source)


# ─── Loyalty Points ───

def _get_loyalty_summary(user_id: int, db: Session) -> dict:
    """Calculate loyalty summary for a user."""
    earned = (
        db.query(func.coalesce(func.sum(LoyaltyTransaction.points), 0))
        .filter(
            LoyaltyTransaction.user_id == user_id,
            LoyaltyTransaction.transaction_type.in_(["earned", "signup_bonus", "referral_bonus", "admin_adjustment"]),
            LoyaltyTransaction.points > 0,
        )
        .scalar() or 0
    )
    redeemed = (
        db.query(func.coalesce(func.sum(LoyaltyTransaction.points), 0))
        .filter(
            LoyaltyTransaction.user_id == user_id,
            LoyaltyTransaction.transaction_type == "redeemed",
        )
        .scalar() or 0
    )
    current = earned - redeemed
    return {
        "current_points": max(0, current),
        "lifetime_earned": earned,
        "lifetime_redeemed": redeemed,
    }


@router.get("/loyalty", response_model=LoyaltySummaryResponse)
def get_loyalty_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current loyalty points summary."""
    return _get_loyalty_summary(current_user.id, db)


@router.get("/loyalty/history", response_model=LoyaltyHistoryResponse)
def get_loyalty_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get loyalty points history with summary."""
    summary = _get_loyalty_summary(current_user.id, db)
    transactions = (
        db.query(LoyaltyTransaction)
        .filter(LoyaltyTransaction.user_id == current_user.id)
        .order_by(LoyaltyTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return LoyaltyHistoryResponse(
        summary=LoyaltySummaryResponse(**summary),
        transactions=[LoyaltyTransactionResponse.from_orm(t) for t in transactions],
    )


@router.post("/admin/loyalty/adjust")
def admin_adjust_loyalty(
    data: LoyaltyAdjustRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin adjustment of user loyalty points."""
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tx = LoyaltyTransaction(
        user_id=data.user_id,
        points=data.points,
        transaction_type="admin_adjustment",
        description=data.description,
    )
    db.add(tx)
    db.commit()
    return {"message": f"{data.points} points adjusted for user {data.user_id}"}


# ─── Referral Program ───

@router.get("/referrals", response_model=ReferralResponse)
def get_referral_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's referral code and stats."""
    referred_count = db.query(func.count(User.id)).filter(
        User.referred_by == current_user.id
    ).scalar() or 0
    return ReferralResponse(
        referral_code=current_user.referral_code or "",
        referred_users_count=referred_count,
        referral_link=f"/register?ref={current_user.referral_code}" if current_user.referral_code else "",
    )


@router.post("/referrals/apply")
def apply_referral(
    data: ReferralApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply a referral code to the current user's account."""
    if current_user.referred_by:
        raise HTTPException(status_code=400, detail="You already have a referrer")

    referrer = db.query(User).filter(User.referral_code == data.code).first()
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if referrer.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot refer yourself")

    current_user.referred_by = referrer.id
    db.add(current_user)
    _award_signup_bonus(current_user.id, db)
    _award_referral_bonus(referrer.id, db)
    db.commit()

    return {"message": "Referral applied successfully"}


def _award_signup_bonus(user_id: int, db: Session):
    from app.models.models import LoyaltyTransaction
    tx = LoyaltyTransaction(
        user_id=user_id,
        points=25,
        transaction_type="signup_bonus",
        description="Welcome! 25 signup bonus points credited.",
    )
    db.add(tx)


def _award_referral_bonus(referrer_id: int, db: Session):
    from app.models.models import LoyaltyTransaction
    tx = LoyaltyTransaction(
        user_id=referrer_id,
        points=50,
        transaction_type="referral_bonus",
        description="Referral bonus: 50 points for referring a new user.",
    )
    db.add(tx)


# ─── Order-based Loyalty Earning ───

def award_loyalty_points_for_order(order_id: int, db: Session):
    """Award loyalty points based on order final amount. Called after order is delivered."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.status != OrderStatusEnum.DELIVERED:
        return

    # ₹100 spent = 1 point
    points = math.floor(order.final_amount / 100)

    # Check if already awarded for this order
    existing = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.order_id == order_id,
        LoyaltyTransaction.transaction_type == "earned",
    ).first()
    if existing:
        return

    if points > 0:
        tx = LoyaltyTransaction(
            user_id=order.user_id,
            points=points,
            transaction_type="earned",
            description=f"Points earned from order #{order.order_number}",
            order_id=order_id,
        )
        db.add(tx)
        db.commit()


# ─── Admin Referral Analytics ───

@router.get("/admin/referrals")
def get_admin_referral_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Admin analytics for referral program."""
    total_referrals = db.query(func.count(User.id)).filter(
        User.referred_by.isnot(None)
    ).scalar() or 0

    # Successful referrals = referred users with at least one delivered order
    successful = (
        db.query(func.count(func.distinct(Order.user_id)))
        .filter(
            Order.status == OrderStatusEnum.DELIVERED,
            Order.user_id.in_(
                db.query(User.id).filter(User.referred_by.isnot(None)).subquery()
            ),
        )
        .scalar() or 0
    )

    points_awarded = (
        db.query(func.coalesce(func.sum(LoyaltyTransaction.points), 0))
        .filter(LoyaltyTransaction.transaction_type == "referral_bonus")
        .scalar() or 0
    )

    return {
        "total_referrals": total_referrals,
        "successful_referrals": successful,
        "points_awarded": points_awarded,
    }
