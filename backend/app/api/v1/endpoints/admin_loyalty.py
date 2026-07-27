from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import LoyaltyAdjustRequest, LoyaltyAdminListResponse, LoyaltyAccountAdminResponse
from app.api.v1.endpoints.auth import require_admin
from app.services.loyalty_service import loyalty_service

router = APIRouter(prefix="/api/v1/admin/loyalty", tags=["admin-loyalty"])


@router.get("", response_model=LoyaltyAdminListResponse)
def list_loyalty_accounts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    tier: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return loyalty_service.get_all_accounts(db, skip=skip, limit=limit, search=search, tier=tier)


@router.get("/{user_id}")
def get_user_loyalty(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    account = loyalty_service.get_account(db, user_id)
    transactions = loyalty_service.get_transactions(db, user_id, skip=0, limit=50)

    return {**account, "transactions": transactions["items"]}


@router.post("/adjust")
def admin_adjust_points(
    data: LoyaltyAdjustRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    points, balance = loyalty_service.admin_adjust(
        db, data.user_id, data.points, data.reason, admin.id
    )
    db.commit()
    return {
        "message": f"{'+' if points >= 0 else ''}{points} points {'awarded' if points >= 0 else 'deducted'} for user {data.user_id}",
        "points_adjusted": points,
        "new_balance": balance,
    }


@router.post("/{user_id}/expire")
def expire_user_points(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    expired = loyalty_service.expire_points(db, user_id)
    db.commit()
    return {"message": f"Expired {expired} points for user {user_id}", "expired_points": expired}
