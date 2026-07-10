"""add_media_assets_table

Revision ID: 3a4b5c6d7e8f
Revises: 2646190e694a
Create Date: 2026-07-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3a4b5c6d7e8f'
down_revision: Union[str, None] = '2646190e694a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'media_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('alt_text', sa.String(length=255), nullable=True),
        sa.Column('folder', sa.String(length=100), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_media_folder', 'media_assets', ['folder'])
    op.create_index('idx_media_file_type', 'media_assets', ['file_type'])
    op.create_index('idx_media_created_at', 'media_assets', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_media_created_at', table_name='media_assets')
    op.drop_index('idx_media_file_type', table_name='media_assets')
    op.drop_index('idx_media_folder', table_name='media_assets')
    op.drop_table('media_assets')
