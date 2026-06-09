from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.db.database import get_db
from app.schemas.schemas import (
    OrderTrackingEventResponse,
    OrderTrackingCreate,
    SupportTicketCreate,
    SupportTicketUpdate,
    SupportTicketResponse,
    SupportTicketAdminResponse,
    FAQCreate,
    FAQUpdate,
    FAQResponse,
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    NotificationCreate,
    NotificationResponse,
    UnreadCountResponse,
)
from app.models.models import (
    User, Order, OrderTrackingEvent, SupportTicket, FAQ, AnnouncementBar, Notification,
)
from app.api.v1.endpoints.auth import get_current_user, require_admin
from typing import List, Optional
from datetime import datetime

router = APIRouter(tags=["support"])


# ─── Order Tracking ───

@router.get("/api/v1/orders/{order_id}/tracking", response_model=List[OrderTrackingEventResponse])
def get_order_tracking(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    events = db.query(OrderTrackingEvent).filter(
        OrderTrackingEvent.order_id == order_id
    ).order_by(OrderTrackingEvent.created_at.asc()).all()
    return events


@router.post("/api/v1/admin/orders/{order_id}/tracking", response_model=OrderTrackingEventResponse)
def admin_add_tracking_event(
    order_id: int,
    data: OrderTrackingCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    event = OrderTrackingEvent(
        order_id=order_id,
        status=data.status,
        note=data.note,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# ─── Support Tickets ───

@router.get("/api/v1/support/tickets", response_model=List[SupportTicketResponse])
def get_user_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tickets = db.query(SupportTicket).filter(
        SupportTicket.user_id == current_user.id
    ).order_by(SupportTicket.created_at.desc()).all()
    return tickets


@router.post("/api/v1/support/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    data: SupportTicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = SupportTicket(
        user_id=current_user.id,
        subject=data.subject,
        message=data.message,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/api/v1/support/tickets/{ticket_id}", response_model=SupportTicketResponse)
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.get("/api/v1/admin/support/tickets", response_model=List[SupportTicketAdminResponse])
def admin_get_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(SupportTicket, User).join(User, SupportTicket.user_id == User.id)
    if status:
        query = query.filter(SupportTicket.status == status)
    if priority:
        query = query.filter(SupportTicket.priority == priority)
    results = query.order_by(SupportTicket.created_at.desc()).all()
    return [
        SupportTicketAdminResponse(
            id=ticket.id,
            user_id=ticket.user_id,
            subject=ticket.subject,
            message=ticket.message,
            status=ticket.status,
            priority=ticket.priority,
            created_at=ticket.created_at,
            user_name=f"{user.first_name} {user.last_name}",
            user_email=user.email,
        )
        for ticket, user in results
    ]


@router.put("/api/v1/admin/support/tickets/{ticket_id}", response_model=SupportTicketAdminResponse)
def admin_update_ticket(
    ticket_id: int,
    data: SupportTicketUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if data.status is not None:
        ticket.status = data.status
    if data.priority is not None:
        ticket.priority = data.priority
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    user = db.query(User).filter(User.id == ticket.user_id).first()
    return SupportTicketAdminResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        subject=ticket.subject,
        message=ticket.message,
        status=ticket.status,
        priority=ticket.priority,
        created_at=ticket.created_at,
        user_name=f"{user.first_name} {user.last_name}",
        user_email=user.email,
    )


@router.delete("/api/v1/admin/support/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()


# ─── FAQ ───

@router.get("/api/v1/faqs", response_model=List[FAQResponse])
def get_active_faqs(
    db: Session = Depends(get_db),
):
    faqs = db.query(FAQ).filter(
        FAQ.is_active == True,
    ).order_by(FAQ.category, FAQ.display_order).all()
    return faqs


@router.get("/api/v1/admin/faqs", response_model=List[FAQResponse])
def admin_get_faqs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    faqs = db.query(FAQ).order_by(FAQ.category, FAQ.display_order).all()
    return faqs


@router.post("/api/v1/admin/faqs", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
def admin_create_faq(
    data: FAQCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    faq = FAQ(**data.dict())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.put("/api/v1/admin/faqs/{faq_id}", response_model=FAQResponse)
def admin_update_faq(
    faq_id: int,
    data: FAQUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(faq, key, value)
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.delete("/api/v1/admin/faqs/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(faq)
    db.commit()


# ─── Announcement Bar ───

@router.get("/api/v1/announcements", response_model=List[AnnouncementResponse])
def get_active_announcements(
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    announcements = db.query(AnnouncementBar).filter(
        AnnouncementBar.is_active == True,
        (
            (AnnouncementBar.start_date.is_(None)) | (AnnouncementBar.start_date <= now),
        ),
        (
            (AnnouncementBar.end_date.is_(None)) | (AnnouncementBar.end_date >= now),
        ),
    ).order_by(AnnouncementBar.created_at.desc()).all()
    return announcements


@router.get("/api/v1/admin/announcements", response_model=List[AnnouncementResponse])
def admin_get_announcements(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    announcements = db.query(AnnouncementBar).order_by(AnnouncementBar.created_at.desc()).all()
    return announcements


@router.post("/api/v1/admin/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def admin_create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    announcement = AnnouncementBar(**data.dict())
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.put("/api/v1/admin/announcements/{announcement_id}", response_model=AnnouncementResponse)
def admin_update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    announcement = db.query(AnnouncementBar).filter(AnnouncementBar.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(announcement, key, value)
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.delete("/api/v1/admin/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    announcement = db.query(AnnouncementBar).filter(AnnouncementBar.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(announcement)
    db.commit()


# ─── Notifications ───

@router.get("/api/v1/notifications", response_model=List[NotificationResponse])
def get_user_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
    ).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications


@router.get("/api/v1/notifications/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).scalar() or 0
    return UnreadCountResponse(count=count)


@router.put("/api/v1/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/api/v1/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.post("/api/v1/admin/notifications", status_code=status.HTTP_201_CREATED)
def admin_broadcast_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if data.target_user_id:
        users = db.query(User).filter(User.id == data.target_user_id).all()
    else:
        users = db.query(User).filter(User.is_active == True).all()

    for user in users:
        notification = Notification(
            user_id=user.id,
            title=data.title,
            message=data.message,
            type=data.type,
        )
        db.add(notification)
    db.commit()
    return {"message": f"Notification sent to {len(users)} user(s)"}
