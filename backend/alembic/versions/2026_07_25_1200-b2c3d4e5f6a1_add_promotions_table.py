"""add_promotions_table

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-07-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    promotion_type_enum = sa.Enum('PERCENTAGE', 'FIXED_AMOUNT', name='promotiontypeenum')
    promotion_type_enum.create(op.get_bind(), checkfirst=True)

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table('promotions'):
        op.create_table(
            'promotions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('promotion_type', sa.Enum('PERCENTAGE', 'FIXED_AMOUNT', name='promotiontypeenum', create_type=False), nullable=False),
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

        op.create_index('idx_promotion_active', 'promotions', ['is_active'])
        op.create_index('idx_promotion_dates', 'promotions', ['start_date', 'end_date'])
        op.create_index('idx_promotion_priority', 'promotions', ['priority'])


def downgrade() -> None:
    op.drop_index('idx_promotion_priority', table_name='promotions')
    op.drop_index('idx_promotion_dates', table_name='promotions')
    op.drop_index('idx_promotion_active', table_name='promotions')
    op.drop_table('promotions')
    sa.Enum(name='promotiontypeenum').drop(op.get_bind(), checkfirst=True)
