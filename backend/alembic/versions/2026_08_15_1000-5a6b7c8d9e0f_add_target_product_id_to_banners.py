"""Add target_product_id to banners

Revision ID: 5a6b7c8d9e0f
Revises: 1a2b3c4d5e6f
Create Date: 2026-08-15 10:00:00.000000

Adds a nullable ``target_product_id`` column to ``banners`` so a homepage
banner can link the entire banner image to a product detail page. The FK uses
``ON DELETE SET NULL`` so deleting a product never breaks the banner system.
Written idempotently against partially-created databases (mirrors the
marketplace commerce bridge migration conventions).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = '5a6b7c8d9e0f'
down_revision: Union[str, None] = '1a2b3c4d5e6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── Inspection helpers ──────────────────────────────────────────────────────


def _table_exists(bind, table_name: str) -> bool:
    return table_name in inspect(bind).get_table_names()


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    if not _table_exists(bind, table_name):
        return False
    columns = {c["name"] for c in inspect(bind).get_columns(table_name)}
    return column_name in columns


def _index_exists(bind, table_name: str, index_name: str) -> bool:
    if not _table_exists(bind, table_name):
        return False
    inspector = inspect(bind)
    names = {i["name"] for i in inspector.get_indexes(table_name)}
    names.update({uc["name"] for uc in inspector.get_unique_constraints(table_name)})
    names.discard(None)
    return index_name in names


def _fk_exists(bind, table_name: str, constrained_columns, referred_table: str) -> bool:
    if not _table_exists(bind, table_name):
        return False
    expected = list(constrained_columns)
    for fk in inspect(bind).get_foreign_keys(table_name):
        if (
            fk.get("constrained_columns") == expected
            and fk.get("referred_table") == referred_table
        ):
            return True
    return False


def _fk_name(bind, table_name: str, constrained_columns, referred_table: str):
    expected = list(constrained_columns)
    for fk in inspect(bind).get_foreign_keys(table_name):
        if (
            fk.get("constrained_columns") == expected
            and fk.get("referred_table") == referred_table
        ):
            return fk.get("name")
    return None


def upgrade() -> None:
    bind = op.get_bind()

    if not _table_exists(bind, 'banners'):
        raise RuntimeError(
            "banners table missing; run the full migration chain from the "
            "baseline before applying this migration."
        )

    # ── 1. Column ───────────────────────────────────────────────────────────
    if not _column_exists(bind, 'banners', 'target_product_id'):
        op.add_column(
            'banners',
            sa.Column('target_product_id', sa.Integer(), nullable=True),
        )

    # ── 2. Index ────────────────────────────────────────────────────────────
    if not _index_exists(bind, 'banners', 'ix_banners_target_product_id'):
        op.create_index(
            'ix_banners_target_product_id', 'banners', ['target_product_id'],
            unique=False,
        )

    # ── 3. Foreign key (ON DELETE SET NULL) ─────────────────────────────────
    if not _fk_exists(bind, 'banners', ['target_product_id'], 'products'):
        op.create_foreign_key(
            'banners_target_product_id_fkey', 'banners', 'products',
            ['target_product_id'], ['id'], ondelete='SET NULL',
        )


def downgrade() -> None:
    bind = op.get_bind()

    if not _table_exists(bind, 'banners'):
        return

    if _index_exists(bind, 'banners', 'ix_banners_target_product_id'):
        op.drop_index('ix_banners_target_product_id', table_name='banners')

    fk_name = _fk_name(bind, 'banners', ['target_product_id'], 'products')
    if fk_name:
        op.drop_constraint(fk_name, 'banners', type_='foreignkey')

    if _column_exists(bind, 'banners', 'target_product_id'):
        op.drop_column('banners', 'target_product_id')
