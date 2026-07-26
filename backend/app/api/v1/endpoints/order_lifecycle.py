"""
Order Lifecycle endpoints — admin transition + customer timeline.

POST /api/v1/admin/orders/{order_id}/transition  (admin only)
GET  /api/v1/orders/{order_id}/timeline           (customer)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Order, OrderStatusEnum, User
from app.schemas.schemas import (
    OrderTransitionRequest,
    OrderTimelineResponse,
    OrderTimelineEntry,
    OrderStatusHistoryResponse,
)
from app.api.v1.endpoints.auth import get_current_user
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.core.constants import AuditAction, AuditEntityType
from app.services.audit_service import audit_service
from app.services.order_state_machine import order_state_machine

router = APIRouter(tags=["order-lifecycle"])


# ─── Admin: Transition Order Status ──────────────────────────────────────────

@router.post(
    "/api/v1/admin/orders/{order_id}/transition",
    response_model=OrderTimelineResponse,
)
def admin_transition_order(
    order_id: int,
    data: OrderTransitionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permissions.ORDER_UPDATE)),
):
    """
    Transition an order to a new status.

    Validates the transition against the state machine, records history,
    creates tracking events, and fires inventory/notification hooks.
    """
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    current_status = (
        order.status.value if hasattr(order.status, "value") else order.status
    )

    try:
        history = order_state_machine.transition(
            db,
            order,
            data.new_status,
            admin_id=admin.id,
            remarks=data.remarks,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Audit log
    audit_service.create_log(
        db=db,
        user=admin,
        action=AuditAction.STATUS_CHANGE,
        entity_type=AuditEntityType.ORDER,
        entity_id=order.id,
        description=f"Changed order status from {current_status} to {data.new_status}",
        old_values={"status": current_status},
        new_values={"status": data.new_status},
    )

    db.commit()
    db.refresh(order)

    # Return full timeline response
    current = (
        order.status.value if hasattr(order.status, "value") else order.status
    )
    allowed = order_state_machine.get_allowed_transitions(current)
    timeline_raw = order_state_machine.build_timeline(db, order.id)
    timeline = [OrderTimelineEntry(**entry) for entry in timeline_raw]

    return OrderTimelineResponse(
        order_id=order.id,
        current_status=current,
        allowed_transitions=allowed,
        timeline=timeline,
    )


# ─── Customer: View Order Timeline ──────────────────────────────────────────

@router.get(
    "/api/v1/orders/{order_id}/timeline",
    response_model=OrderTimelineResponse,
)
def get_order_timeline(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the status timeline for an order belonging to the current user."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    current = (
        order.status.value if hasattr(order.status, "value") else order.status
    )
    allowed = order_state_machine.get_allowed_transitions(current)
    timeline_raw = order_state_machine.build_timeline(db, order.id)
    timeline = [OrderTimelineEntry(**entry) for entry in timeline_raw]

    return OrderTimelineResponse(
        order_id=order.id,
        current_status=current,
        allowed_transitions=allowed,
        timeline=timeline,
    )


# ─── Admin: Get Full Status History ─────────────────────────────────────────

@router.get(
    "/api/v1/admin/orders/{order_id}/status-history",
    response_model=list[OrderStatusHistoryResponse],
)
def admin_get_order_status_history(
    order_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permissions.ORDER_VIEW)),
):
    """Return the full status history for an order (admin only)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    history = order_state_machine.get_full_status_history(db, order.id)
    return history
