"""Order-creation idempotency (G3).

Server-side, DB-backed idempotency for the two customer order-creation
endpoints (POST /orders, POST /checkout). The DB unique constraint on
(user_id, scope, idempotency_key) is the source of truth:

- the first request inserts the claim and continues into order finalization;
  the claim commits atomically with the order in the SAME transaction, so a
  failed order creation rolls the claim back and the key stays retryable;
- a concurrent duplicate blocks on the unique index until the winner's
  transaction commits, then gets an IntegrityError, rolls back its own no-op
  transaction, and resolves the winning claim (replay / 409).

The request fingerprint is a deterministic SHA-256 of ONLY stable
client-submitted logical inputs (addresses, coupon, loyalty, and for /orders
payment method + item list). It never includes server state (prices,
inventory, cart, timestamps, balances, usage counts).
"""
import hashlib
import json
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    Order,
    OrderIdempotencyKey,
    OrderItem,
    Product,
)

IDEMPOTENCY_KEY_MAX_LENGTH = 128

SCOPE_ORDERS = "orders"
SCOPE_CHECKOUT = "checkout"

# Outcome markers returned by claim_idempotency
CREATED = "created"        # this request wins; proceed with order creation
REPLAY = "replayed"        # an earlier request already won; replay it


def validate_idempotency_key(value: Optional[str]) -> str:
    """Validate the Idempotency-Key header (required, <=128 printable ASCII)."""
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IDEMPOTENCY_KEY_REQUIRED",
                "message": "Idempotency-Key header is required for order creation.",
            },
        )
    key = str(value).strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IDEMPOTENCY_KEY_INVALID",
                "message": "Idempotency-Key must not be empty or whitespace-only.",
            },
        )
    if len(key) > IDEMPOTENCY_KEY_MAX_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IDEMPOTENCY_KEY_TOO_LONG",
                "message": (
                    f"Idempotency-Key must not exceed "
                    f"{IDEMPOTENCY_KEY_MAX_LENGTH} characters."
                ),
            },
        )
    if any(ord(ch) < 0x20 or ord(ch) > 0x7E for ch in key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IDEMPOTENCY_KEY_INVALID",
                "message": "Idempotency-Key must contain only printable ASCII characters.",
            },
        )
    return key


def build_request_fingerprint(
    scope: str,
    shipping_address_id: int,
    billing_address_id: int,
    coupon_code: Optional[str],
    loyalty_points_to_redeem: int,
    payment_method: Optional[str] = None,
    items: Optional[List] = None,
) -> str:
    """Deterministic SHA-256 fingerprint of the client-submitted request.

    Canonicalizes before hashing so equivalent logical requests produce the
    same fingerprint. Never includes server-derived state (prices, inventory,
    cart contents, timestamps, balances, usage counts).
    """
    payload = {
        "scope": scope,
        "shipping_address_id": int(shipping_address_id),
        "billing_address_id": int(billing_address_id),
        "coupon_code": (coupon_code or "").strip().upper() or None,
        "loyalty_points_to_redeem": int(loyalty_points_to_redeem or 0),
    }
    if scope == SCOPE_ORDERS:
        payload["payment_method"] = (payment_method or "cod").strip().lower()
        normalized_items = [
            {
                "product_id": int(item.product_id),
                "variant_id": int(item.variant_id) if item.variant_id else 0,
                "quantity": int(item.quantity),
            }
            for item in (items or [])
        ]
        normalized_items.sort(key=lambda e: (e["product_id"], e["variant_id"]))
        payload["items"] = normalized_items

    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def claim_idempotency(
    db: Session,
    user_id: int,
    scope: str,
    idempotency_key: str,
    fingerprint: str,
):
    """Atomically claim (user, scope, key).

    Returns (CREATED, claim) when this request wins — the claim row is
    flushed and will commit with the order's transaction. Returns
    (REPLAY, existing_claim) when an earlier request already claimed the key;
    the caller must compare the fingerprint and return the original order.
    """
    claim = OrderIdempotencyKey(
        user_id=user_id,
        scope=scope,
        idempotency_key=idempotency_key,
        request_fingerprint=fingerprint,
    )
    db.add(claim)
    try:
        db.flush()
        return CREATED, claim
    except IntegrityError:
        # Unique (user_id, scope, idempotency_key) violation: someone else won.
        # Roll back our own (read-only so far) transaction so the session is
        # not left in an aborted state, then load the committed winner.
        db.rollback()
        existing = (
            db.query(OrderIdempotencyKey)
            .filter(
                OrderIdempotencyKey.user_id == user_id,
                OrderIdempotencyKey.scope == scope,
                OrderIdempotencyKey.idempotency_key == idempotency_key,
            )
            .first()
        )
        return REPLAY, existing


def resolve_replay(
    db: Session,
    claim: OrderIdempotencyKey,
    fingerprint: str,
) -> Order:
    """Resolve a REPLAY claim: return the original order or raise.

    - fingerprint mismatch            -> HTTP 409 Conflict
    - order still being processed     -> HTTP 409 IN_PROGRESS (defensive)
    - successful original order       -> the original Order row
    """
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "IDEMPOTENCY_STATE_MISSING",
                "message": "Idempotency claim could not be resolved.",
            },
        )
    if claim.request_fingerprint != fingerprint:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "IDEMPOTENCY_CONFLICT",
                "message": (
                    "Idempotency-Key was already used for a different request. "
                    "This key cannot be reused for another payload."
                ),
            },
        )
    if claim.order_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "IDEMPOTENCY_IN_PROGRESS",
                "message": (
                    "An order for this Idempotency-Key is still being "
                    "processed. Retry shortly."
                ),
            },
        )
    order = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
            joinedload(Order.items).joinedload(OrderItem.variant),
        )
        .filter(Order.id == claim.order_id)
        .first()
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "IDEMPOTENCY_IN_PROGRESS",
                "message": "The original order for this Idempotency-Key is unavailable.",
            },
        )
    return order