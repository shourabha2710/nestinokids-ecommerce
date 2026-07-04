"""Business event → notification mapper.

Separated from NotificationService (CRUD) so that future realtime channels
(WebSocket, SSE, email, WhatsApp, push) can plug in at this layer without
touching the core CRUD or the endpoint files.
"""
import logging
from sqlalchemy.orm import Session
from app.models.models import User, RoleEnum, Notification
from app.schemas.schemas import NotificationType
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)


class NotificationEventService:

    # ── helpers ────────────────────────────────────────────────

    @staticmethod
    def _get_admin_users(db: Session) -> list[User]:
        return db.query(User).filter(User.role == RoleEnum.ADMIN).all()

    def _safe_create_notification(
        self,
        db: Session,
        user_id: int,
        title: str,
        message: str | None,
        type: str,
    ) -> None:
        """Wrap notification creation with failure isolation.

        If the underlying CRUD call fails (DB timeout, connection
        drop, deadlock, etc.) the exception is caught and logged so
        the caller's business transaction is never rolled back.
        """
        try:
            notification_service.create_notification(
                db=db,
                user_id=user_id,
                title=title,
                message=message,
                type=type,
            )
        except Exception:
            logger.exception(
                "Failed to create %s notification for user %s",
                type,
                user_id,
            )

    # ── NEW_ORDER ──────────────────────────────────────────────

    def notify_new_order(self, db: Session, order) -> None:
        """Send NEW_ORDER notification to all admins when a customer places an order."""
        admins = self._get_admin_users(db)
        if not admins:
            return
        for admin in admins:
            self._safe_create_notification(
                db=db,
                user_id=admin.id,
                title="New Order Received",
                message=f"Order #{order.order_number} placed for ₹{order.final_amount:.2f}",
                type=NotificationType.NEW_ORDER,
            )

    # ── LOW_STOCK ──────────────────────────────────────────────

    def notify_low_stock(self, db: Session, product, inventory) -> None:
        """Send LOW_STOCK alert to admins, skipping duplicates (unread + same product name)."""
        existing = (
            db.query(Notification)
            .filter(
                Notification.type == NotificationType.LOW_STOCK,
                Notification.is_read == False,
                Notification.message.contains(product.name),
            )
            .first()
        )
        if existing:
            return

        admins = self._get_admin_users(db)
        if not admins:
            return
        for admin in admins:
            self._safe_create_notification(
                db=db,
                user_id=admin.id,
                title="Low Stock Alert",
                message=f"{product.name} stock is running low ({inventory.available_quantity} left)",
                type=NotificationType.LOW_STOCK,
            )

    # ── SUPPORT_TICKET ─────────────────────────────────────────

    def notify_support_ticket(self, db: Session, ticket) -> None:
        """Send SUPPORT_TICKET notification to admins when a customer opens a ticket."""
        customer = db.query(User).filter(User.id == ticket.user_id).first()
        customer_name = (
            f"{customer.first_name} {customer.last_name}".strip()
            if customer
            else "A customer"
        )

        admins = self._get_admin_users(db)
        if not admins:
            return
        for admin in admins:
            self._safe_create_notification(
                db=db,
                user_id=admin.id,
                title="New Support Ticket",
                message=f"{customer_name} created a support request",
                type=NotificationType.SUPPORT_TICKET,
            )

    # ── ORDER_CANCELLED ────────────────────────────────────────

    def notify_order_cancelled(self, db: Session, order) -> None:
        """Send ORDER_CANCELLED notification to admins when an order is cancelled."""
        admins = self._get_admin_users(db)
        if not admins:
            return
        for admin in admins:
            self._safe_create_notification(
                db=db,
                user_id=admin.id,
                title="Order Cancelled",
                message=f"Order #{order.order_number} was cancelled",
                type=NotificationType.ORDER_CANCELLED,
            )


notification_event_service = NotificationEventService()
