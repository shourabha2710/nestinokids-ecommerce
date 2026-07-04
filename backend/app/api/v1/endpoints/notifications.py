from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.schemas.schemas import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    NotificationType,
)
from app.models.models import User
from app.api.v1.endpoints.auth import require_admin
from app.services.notification_service import notification_service

VALID_TYPES = {
    NotificationType.NEW_ORDER,
    NotificationType.LOW_STOCK,
    NotificationType.SUPPORT_TICKET,
    NotificationType.ORDER_CANCELLED,
    NotificationType.PAYMENT_FAILED,
    NotificationType.SYSTEM,
}

router = APIRouter(tags=["notifications"])


@router.get(
    "/api/v1/admin/notifications",
    response_model=NotificationListResponse,
)
def get_notifications(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    type: Optional[list[str]] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Paginated list of notifications for the current admin.

    Use ``unread_only=true`` to filter only unread items.
    Use ``type=NEW_ORDER&type=LOW_STOCK`` to filter by one or more types.
    """
    if type:
        invalid = [t for t in type if t not in VALID_TYPES]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid notification type(s): {', '.join(invalid)}. "
                       f"Valid types: {', '.join(sorted(VALID_TYPES))}",
            )

    notifications, total, unread_count = notification_service.get_notifications(
        db=db,
        user_id=admin.id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
        type=type,
    )
    return NotificationListResponse(
        notifications=notifications,
        total=total,
        unread_count=unread_count,
    )


@router.get(
    "/api/v1/admin/notifications/unread-count",
    response_model=UnreadCountResponse,
)
def get_unread_count(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Lightweight endpoint — returns only the unread notification count."""
    count = notification_service.get_unread_count(db=db, user_id=admin.id)
    return UnreadCountResponse(count=count)


@router.patch(
    "/api/v1/admin/notifications/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    try:
        notification = notification_service.mark_as_read(
            db=db,
            notification_id=notification_id,
            user_id=admin.id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return notification


@router.patch("/api/v1/admin/notifications/read-all")
def mark_all_notifications_read(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Mark every unread notification as read for the current admin."""
    affected = notification_service.mark_all_as_read(db=db, user_id=admin.id)
    return {
        "message": f"{affected} notification(s) marked as read",
        "affected": affected,
    }
