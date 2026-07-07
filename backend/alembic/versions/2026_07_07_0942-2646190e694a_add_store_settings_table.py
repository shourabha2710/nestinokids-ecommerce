"""add_store_settings_table

Revision ID: 2646190e694a
Revises: e224a3f0cb29
Create Date: 2026-07-07 09:42:23.506494

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '2646190e694a'
down_revision: Union[str, None] = 'e224a3f0cb29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'store_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('store_name', sa.String(length=255), nullable=False, server_default='NestinoKids'),
        sa.Column('store_email', sa.String(length=255), nullable=True),
        sa.Column('store_phone', sa.String(length=20), nullable=True),
        sa.Column('store_address', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('favicon_url', sa.String(length=500), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('timezone', sa.String(length=50), nullable=False, server_default='Asia/Kolkata'),
        sa.Column('gst_number', sa.String(length=50), nullable=True),
        sa.Column('tax_enabled', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('tax_percentage', sa.Float(), nullable=True, server_default='0'),
        sa.Column('free_shipping_enabled', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('free_shipping_min', sa.Float(), nullable=True, server_default='0'),
        sa.Column('cod_enabled', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('online_payment_enabled', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('maintenance_mode', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=None),
        sa.PrimaryKeyConstraint('id'),
    )

    # Insert initial seed row
    op.execute(
        "INSERT INTO store_settings (store_name, currency, timezone) "
        "VALUES ('NestinoKids', 'INR', 'Asia/Kolkata') "
        "ON CONFLICT DO NOTHING"
    )


def downgrade() -> None:
    op.drop_table('store_settings')
