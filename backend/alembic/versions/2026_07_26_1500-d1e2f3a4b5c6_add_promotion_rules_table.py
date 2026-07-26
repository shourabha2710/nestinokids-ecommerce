"""add_promotion_rules_table

Revision ID: d1e2f3a4b5c6
Revises: c8d9e0f1a2b3
Create Date: 2026-07-26 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c8d9e0f1a2b3'
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

    # Create the PromotionRuleTypeEnum
    rule_enum_create = PG_ENUM(
        'MINIMUM_CART_VALUE', 'BUY_X_GET_Y', 'QUANTITY_BASED',
        'CATEGORY_BASED', 'PRODUCT_BASED', 'FREE_SHIPPING',
        name='promotionruletypeenum',
        create_type=False,
    )
    rule_enum_create.create(bind, checkfirst=True)

    rule_enum_column = PG_ENUM(
        'MINIMUM_CART_VALUE', 'BUY_X_GET_Y', 'QUANTITY_BASED',
        'CATEGORY_BASED', 'PRODUCT_BASED', 'FREE_SHIPPING',
        name='promotionruletypeenum',
        create_type=False,
    )

    if not _table_exists(bind, 'promotion_rules'):
        op.create_table(
            'promotion_rules',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('promotion_id', sa.Integer(), sa.ForeignKey('promotions.id'), nullable=False),
            sa.Column('rule_type', rule_enum_column, nullable=False),
            sa.Column('minimum_cart_amount', sa.Float(), nullable=True),
            sa.Column('minimum_quantity', sa.Integer(), nullable=True),
            sa.Column('buy_quantity', sa.Integer(), nullable=True),
            sa.Column('get_quantity', sa.Integer(), nullable=True),
            sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=True),
            sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id'), nullable=True),
            sa.Column('target_product_id', sa.Integer(), sa.ForeignKey('products.id'), nullable=True),
            sa.Column('discount_type', sa.String(length=20), nullable=True),
            sa.Column('discount_value', sa.Float(), nullable=True),
            sa.Column('priority', sa.Integer(), server_default='0'),
            sa.Column('is_active', sa.Boolean(), server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        )

    if not _index_exists(bind, 'idx_promotion_rule_promo'):
        op.create_index('idx_promotion_rule_promo', 'promotion_rules', ['promotion_id'])

    if not _index_exists(bind, 'idx_promotion_rule_type'):
        op.create_index('idx_promotion_rule_type', 'promotion_rules', ['rule_type'])


def downgrade() -> None:
    bind = op.get_bind()

    if _index_exists(bind, 'idx_promotion_rule_type'):
        op.drop_index('idx_promotion_rule_type', table_name='promotion_rules')

    if _index_exists(bind, 'idx_promotion_rule_promo'):
        op.drop_index('idx_promotion_rule_promo', table_name='promotion_rules')

    if _table_exists(bind, 'promotion_rules'):
        op.drop_table('promotion_rules')

    rule_enum_drop = PG_ENUM(
        'MINIMUM_CART_VALUE', 'BUY_X_GET_Y', 'QUANTITY_BASED',
        'CATEGORY_BASED', 'PRODUCT_BASED', 'FREE_SHIPPING',
        name='promotionruletypeenum',
    )
    rule_enum_drop.drop(bind, checkfirst=True)
