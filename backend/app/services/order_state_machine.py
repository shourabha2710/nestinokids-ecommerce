"""
Order State Machine — single authority for order status transitions.

Every status change MUST go through OrderStateMachine.transition().
No endpoint should directly modify order.status.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.models import (
    Order,
    OrderStatusEnum,
    OrderStatusHistory,
    OrderTrackingEvent,
    Inventory,
    ProductVariant,
)


# ─── Valid Transitions ───────────────────────────────────────────────────────

VALID_TRANSITIONS: dict[str, list[str]] = {
    OrderStatusEnum.PENDING.value: [
        OrderStatusEnum.CONFIRMED.value,
        OrderStatusEnum.CANCELLED.value,
        OrderStatusEnum.FAILED.value,
    ],
    OrderStatusEnum.CONFIRMED.value: [
        OrderStatusEnum.PACKED.value,
        OrderStatusEnum.CANCELLED.value,
    ],
    OrderStatusEnum.PACKED.value: [
        OrderStatusEnum.SHIPPED.value,
    ],
    OrderStatusEnum.SHIPPED.value: [
        OrderStatusEnum.OUT_FOR_DELIVERY.value,
    ],
    OrderStatusEnum.OUT_FOR_DELIVERY.value: [
        OrderStatusEnum.DELIVERED.value,
    ],
    OrderStatusEnum.DELIVERED.value: [
        OrderStatusEnum.RETURN_REQUESTED.value,
    ],
    OrderStatusEnum.RETURN_REQUESTED.value: [
        OrderStatusEnum.RETURNED.value,
    ],
    OrderStatusEnum.RETURNED.value: [
        OrderStatusEnum.REFUND_INITIATED.value,
    ],
    OrderStatusEnum.REFUND_INITIATED.value: [
        OrderStatusEnum.REFUNDED.value,
    ],
    OrderStatusEnum.CANCELLED.value: [],
    OrderStatusEnum.REFUNDED.value: [],
    OrderStatusEnum.FAILED.value: [],
}


# ─── Display Labels ──────────────────────────────────────────────────────────

STATUS_LABELS: dict[str, str] = {
    OrderStatusEnum.PENDING.value: "Pending",
    OrderStatusEnum.CONFIRMED.value: "Confirmed",
    OrderStatusEnum.PACKED.value: "Packed",
    OrderStatusEnum.SHIPPED.value: "Shipped",
    OrderStatusEnum.OUT_FOR_DELIVERY.value: "Out for Delivery",
    OrderStatusEnum.DELIVERED.value: "Delivered",
    OrderStatusEnum.CANCELLED.value: "Cancelled",
    OrderStatusEnum.RETURN_REQUESTED.value: "Return Requested",
    OrderStatusEnum.RETURNED.value: "Returned",
    OrderStatusEnum.REFUND_INITIATED.value: "Refund Initiated",
    OrderStatusEnum.REFUNDED.value: "Refunded",
    OrderStatusEnum.FAILED.value: "Failed",
}


# ─── Inventory Hook Directions ────────────────────────────────────────────────

# Inventory is reserved on confirmed; released on cancel BEFORE shipping.
# Inventory is NOT released once shipped.
_RESERVE_STATUSES = {OrderStatusEnum.CONFIRMED.value}
_RELEASE_STATUSES = {OrderStatusEnum.CANCELLED.value}


class OrderStateMachine:
    """Centralised order lifecycle manager."""

    # ── Query helpers ──────────────────────────────────────────────────────

    @staticmethod
    def can_transition(current_status: str, new_status: str) -> bool:
        allowed = VALID_TRANSITIONS.get(current_status, [])
        return new_status in allowed

    @staticmethod
    def get_allowed_transitions(current_status: str) -> List[str]:
        return list(VALID_TRANSITIONS.get(current_status, []))

    @staticmethod
    def get_all_states() -> List[str]:
        return [s.value for s in OrderStatusEnum]

    # ── Core transition ────────────────────────────────────────────────────

    @staticmethod
    def transition(
        db: Session,
        order: Order,
        new_status: str,
        *,
        admin_id: Optional[int] = None,
        user_id: Optional[int] = None,
        remarks: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> OrderStatusHistory:
        """
        Execute a validated status transition.

        Returns the created OrderStatusHistory record.
        Raises ValueError on invalid transitions.
        """
        current_status = (
            order.status.value if hasattr(order.status, "value") else order.status
        )

        if current_status == new_status:
            raise ValueError(f"Order is already in '{new_status}' status")

        if not OrderStateMachine.can_transition(current_status, new_status):
            allowed = VALID_TRANSITIONS.get(current_status, [])
            raise ValueError(
                f"Cannot transition from '{current_status}' to '{new_status}'. "
                f"Valid transitions: {allowed}"
            )

        old_status_enum = OrderStatusEnum(current_status)
        new_status_enum = OrderStatusEnum(new_status)

        # ── Record history (append-only) ───────────────────────────────────
        history = OrderStatusHistory(
            order_id=order.id,
            old_status=old_status_enum,
            new_status=new_status_enum,
            changed_by_admin_id=admin_id,
            changed_by_user_id=user_id,
            remarks=remarks,
            metadata_json=metadata,
        )
        db.add(history)

        # ── Update order.status + timestamp fields ─────────────────────────
        order.status = new_status_enum
        now = datetime.now(timezone.utc)

        if new_status == OrderStatusEnum.SHIPPED.value:
            order.shipped_at = now
        elif new_status == OrderStatusEnum.DELIVERED.value:
            order.delivered_at = now

        # ── Create tracking event (backward-compatible) ────────────────────
        tracking = OrderTrackingEvent(
            order_id=order.id,
            status=STATUS_LABELS.get(new_status, new_status),
            note=remarks or f"Status updated to {STATUS_LABELS.get(new_status, new_status)}",
        )
        db.add(tracking)

        # ── Inventory hooks ────────────────────────────────────────────────
        OrderStateMachine._handle_inventory(db, order, new_status)

        # ── Side-effect hooks ──────────────────────────────────────────────
        OrderStateMachine._fire_hooks(db, order, new_status)

        db.flush()
        return history

    # ── Inventory management ───────────────────────────────────────────────

    @staticmethod
    def _handle_inventory(db: Session, order: Order, new_status: str) -> None:
        """
        Reserve inventory on confirmed; release on cancel before shipping.
        Never release after shipment.
        """
        if new_status in _RESERVE_STATUSES:
            # Inventory was already reserved at order creation time.
            # This hook is a placeholder for future multi-step reservation logic.
            pass

        elif new_status in _RELEASE_STATUSES:
            # Only release if order has NOT been shipped yet
            # (at this point, new_status is cancelled, so shipped_at is None unless
            # the order was previously shipped — which is not possible per transition rules).
            OrderStateMachine._release_order_stock(order, db)

    @staticmethod
    def _release_order_stock(order: Order, db: Session) -> None:
        """Restore inventory and variant stock for all items in the order."""
        for item in order.items:
            inventory = (
                db.query(Inventory)
                .filter(Inventory.product_id == item.product_id)
                .with_for_update()
                .first()
            )
            if inventory:
                inventory.available_quantity += item.quantity
                inventory.reserved_quantity = max(
                    0, inventory.reserved_quantity - item.quantity
                )
                db.add(inventory)

            if item.variant_id:
                variant = (
                    db.query(ProductVariant)
                    .filter(ProductVariant.id == item.variant_id)
                    .with_for_update()
                    .first()
                )
                if variant:
                    variant.quantity += item.quantity
                    db.add(variant)

    # ── Side-effect hooks ──────────────────────────────────────────────────

    @staticmethod
    def _fire_hooks(db: Session, order: Order, new_status: str) -> None:
        """Fire notification / loyalty / audit hooks. All wrapped in try/except."""
        from app.services.notification_event_service import notification_event_service

        if new_status == OrderStatusEnum.CANCELLED.value:
            try:
                notification_event_service.notify_order_cancelled(db, order)
            except Exception:
                pass

        if new_status == OrderStatusEnum.DELIVERED.value:
            try:
                from app.api.v1.endpoints.engagement import (
                    award_loyalty_points_for_order,
                )
                award_loyalty_points_for_order(order.id, db)
            except Exception:
                pass

        # Placeholder hooks for future notification integration
        # if new_status == OrderStatusEnum.SHIPPED.value:
        #     _notify_order_shipped(order)
        # if new_status == OrderStatusEnum.OUT_FOR_DELIVERY.value:
        #     _notify_out_for_delivery(order)
        # if new_status == OrderStatusEnum.DELIVERED.value:
        #     _notify_order_delivered(order)
        # if new_status == OrderStatusEnum.RETURN_REQUESTED.value:
        #     _notify_return_requested(order)
        # if new_status == OrderStatusEnum.REFUND_INITIATED.value:
        #     _notify_refund_initiated(order)

    # ── Timeline / history ─────────────────────────────────────────────────

    @staticmethod
    def record_initial_status(db: Session, order: Order) -> None:
        """Create the initial Pending history entry for a new order."""
        history = OrderStatusHistory(
            order_id=order.id,
            old_status=None,
            new_status=OrderStatusEnum.PENDING,
            remarks="Order placed",
        )
        db.add(history)

    @staticmethod
    def build_timeline(db: Session, order_id: int) -> List[dict]:
        """
        Return an ordered list of status history entries for an order.
        Each dict has: status, label, timestamp, remarks.
        """
        records = (
            db.query(OrderStatusHistory)
            .filter(OrderStatusHistory.order_id == order_id)
            .order_by(OrderStatusHistory.created_at.asc())
            .all()
        )
        return [
            {
                "status": r.new_status.value if hasattr(r.new_status, "value") else r.new_status,
                "label": STATUS_LABELS.get(
                    r.new_status.value if hasattr(r.new_status, "value") else r.new_status,
                    r.new_status.value if hasattr(r.new_status, "value") else r.new_status,
                ),
                "timestamp": r.created_at.isoformat() if r.created_at else None,
                "remarks": r.remarks,
            }
            for r in records
        ]

    @staticmethod
    def get_full_status_history(db: Session, order_id: int) -> List[dict]:
        """Return full admin-facing status history with who changed it."""
        records = (
            db.query(OrderStatusHistory)
            .filter(OrderStatusHistory.order_id == order_id)
            .order_by(OrderStatusHistory.created_at.asc())
            .all()
        )
        result = []
        for r in records:
            entry = {
                "id": r.id,
                "old_status": r.old_status.value if r.old_status else None,
                "new_status": r.new_status.value if hasattr(r.new_status, "value") else r.new_status,
                "label": STATUS_LABELS.get(
                    r.new_status.value if hasattr(r.new_status, "value") else r.new_status,
                    "",
                ),
                "changed_by_admin_id": r.changed_by_admin_id,
                "changed_by_user_id": r.changed_by_user_id,
                "remarks": r.remarks,
                "metadata": r.metadata_json,
                "timestamp": r.created_at.isoformat() if r.created_at else None,
            }
            result.append(entry)
        return result


# Module-level singleton for convenience
order_state_machine = OrderStateMachine()
