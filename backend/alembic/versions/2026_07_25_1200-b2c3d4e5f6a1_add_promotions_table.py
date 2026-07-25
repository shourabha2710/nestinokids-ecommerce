"""add_promotions_table

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-07-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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

    # Dedicated instance for explicit enum type creation.
    promotion_enum_create = PG_ENUM(
        'PERCENTAGE', 'FIXED_AMOUNT',
        name='promotiontypeenum',
        create_type=False,
    )
    promotion_enum_create.create(bind, checkfirst=True)

    # Dedicated instance for the table column definition.
    # Separate from the create instance to avoid SQLAlchemy
    # metadata side-effects from shared state.
    promotion_enum_column = PG_ENUM(
        'PERCENTAGE', 'FIXED_AMOUNT',
        name='promotiontypeenum',
        create_type=False,
    )

    if not _table_exists(bind, 'promotions'):
        op.create_table(
            'promotions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('promotion_type', promotion_enum_column, nullable=False),
            sa.Column('discount_value', sa.Float(), nullable=False),
            sa.Column('minimum_order_amount', sa.Float(), server_default='0.0'),
            sa.Column('maximum_discount_amount', sa.Float(), nullable=True),
            sa.Column('priority', sa.Integer(), server_default='0'),
            sa.Column('is_stackable', sa.Boolean(), server_default='false'),
            sa.Column('is_active', sa.Boolean(), server_default='true'),
            sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
            sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
            sa.Column('banner_text', sa.String(length=500), nullable=True),
            sa.Column('badge_text', sa.String(length=100), nullable=True),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=True),
            sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        )

    # Create indexes idempotently.
    if not _index_exists(bind, 'idx_promotion_active'):
        op.create_index('idx_promotion_active', 'promotions', ['is_active'])

    if not _index_exists(bind, 'idx_promotion_dates'):
        op.create_index('idx_promotion_dates', 'promotions', ['start_date', 'end_date'])

    if not _index_exists(bind, 'idx_promotion_priority'):
        op.create_index('idx_promotion_priority', 'promotions', ['priority'])


def downgrade() -> None:
    bind = op.get_bind()

    if _index_exists(bind, 'idx_promotion_priority'):
        op.drop_index('idx_promotion_priority', table_name='promotions')

    if _index_exists(bind, 'idx_promotion_dates'):
        op.drop_index('idx_promotion_dates', table_name='promotions')

    if _index_exists(bind, 'idx_promotion_active'):
        op.drop_index('idx_promotion_active', table_name='promotions')

    if _table_exists(bind, 'promotions'):
        op.drop_table('promotions')

    # Dedicated instance for dropping the enum type.
    # Safe because promotions is the only table using this enum.
    promotion_enum_drop = PG_ENUM(
        'PERCENTAGE', 'FIXED_AMOUNT',
        name='promotiontypeenum',
    )
    promotion_enum_drop.drop(bind, checkfirst=True)
