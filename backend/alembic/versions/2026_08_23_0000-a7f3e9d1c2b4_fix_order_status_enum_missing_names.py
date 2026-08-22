"""fix_order_status_enum_missing_names

Revision ID: a7f3e9d1c2b4
Revises: 5a6b7c8d9e0f
Create Date: 2026-08-23 00:00:00.000000

Root cause of the DEV "Move to Out for Delivery" 500:

The squashed baseline created the native PostgreSQL enum ``orderstatusenum``
with UPPERCASE member *names* (PENDING, CONFIRMED, PACKED, SHIPPED,
DELIVERED, CANCELLED, RETURNED) - which matches how SQLAlchemy's
``Enum(OrderStatusEnum)`` persists data (it stores the member ``.name``).

A later lifecycle migration extended the SAME type with the new states as
lowercase member *values* instead:

    out_for_delivery, return_requested, refund_initiated, refunded, failed

So on PostgreSQL the type was missing the uppercase names the ORM actually
writes. Any transition into one of those states failed with:

    invalid input value for enum "orderstatusenum": "OUT_FOR_DELIVERY"

surfacing as an unhandled HTTP 500 (whose bare response also lacked CORS
headers). SQLite dev/test databases are unaffected because they store enums
as plain VARCHAR.

This migration adds the missing uppercase names idempotently.

Requires PostgreSQL 12+ for transactional ALTER TYPE ... ADD VALUE.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7f3e9d1c2b4'
down_revision: Union[str, None] = '5a6b7c8d9e0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Member NAMES (as persisted by SQLAlchemy) missing from the database enum.
# Baseline provided: PENDING, CONFIRMED, PACKED, SHIPPED, DELIVERED,
# CANCELLED, RETURNED.
MISSING_ENUM_NAMES = [
    'OUT_FOR_DELIVERY',
    'RETURN_REQUESTED',
    'REFUND_INITIATED',
    'REFUNDED',
    'FAILED',
]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        # SQLite (dev/test) stores enums as VARCHAR - nothing to alter.
        return
    for name in MISSING_ENUM_NAMES:
        # Literal interpolation is safe: values are static ASCII constants
        # mirroring app.models.models.OrderStatusEnum member names.
        bind.execute(
            sa.text(
                "DO $$ BEGIN "
                f"ALTER TYPE orderstatusenum ADD VALUE IF NOT EXISTS '{name}'; "
                "EXCEPTION WHEN undefined_object THEN NULL; "
                "WHEN duplicate_object THEN NULL; "
                "END $$"
            )
        )


def downgrade() -> None:
    # PostgreSQL cannot remove individual enum values; no-op by design.
    pass
