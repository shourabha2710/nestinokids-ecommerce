"""add shipping address snapshot to orders

Revision ID: c0d1e2f3a4b5
Revises: b0c1d2e3f4a5
Create Date: 2026-09-12

G1 - Order shipping address snapshot.

Adds an immutable JSON snapshot of the shipping address captured at checkout:

- ``shipping_address_snapshot`` : object built server-side from the Address
  record at order creation (NULL for historical orders placed before this
  migration).

The column is nullable so existing rows are unaffected. It is stored as
JSONB on PostgreSQL (the project runtimes) and as JSON on other backends
(e.g. the SQLite test database). No backfill is performed: the snapshot must
never be regenerated from ``shipping_address_id`` because referenced
addresses can be edited or deleted afterwards.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'c0d1e2f3a4b5'
down_revision = 'b0c1d2e3f4a5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'orders',
        sa.Column(
            'shipping_address_snapshot',
            sa.JSON().with_variant(postgresql.JSONB(), 'postgresql'),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('orders', 'shipping_address_snapshot')