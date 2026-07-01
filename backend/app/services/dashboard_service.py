import datetime
from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from app.models.models import (
    Product, Category, Order, User, Inventory, ProductVariant,
    LoyaltyTransaction, SupportTicket, Notification,
    OrderStatusEnum, wishlist_association,
)


class DashboardSummaryModel(BaseModel):
    """Internal Pydantic model for the full dashboard summary.

    Used only within the service layer. The API endpoint converts this
    to the public ``DashboardResponse`` schema for external serialization,
    keeping internal representation decoupled from the HTTP contract.
    """
    total_products: int = 0
    active_products: int = 0
    total_categories: int = 0
    total_orders: int = 0
    pending_orders: int = 0
    delivered_orders: int = 0
    cancelled_orders: int = 0
    total_users: int = 0
    total_inventory_items: int = 0
    inventory_value: float = 0.0
    low_stock_products: int = 0
    out_of_stock_products: int = 0
    total_revenue: float = 0.0
    total_loyalty_points_issued: int = 0
    total_loyalty_points_redeemed: int = 0
    total_referrals: int = 0
    repeat_customer_rate: float = 0.0
    most_wishlisted_products: list = []
    open_tickets: int = 0
    resolved_tickets: int = 0
    total_notifications_sent: int = 0


class DashboardService:
    """Service class for admin dashboard analytics.

    Provides domain-partitioned access to KPIs.
    Only :meth:`get_summary` is fully implemented in Phase 12.1;
    remaining methods are stubs reserved for future dashboard phases.
    """

    def get_summary(self, db: Session) -> DashboardSummaryModel:
        """Aggregate every dashboard KPI into a single summary object.

        Computes 21 metrics spanning products, inventory, orders, revenue,
        loyalty, referrals, customer retention, support tickets, and
        notifications in a single pass.
        """
        total_products = db.query(func.count(Product.id)).scalar() or 0
        active_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
        total_categories = db.query(func.count(Category.id)).scalar() or 0
        total_orders = db.query(func.count(Order.id)).scalar() or 0
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_inventory_items = db.query(func.count(Inventory.id)).scalar() or 0

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

        inventory_value = (
            db.query(func.coalesce(func.sum(Product.price * Inventory.available_quantity), 0))
            .join(Inventory, Product.id == Inventory.product_id)
            .scalar() or 0.0
        )

        total_revenue = (
            db.query(func.coalesce(func.sum(Order.final_amount), 0))
            .filter(Order.status == OrderStatusEnum.DELIVERED)
            .scalar()
        )

        pending_orders = (
            db.query(func.count(Order.id))
            .filter(Order.status == OrderStatusEnum.PENDING)
            .scalar() or 0
        )
        delivered_orders = (
            db.query(func.count(Order.id))
            .filter(Order.status == OrderStatusEnum.DELIVERED)
            .scalar() or 0
        )
        cancelled_orders = (
            db.query(func.count(Order.id))
            .filter(Order.status == OrderStatusEnum.CANCELLED)
            .scalar() or 0
        )

        # Loyalty analytics
        total_loyalty_points_issued = (
            db.query(func.coalesce(func.sum(LoyaltyTransaction.points), 0))
            .filter(
                LoyaltyTransaction.transaction_type.in_(
                    ["earned", "signup_bonus", "referral_bonus", "admin_adjustment"]
                ),
                LoyaltyTransaction.points > 0,
            )
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
        repeat_customers_subq = (
            db.query(Order.user_id)
            .filter(Order.status == OrderStatusEnum.DELIVERED)
            .group_by(Order.user_id)
            .having(func.count(Order.id) > 1)
            .subquery()
        )
        repeat_count = db.query(func.count()).select_from(repeat_customers_subq).scalar() or 0
        repeat_customer_rate = (
            round((repeat_count / total_users_with_orders * 100), 1)
            if total_users_with_orders > 0
            else 0.0
        )

        # Most wishlisted products
        most_wishlisted_rows = (
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
        for product_id, count in most_wishlisted_rows:
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                most_wishlisted_products.append({
                    "id": product.id,
                    "name": product.name,
                    "wishlist_count": count,
                })

        # Support ticket stats
        open_tickets = (
            db.query(func.count(SupportTicket.id))
            .filter(SupportTicket.status.in_(["Open", "In Progress"]))
            .scalar() or 0
        )
        resolved_tickets = (
            db.query(func.count(SupportTicket.id))
            .filter(SupportTicket.status == "Resolved")
            .scalar() or 0
        )

        # Notification stats
        total_notifications_sent = (
            db.query(func.count(Notification.id)).scalar() or 0
        )

        return DashboardSummaryModel(
            total_products=total_products,
            active_products=active_products,
            total_categories=total_categories,
            total_orders=total_orders,
            pending_orders=pending_orders,
            delivered_orders=delivered_orders,
            cancelled_orders=cancelled_orders,
            total_users=total_users,
            total_inventory_items=total_inventory_items,
            inventory_value=inventory_value,
            low_stock_products=low_stock,
            out_of_stock_products=out_of_stock,
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

    # ── Date-range helpers ───────────────────────────────────────────

    def _parse_date_range(self, range_str: str = "30d") -> datetime.datetime:
        """Calculate the cutoff datetime for a given range string.

        Supported values:
            ``7d``  — last 7 days
            ``30d`` — last 30 days (default)
            ``90d`` — last 90 days
            ``12m`` — last 12 months (365 days)

        Returns a UTC datetime to use in ``created_at >= cutoff`` filters.
        """
        now = datetime.datetime.utcnow()
        mapping = {"7d": 7, "30d": 30, "90d": 90, "12m": 365}
        days = mapping.get(range_str, 30)
        return now - timedelta(days=days)

    # ── Phase 12.2B Chart methods ────────────────────────────────────

    def get_revenue_trend(self, db: Session, range: str = "30d") -> list[dict]:
        """Monthly revenue trend for delivered orders within *range*.

        Returns a list of ``{"date": "2024-01", "revenue": 1234.56}``
        dicts ordered chronologically.
        """
        cutoff = self._parse_date_range(range)
        rows = (
            db.query(
                func.date_trunc("month", Order.created_at).label("month"),
                func.coalesce(func.sum(Order.final_amount), 0).label("revenue"),
            )
            .filter(Order.status == OrderStatusEnum.DELIVERED)
            .filter(Order.created_at >= cutoff)
            .group_by(func.date_trunc("month", Order.created_at))
            .order_by(func.date_trunc("month", Order.created_at))
            .all()
        )
        return [
            {"date": row.month.strftime("%Y-%m"), "revenue": float(row.revenue)}
            for row in rows
        ]

    def get_orders_trend(self, db: Session, range: str = "30d") -> list[dict]:
        """Monthly order volume trend within *range*.

        Returns a list of ``{"date": "2024-01", "orders": 42}`` dicts
        ordered chronologically.
        """
        cutoff = self._parse_date_range(range)
        rows = (
            db.query(
                func.date_trunc("month", Order.created_at).label("month"),
                func.count(Order.id).label("orders"),
            )
            .filter(Order.created_at >= cutoff)
            .group_by(func.date_trunc("month", Order.created_at))
            .order_by(func.date_trunc("month", Order.created_at))
            .all()
        )
        return [
            {"date": row.month.strftime("%Y-%m"), "orders": row.orders}
            for row in rows
        ]

    def get_order_status_distribution(self, db: Session, range: str = "30d") -> list[dict]:
        """Order count grouped by status within *range*.

        Returns a list of ``{"status": "pending", "count": 10}`` dicts
        sorted by count descending (most frequent first).
        """
        cutoff = self._parse_date_range(range)
        rows = (
            db.query(
                Order.status,
                func.count(Order.id).label("count"),
            )
            .filter(Order.created_at >= cutoff)
            .group_by(Order.status)
            .order_by(desc("count"))
            .all()
        )
        return [
            {"status": row.status.value if hasattr(row.status, "value") else str(row.status), "count": row.count}
            for row in rows
        ]

    # ── Future-phase stubs ────────────────────────────────────────────

    def get_revenue(self, db: Session):
        """TODO (Phase 13+): Revenue trends, daily / monthly / yearly breakdown.

        Planned output: time-series revenue data grouped by day, month,
        or year so the frontend can render revenue-over-time charts.
        """
        raise NotImplementedError

    def get_orders(self, db: Session):
        """TODO (Phase 13+): Order status distribution and timeline.

        Planned output: counts per status over time, average fulfillment
        time, and order volume trends.
        """
        raise NotImplementedError

    def get_inventory(self, db: Session):
        """TODO (Phase 14): Low-stock alerts and category stock breakdown.

        Planned output: list of low-stock items, stock value per category,
        and restock recommendations.
        """
        raise NotImplementedError

    def get_support(self, db: Session):
        """TODO (Phase 15): Ticket trends and resolution SLA metrics.

        Planned output: open/closed rates over time, average resolution
        time, and backlog heatmap.
        """
        raise NotImplementedError

    def get_customers(self, db: Session):
        """TODO (Phase 15): Acquisition channels and cohort analysis.

        Planned output: sign-ups by source, repeat-purchase rates by
        cohort, and lifetime value grouping.
        """
        raise NotImplementedError

    # ── Future cache support (Redis) ─────────────────────────────────

    def _get_cached_data(self, cache_key: str):
        """Retrieve cached dashboard data.

        Placeholder for future Redis ``get`` integration.

        Cache-key strategy (for future use)::

            "dashboard:{method_name}:{range}:{args_hash}"

        Example::

            "dashboard:get_revenue_trend:30d:"

        Recommended TTL: **5 minutes** (300 seconds) — short enough
        to keep dashboard data reasonably fresh while absorbing
        repeated page loads from multiple admin users.

        :param cache_key: String key to look up in Redis.
        :returns: Cached value or ``None``.
        """
        return None

    def _set_cached_data(self, cache_key: str, data, ttl: int = 300):
        """Store dashboard data in cache.

        Placeholder for future Redis ``setex`` integration.

        :param cache_key: String key under which to store *data*.
        :param data: Serialisable value to cache.
        :param ttl: Time-to-live in seconds (default 300 / 5 min).
        """
        pass


dashboard_service = DashboardService()
