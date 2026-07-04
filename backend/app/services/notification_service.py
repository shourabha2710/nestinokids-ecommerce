from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Notification
from app.schemas.schemas import NotificationType


class NotificationService:
    """Centralized service for admin notification operations.

    FUTURE REALTIME INTEGRATION POINTS (architecture only, not implemented):
        - WebSocket:   After create_notification(), publish to a per-user WS channel
        - SSE:         After create_notification(), push event to an SSE stream
        - Redis PubSub: Publish to ``notifications:{user_id}`` channel; consumers
                       forward to WS/SSE
        - Email:       Add an ``email_notification`` flag to Notification model;
                       call an email service inside create_notification()
        - WhatsApp:    Same pattern as email with a different provider
        - Push:        Store FCM/APNS tokens per user; send from
                       create_notification() or a background worker
    """

    NOTIFICATION_TYPE_MAP = {
        NotificationType.NEW_ORDER: "shopping-bag",
        NotificationType.LOW_STOCK: "alert-triangle",
        NotificationType.SUPPORT_TICKET: "message-square",
        NotificationType.ORDER_CANCELLED: "x-circle",
        NotificationType.PAYMENT_FAILED: "alert-circle",
        NotificationType.SYSTEM: "bell",
    }

    def get_notifications(
        self,
        db: Session,
        user_id: int,
        limit: int = 10,
        offset: int = 0,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int, int]:
        """Return (notifications, total_count, unread_count).

        Uses a single filtered query for notifications and lightweight
        scalar queries for counts — no N+1, no duplicated SQL.
        """
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        total = query.count()
        notifications = (
            query.order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        unread_count = self.get_unread_count(db, user_id)
        return notifications, total, unread_count

    def get_unread_count(self, db: Session, user_id: int) -> int:
        """Lightweight single scalar query — ideal for polling."""
        return (
            db.query(func.count(Notification.id))
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .scalar()
            or 0
        )

    def mark_as_read(self, db: Session, notification_id: int, user_id: int) -> Notification:
        """Mark a single notification as read. Raises ValueError if not found."""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        ).first()
        if not notification:
            raise ValueError("Notification not found")
        notification.is_read = True
        db.commit()
        db.refresh(notification)
        return notification

    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """Mark every unread notification as read. Returns count affected."""
        result = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False,
        ).update({"is_read": True})
        db.commit()
        return result

    def create_notification(
        self,
        db: Session,
        user_id: int,
        title: str,
        message: str | None = None,
        type: str = NotificationType.SYSTEM,
    ) -> Notification:
        """Create a notification and persist to the database.

        Future realtime integrations should hook in here:
            - Publish to Redis PubSub (notifications:{user_id})
            - Dispatch via WebSocket connection manager
            - Enqueue email/WhatsApp/push delivery
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    def delete_old_notifications(self, db: Session, days: int = 30) -> int:
        """Remove read notifications older than *days*. Returns count deleted."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = (
            db.query(Notification)
            .filter(
                Notification.created_at < cutoff,
                Notification.is_read == True,
            )
            .delete(synchronize_session=False)
        )
        db.commit()
        return result


notification_service = NotificationService()
