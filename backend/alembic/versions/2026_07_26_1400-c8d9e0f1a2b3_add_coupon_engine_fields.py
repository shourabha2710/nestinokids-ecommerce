"""add coupon engine fields

Revision ID: c8d9e0f1a2b3
Revises: b2c3d4e5f6a1
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = 'c8d9e0f1a2b3'
down_revision = 'b2c3d4e5f6a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('coupons', sa.Column('name', sa.String(255), nullable=True))
    op.add_column('coupons', sa.Column('per_user_limit', sa.Integer(), nullable=True))
    op.add_column('coupons', sa.Column('applicable_scope', sa.String(20), server_default='GLOBAL', nullable=False))
    op.add_column('coupons', sa.Column('priority', sa.Integer(), server_default='0', nullable=False))
    op.add_column('coupons', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('coupons', sa.Column('category_id', sa.Integer(), nullable=True))
    op.add_column('coupons', sa.Column('product_id', sa.Integer(), nullable=True))

    op.create_index('idx_coupon_active', 'coupons', ['is_active'])
    op.create_index('idx_coupon_dates', 'coupons', ['start_date', 'end_date'])
    op.create_index('idx_coupon_scope', 'coupons', ['applicable_scope'])

    op.create_foreign_key('fk_coupon_category', 'coupons', 'categories', ['category_id'], ['id'])
    op.create_foreign_key('fk_coupon_product', 'coupons', 'products', ['product_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_coupon_product', 'coupons', type_='foreignkey')
    op.drop_constraint('fk_coupon_category', 'coupons', type_='foreignkey')
    op.drop_index('idx_coupon_scope', 'coupons')
    op.drop_index('idx_coupon_dates', 'coupons')
    op.drop_index('idx_coupon_active', 'coupons')
    op.drop_column('coupons', 'product_id')
    op.drop_column('coupons', 'category_id')
    op.drop_column('coupons', 'updated_at')
    op.drop_column('coupons', 'priority')
    op.drop_column('coupons', 'applicable_scope')
    op.drop_column('coupons', 'per_user_limit')
    op.drop_column('coupons', 'name')
