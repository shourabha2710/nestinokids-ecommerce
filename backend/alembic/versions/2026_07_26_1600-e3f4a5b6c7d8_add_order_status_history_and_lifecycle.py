"""add_order_status_history_and_lifecycle

Revision ID: e3f4a5b6c7d8
Revises: d1e2f3a4b5c6
Create Date: 2026-07-26 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_ENUM_VALUES = [
    'out_for_delivery', 'return_requested',
    'refund_initiated', 'refunded', 'failed',
]

ALL_ORDER_STATUS_VALUES = [
    'pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery',
    'delivered', 'cancelled', 'return_requested', 'returned',
    'refund_initiated', 'refunded', 'failed',
]


def _table_exists(bind, table_name: str) -> bool:
    result = bind.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :name"
        ),
        {"name": table_name},
    )
    return result.scalar() is not None


def _index_exists(bind, index_name: str) -> bool:
    result = bind.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes "
            "WHERE schemaname = 'public' AND indexname = :name"
        ),
        {"name": index_name},
    )
    return result.scalar() is not None


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. Extend orderstatusenum with new values ──────────────────────────
    for val in NEW_ENUM_VALUES:
        bind.execute(
            sa.text(
                "DO $$ BEGIN "
                "  ALTER TYPE orderstatusenum ADD VALUE IF NOT EXISTS :val; "
                "EXCEPTION WHEN duplicate_object THEN NULL; "
                "END $$"
            ),
            {"val": val},
        )

    # ── 2. Create order_status_history table ────────────────────────────────
    # Re-use the existing orderstatusenum for FK columns
    order_status_col = PG_ENUM(
        *ALL_ORDER_STATUS_VALUES,
        name='orderstatusenum',
        create_type=False,
    )

    if not _table_exists(bind, 'order_status_history'):
        op.create_table(
            'order_status_history',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id'), nullable=False),
            sa.Column('old_status', order_status_col, nullable=True),
            sa.Column('new_status', order_status_col, nullable=False),
            sa.Column('changed_by_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('changed_by_admin_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('remarks', sa.Text(), nullable=True),
            sa.Column('metadata_json', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if not _index_exists(bind, 'idx_status_history_order'):
        op.create_index('idx_status_history_order', 'order_status_history', ['order_id'])

    if not _index_exists(bind, 'idx_status_history_new_status'):
        op.create_index('idx_status_history_new_status', 'order_status_history', ['new_status'])


def downgrade() -> None:
    bind = op.get_bind()

    if _index_exists(bind, 'idx_status_history_new_status'):
        op.drop_index('idx_status_history_new_status', table_name='order_status_history')

    if _index_exists(bind, 'idx_status_history_order'):
        op.drop_index('idx_status_history_order', table_name='order_status_history')

    if _table_exists(bind, 'order_status_history'):
        op.drop_table('order_status_history')

    # NOTE: PostgreSQL does not support removing individual values from an enum.
    # The added enum values are left in place; a full enum replacement would require
    # recreating the column — out of scope for a downgrade.
