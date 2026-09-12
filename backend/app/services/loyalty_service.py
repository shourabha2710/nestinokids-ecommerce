from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

from app.models.models import (
    LoyaltyAccount, LoyaltyTransaction, LoyaltyTierEnum, LoyaltyTransactionTypeEnum, User
)
from app.core.config import settings


class LoyaltyService:
    TIER_THRESHOLDS = [
        (settings.PLATINUM_THRESHOLD, LoyaltyTierEnum.PLATINUM),
        (settings.GOLD_THRESHOLD, LoyaltyTierEnum.GOLD),
        (settings.SILVER_THRESHOLD, LoyaltyTierEnum.SILVER),
        (settings.BRONZE_THRESHOLD, LoyaltyTierEnum.BRONZE),
    ]

    def _get_or_create_account(
        self, db: Session, user_id: int, for_update: bool = False
    ) -> LoyaltyAccount:
        query = db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id)
        if for_update:
            query = query.with_for_update()
        account = query.first()
        if not account:
            account = LoyaltyAccount(user_id=user_id, current_points=0, lifetime_earned=0, lifetime_redeemed=0, current_tier=LoyaltyTierEnum.BRONZE)
            db.add(account)
            db.flush()
        return account

    def _determine_tier(self, lifetime_earned: int) -> LoyaltyTierEnum:
        for threshold, tier in self.TIER_THRESHOLDS:
            if lifetime_earned >= threshold:
                return tier
        return LoyaltyTierEnum.BRONZE

    def _record_transaction(
        self, db: Session, account: LoyaltyAccount, tx_type: LoyaltyTransactionTypeEnum,
        points: int, balance_after: int, description: str = None,
        order_id: int = None, reference_type: str = None, reference_id: int = None,
        expires_at: datetime = None
    ) -> LoyaltyTransaction:
        tx = LoyaltyTransaction(
            loyalty_account_id=account.id,
            user_id=account.user_id,
            order_id=order_id,
            transaction_type=tx_type,
            points=points,
            balance_after=balance_after,
            description=description or "",
            reference_type=reference_type,
            reference_id=reference_id,
            expires_at=expires_at,
        )
        db.add(tx)
        return tx

    def earn_points(
        self, db: Session, user_id: int, order_amount: float, order_id: int,
        description: str = None, reference_type: str = "order"
    ) -> Tuple[int, int]:
        if not settings.LOYALTY_ENABLED:
            return 0, 0

        points = int(order_amount * settings.POINTS_PER_CURRENCY)
        if points <= 0:
            return 0, 0

        account = self._get_or_create_account(db, user_id)
        account.current_points += points
        account.lifetime_earned += points
        new_balance = account.current_points

        new_tier = self._determine_tier(account.lifetime_earned)
        tier_changed = new_tier != account.current_tier
        account.current_tier = new_tier

        expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.EARN, points, new_balance,
            description=description or f"Earned {points} points for order #{order_id}",
            order_id=order_id, reference_type=reference_type, reference_id=order_id,
            expires_at=expires_at
        )

        db.flush()
        return points, new_balance

    def quote_redemption(
        self, db: Session, user_id: int, points_to_redeem: int, order_amount: float
    ) -> Tuple[int, float]:
        """Pure, side-effect-free loyalty redemption quote.

        Returns the points/discount that WOULD be redeemed for an order of
        ``order_amount``. Never mutates the account, never creates a
        LoyaltyTransaction, never takes row locks, and never creates an
        account for a user who does not have one. Safe to call from the
        order-calculation and cart-preview paths; does not rely on
        transaction rollback for safety.

        Behavior: CLAMP CONSISTENTLY. The quoted amount is

            actual = min(points_to_redeem, available_points,
                         max_points_allowed_by_order)

        and that exact amount is what apply_redemption() later publishes, so
        the price quoted to the customer always matches the ledger.
        """
        if not settings.LOYALTY_ENABLED or points_to_redeem <= 0:
            return 0, 0.0

        account = db.query(LoyaltyAccount).filter(
            LoyaltyAccount.user_id == user_id
        ).first()
        if not account or account.current_points <= 0:
            return 0, 0.0

        available = account.current_points
        max_points = int(
            order_amount * settings.MAX_REDEMPTION_PERCENT / 100
            * settings.REDEMPTION_RATE
        )
        actual = min(points_to_redeem, available, max_points)
        if actual <= 0:
            return 0, 0.0

        return actual, actual * settings.REDEMPTION_RATE

    def apply_redemption(
        self, db: Session, user_id: int, order_id: int, quoted_points: int,
        order_amount: float
    ) -> Tuple[int, float]:
        """Apply an already-quoted redemption AFTER the Order row exists.

        Contract required by G2:
          - runs strictly after ``Order`` is flushed (db_order.id available);
          - takes a ``SELECT ... FOR UPDATE`` row lock on the loyalty account
            so the read-modify-write is safe under PostgreSQL concurrency
            (no-op on SQLite, documented);
          - re-checks the locked balance and refuses to apply anything if the
            quoted amount can no longer be backed (raises ValueError so the
            caller can abort the whole order transaction — never a silent
            partial mismatch, never a negative balance);
          - writes ONE REDEEM transaction linked to ``order_id`` (never NULL);
          - is idempotent per order: if a REDEEM already exists for the order
            it returns the already-applied value instead of deducting again.

        No commit: the order's owning transaction commits.
        """
        if not settings.LOYALTY_ENABLED or quoted_points <= 0:
            return 0, 0.0
        if order_id is None:
            raise ValueError("apply_redemption requires an order_id")

        existing = db.query(LoyaltyTransaction).filter(
            LoyaltyTransaction.order_id == order_id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REDEEM,
        ).first()
        if existing:
            return abs(existing.points), abs(existing.points) * settings.REDEMPTION_RATE

        account = self._get_or_create_account(db, user_id, for_update=True)
        available = account.current_points
        max_points = int(
            order_amount * settings.MAX_REDEMPTION_PERCENT / 100
            * settings.REDEMPTION_RATE
        )
        actual = min(quoted_points, available, max_points)
        if actual < quoted_points:
            raise ValueError(
                f"Insufficient loyalty points. Quoted: {quoted_points}, "
                f"Available: {available}"
            )
        if actual <= 0:
            return 0, 0.0

        discount = actual * settings.REDEMPTION_RATE
        account.current_points = available - actual
        account.lifetime_redeemed += actual
        new_balance = account.current_points

        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.REDEEM, -actual, new_balance,
            description=f"Redeemed {actual} points (₹{discount:.2f} discount)",
            order_id=order_id, reference_type="order", reference_id=order_id
        )

        db.flush()
        return actual, discount

    def refund_points(
        self, db: Session, user_id: int, order_id: int, points_to_refund: int
    ) -> Tuple[int, int]:
        account = self._get_or_create_account(db, user_id)

        account.current_points += points_to_refund
        account.lifetime_redeemed -= points_to_refund
        new_balance = account.current_points

        new_tier = self._determine_tier(account.lifetime_earned)
        account.current_tier = new_tier

        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.REFUND, points_to_refund, new_balance,
            description=f"Refunded {points_to_refund} points for order #{order_id}",
            order_id=order_id, reference_type="order", reference_id=order_id
        )

        db.flush()
        return points_to_refund, new_balance

    def refund_redeemed_points(
        self, db: Session, user_id: int, order_id: int
    ) -> Tuple[int, int]:
        """Restore redeemed points for a cancelled order, exactly once.

        Uses the existing REFUND ledger type (positive points) and reverses
        the redeem's balance + lifetime_redeemed effects. Idempotent:
        - no-op when the order has no REDEEM transaction (nothing to restore);
        - no-op when a REFUND reversal already exists for the order, so the
          hook can never restore points twice.

        No commit: the status-change transaction (state machine) commits.
        """
        if not settings.LOYALTY_ENABLED:
            return 0, 0

        redeem = db.query(LoyaltyTransaction).filter(
            LoyaltyTransaction.order_id == order_id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REDEEM,
        ).first()
        if not redeem:
            return 0, 0

        already = db.query(LoyaltyTransaction).filter(
            LoyaltyTransaction.order_id == order_id,
            LoyaltyTransaction.transaction_type == LoyaltyTransactionTypeEnum.REFUND,
        ).first()
        if already:
            return abs(already.points), already.balance_after

        points_to_refund = abs(redeem.points)
        account = self._get_or_create_account(db, user_id, for_update=True)
        account.current_points += points_to_refund
        account.lifetime_redeemed = max(0, account.lifetime_redeemed - points_to_refund)
        new_balance = account.current_points

        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.REFUND, points_to_refund, new_balance,
            description=f"Refunded {points_to_refund} redeemed points for order #{order_id}",
            order_id=order_id, reference_type="order", reference_id=order_id
        )

        db.flush()
        return points_to_refund, new_balance

    def admin_adjust(
        self, db: Session, user_id: int, points: int, reason: str, admin_id: int
    ) -> Tuple[int, int]:
        account = self._get_or_create_account(db, user_id)

        account.current_points += points
        if points > 0:
            account.lifetime_earned += abs(points)
        else:
            account.lifetime_redeemed += abs(points)

        new_balance = account.current_points

        new_tier = self._determine_tier(account.lifetime_earned)
        account.current_tier = new_tier

        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.ADJUSTMENT, points, new_balance,
            description=f"Admin adjustment by #{admin_id}: {reason}",
            reference_type="admin", reference_id=admin_id
        )

        db.flush()
        return points, new_balance

    def add_signup_bonus(self, db: Session, user_id: int) -> Tuple[int, int]:
        if not settings.LOYALTY_ENABLED:
            return 0, 0
        account = self._get_or_create_account(db, user_id)
        account.current_points += 25
        account.lifetime_earned += 25
        new_balance = account.current_points
        account.current_tier = self._determine_tier(account.lifetime_earned)
        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.EARN, 25, new_balance,
            description="Welcome! 25 signup bonus points credited.",
            reference_type="signup",
        )
        db.flush()
        return 25, new_balance

    def add_referral_bonus(self, db: Session, referrer_id: int) -> Tuple[int, int]:
        if not settings.LOYALTY_ENABLED:
            return 0, 0
        account = self._get_or_create_account(db, referrer_id)
        account.current_points += 50
        account.lifetime_earned += 50
        new_balance = account.current_points
        account.current_tier = self._determine_tier(account.lifetime_earned)
        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.REFERRAL_BONUS, 50, new_balance,
            description="Referral bonus: 50 points for referring a new user.",
            reference_type="referral",
        )
        db.flush()
        return 50, new_balance

    def get_account(self, db: Session, user_id: int) -> dict:
        account = self._get_or_create_account(db, user_id)
        return {
            "user_id": user_id,
            "current_points": account.current_points,
            "lifetime_earned": account.lifetime_earned,
            "lifetime_redeemed": account.lifetime_redeemed,
            "current_tier": account.current_tier.value if account.current_tier else "bronze",
            "tier_progress": self._get_tier_progress(account),
        }

    def _get_tier_progress(self, account: LoyaltyAccount) -> dict:
        current = account.lifetime_earned
        for i, (threshold, tier) in enumerate(self.TIER_THRESHOLDS):
            if current >= threshold:
                if i == 0:
                    return {"current_tier": tier.value, "next_tier": None, "current_points": current, "next_threshold": None, "progress_percent": 100}
                next_tier = self.TIER_THRESHOLDS[i - 1]
                return {
                    "current_tier": tier.value,
                    "next_tier": next_tier[1].value,
                    "current_points": current,
                    "next_threshold": next_tier[0],
                    "progress_percent": min(100, int((current - threshold) / (next_tier[0] - threshold) * 100))
                }
        lowest = self.TIER_THRESHOLDS[-1]
        next_up = self.TIER_THRESHOLDS[-2]
        return {
            "current_tier": lowest[1].value,
            "next_tier": next_up[1].value,
            "current_points": current,
            "next_threshold": next_up[0],
            "progress_percent": min(100, int(current / next_up[0] * 100))
        }

    def get_transactions(
        self, db: Session, user_id: int, skip: int = 0, limit: int = 20
    ) -> dict:
        account = db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id).first()
        if not account:
            return {"total": 0, "items": []}

        query = db.query(LoyaltyTransaction).filter(
            LoyaltyTransaction.loyalty_account_id == account.id
        ).order_by(LoyaltyTransaction.created_at.desc())

        total = query.count()
        items = query.offset(skip).limit(limit).all()

        return {
            "total": total,
            "items": [{
                "id": tx.id,
                "transaction_type": tx.transaction_type.value if tx.transaction_type else "earn",
                "points": tx.points,
                "balance_after": tx.balance_after,
                "description": tx.description,
                "order_id": tx.order_id,
                "reference_type": tx.reference_type,
                "reference_id": tx.reference_id,
                "expires_at": tx.expires_at.isoformat() if tx.expires_at else None,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
            } for tx in items]
        }

    def get_available_redeemable_points(self, db: Session, user_id: int, order_amount: float) -> dict:
        account = db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id).first()
        if not account:
            return {"available_points": 0, "max_redeemable_points": 0, "max_discount": 0}

        max_points = int(order_amount * settings.MAX_REDEMPTION_PERCENT / 100 * settings.REDEMPTION_RATE)
        actual_redeemable = min(account.current_points, max_points)

        return {
            "available_points": account.current_points,
            "max_redeemable_points": actual_redeemable,
            "max_discount": actual_redeemable * settings.REDEMPTION_RATE,
            "redemption_rate": settings.REDEMPTION_RATE,
            "max_redemption_percent": settings.MAX_REDEMPTION_PERCENT,
        }

    def get_all_accounts(self, db: Session, skip: int = 0, limit: int = 20, search: str = None, tier: str = None) -> dict:
        query = db.query(LoyaltyAccount).join(User)

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                )
            )
        if tier:
            try:
                tier_enum = LoyaltyTierEnum(tier)
                query = query.filter(LoyaltyAccount.current_tier == tier_enum)
            except ValueError:
                pass

        total = query.count()
        accounts = query.order_by(LoyaltyAccount.lifetime_earned.desc()).offset(skip).limit(limit).all()

        return {
            "total": total,
            "items": [{
                "user_id": a.user_id,
                "first_name": a.user.first_name if a.user else "",
                "last_name": a.user.last_name if a.user else "",
                "email": a.user.email if a.user else "",
                "current_points": a.current_points,
                "lifetime_earned": a.lifetime_earned,
                "lifetime_redeemed": a.lifetime_redeemed,
                "current_tier": a.current_tier.value if a.current_tier else "bronze",
            } for a in accounts]
        }

    def expire_points(self, db: Session, user_id: int) -> int:
        account = db.query(LoyaltyAccount).filter(LoyaltyAccount.user_id == user_id).first()
        if not account or account.current_points <= 0:
            return 0

        expired_points = account.current_points
        account.current_points = 0

        new_tier = self._determine_tier(account.lifetime_earned)
        account.current_tier = new_tier

        self._record_transaction(
            db, account, LoyaltyTransactionTypeEnum.EXPIRE, -expired_points, 0,
            description=f"Expired {expired_points} loyalty points"
        )

        db.flush()
        return expired_points


loyalty_service = LoyaltyService()
