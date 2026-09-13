"""add order idempotency keys

Revision ID: 9f8e7d6c5b4a
Revises: c0d1e2f3a4b5
Create Date: 2026-09-14

G3 - Order idempotency / duplicate order prevention.

Adds a dedicated ``order_idempotency_keys`` table rather than putting
idempotency fields on ``orders``:

- one row per ``(user_id, scope, idempotency_key)``; the UNIQUE constraint is
  the DB-enforced source of truth that makes concurrent duplicate submissions
  produce exactly one order;
- ``scope`` ('orders' | 'checkout') prevents the same key string from
  colliding across semantically different endpoints;
- ``request_fingerprint`` is a server-computed SHA-256 of the canonical
  client-submitted logical request, used to reject same-key/different-payload
  misuse with HTTP 409;
- ``order_id`` NULL while an order is being created, set before the single
  commit that persists both the claim and the order atomically (a rollback
  therefore removes the claim and keeps the key retryable);
- ``created_at`` for debugging/cleanup.

No backfill required and no destructive changes.
"""
from alembic import op
import sqlalchemy as sa

revision = '9f8e7d6c5b4a'
down_revision = 'c0d1e2f3a4b5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'order_idempotency_keys',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('scope', sa.String(20), nullable=False),
        sa.Column('idempotency_key', sa.String(128), nullable=False),
        sa.Column('request_fingerprint', sa.String(64), nullable=False),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            'user_id', 'scope', 'idempotency_key',
            name='uq_order_idempotency_user_scope_key',
        ),
    )
    op.create_index('idx_order_idempotency_user', 'order_idempotency_keys', ['user_id'])
    op.create_index('idx_order_idempotency_key', 'order_idempotency_keys', ['idempotency_key'])
    op.create_index('idx_order_idempotency_order', 'order_idempotency_keys', ['order_id'])


def downgrade() -> None:
    op.drop_index('idx_order_idempotency_order', table_name='order_idempotency_keys')
    op.drop_index('idx_order_idempotency_key', table_name='order_idempotency_keys')
    op.drop_index('idx_order_idempotency_user', table_name='order_idempotency_keys')
    op.drop_table('order_idempotency_keys')