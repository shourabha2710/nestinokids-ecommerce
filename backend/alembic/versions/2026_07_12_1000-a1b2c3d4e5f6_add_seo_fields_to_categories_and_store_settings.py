"""add_seo_fields_to_categories_and_store_settings

Revision ID: a1b2c3d4e5f6
Revises: 3a4b5c6d7e8f
Create Date: 2026-07-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3a4b5c6d7e8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('meta_title', sa.String(length=255), nullable=True))
    op.add_column('categories', sa.Column('meta_description', sa.String(length=500), nullable=True))
    op.add_column('categories', sa.Column('meta_keywords', sa.String(length=500), nullable=True))

    op.add_column('store_settings', sa.Column('default_meta_title', sa.String(length=255), nullable=True))
    op.add_column('store_settings', sa.Column('default_meta_description', sa.String(length=500), nullable=True))
    op.add_column('store_settings', sa.Column('default_meta_keywords', sa.String(length=500), nullable=True))
    op.add_column('store_settings', sa.Column('default_og_image', sa.String(length=500), nullable=True))
    op.add_column('store_settings', sa.Column('default_canonical_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('store_settings', 'default_canonical_url')
    op.drop_column('store_settings', 'default_og_image')
    op.drop_column('store_settings', 'default_meta_keywords')
    op.drop_column('store_settings', 'default_meta_description')
    op.drop_column('store_settings', 'default_meta_title')

    op.drop_column('categories', 'meta_keywords')
    op.drop_column('categories', 'meta_description')
    op.drop_column('categories', 'meta_title')
