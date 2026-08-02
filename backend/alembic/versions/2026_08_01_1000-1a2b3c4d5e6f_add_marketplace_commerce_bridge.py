"""Add marketplace commerce bridge: listings, redirect clicks, feature flags.

Revision ID: 1a2b3c4d5e6f
Revises: f9a0b1c2d3e4
Create Date: 2026-08-01 10:00:00.000000

Schema-only migration, written to be idempotent against partially-created
databases. In local development the app auto-creates new model tables via
``Base.metadata.create_all`` (see app/main.py) before Alembic runs, so the
``marketplace_listings`` / ``marketplace_redirect_clicks`` tables may already
exist with an older shape. This migration:

* never recreates an existing table,
* adds only missing columns on existing tables,
* creates only missing foreign keys and indexes,
* adds the marketplace feature-flag columns to ``store_settings`` only when
  they are absent,
* uses explicit inspection helpers instead of swallowing DDL exceptions.

Marketplace product mappings are intentionally NOT seeded here — they are
created via the Admin/API after this migration succeeds.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '1a2b3c4d5e6f'
down_revision = 'f9a0b1c2d3e4'
branch_labels = None
depends_on = None


# ── Inspection helpers ──────────────────────────────────────────────────────
# Existence checks are structural (SQLAlchemy Inspector + PG metadata) and are
# never used to swallow DDL errors — a genuine CREATE that collides with an
# existing object is still a hard failure.


def _table_exists(bind, table_name: str) -> bool:
    return table_name in inspect(bind).get_table_names()


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    if not _table_exists(bind, table_name):
        return False
    columns = {c["name"] for c in inspect(bind).get_columns(table_name)}
    return column_name in columns


def _index_exists(bind, table_name: str, index_name: str) -> bool:
    """True if the index exists on the table.

    Checks plain indexes (incl. unique/partial) plus unique constraints, which
    PostgreSQL reports separately from the index list.
    """
    if not _table_exists(bind, table_name):
        return False
    inspector = inspect(bind)
    names = {i["name"] for i in inspector.get_indexes(table_name)}
    names.update({uc["name"] for uc in inspector.get_unique_constraints(table_name)})
    names.discard(None)
    return index_name in names


def _constraint_exists(bind, table_name: str, constraint_name: str) -> bool:
    """True if any constraint (PK/FK/unique/check) with this name exists."""
    if not _table_exists(bind, table_name):
        return False
    inspector = inspect(bind)
    names = set()
    pk = inspector.get_pk_constraint(table_name)
    if pk.get("name"):
        names.add(pk["name"])
    names.update(fk.get("name") for fk in inspector.get_foreign_keys(table_name))
    names.update(uc.get("name") for uc in inspector.get_unique_constraints(table_name))
    names.update(cc.get("name") for cc in inspector.get_check_constraints(table_name))
    names.discard(None)
    return constraint_name in names


def _fk_exists(bind, table_name: str, constrained_columns, referred_table: str) -> bool:
    """True if a foreign key matching the given columns/table exists."""
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
    """Return the actual FK constraint name for the matching relationship."""
    expected = list(constrained_columns)
    for fk in inspect(bind).get_foreign_keys(table_name):
        if (
            fk.get("constrained_columns") == expected
            and fk.get("referred_table") == referred_table
        ):
            return fk.get("name")
    return None


# ── Schema definitions ──────────────────────────────────────────────────────
# Single source of truth so CREATE and column-audit paths stay in sync.

LISTING_COLUMNS = [
    sa.Column('id', sa.Integer(), primary_key=True),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('variant_id', sa.Integer(), nullable=True),
    sa.Column('marketplace', sa.String(20), nullable=False),
    sa.Column('external_product_id', sa.String(255), nullable=False),
    sa.Column('external_url', sa.String(2048), nullable=False),
    sa.Column('display_label', sa.String(255), nullable=True),
    sa.Column('allow_variant_fallback', sa.Boolean(),
              nullable=False, server_default=sa.false()),
    sa.Column('is_active', sa.Boolean(),
              nullable=False, server_default=sa.true()),
    sa.Column('priority', sa.Integer(),
              nullable=False, server_default='0'),
    sa.Column('created_at', sa.DateTime(timezone=True),
              server_default=sa.func.now()),
    sa.Column('updated_at', sa.DateTime(timezone=True),
              onupdate=sa.func.now()),
]

CLICK_COLUMNS = [
    sa.Column('id', sa.BigInteger(), primary_key=True),
    sa.Column('marketplace_listing_id', sa.Integer(), nullable=True),
    sa.Column('marketplace', sa.String(20), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('variant_id', sa.Integer(), nullable=True),
    sa.Column('source_page', sa.String(255), nullable=True),
    sa.Column('ip_address', sa.String(45), nullable=True),
    sa.Column('user_agent', sa.String(500), nullable=True),
    sa.Column('clicked_at', sa.DateTime(timezone=True),
              server_default=sa.func.now()),
]

LISTING_INDEXES = [
    ('idx_marketplace_listing_product_active', ['product_id', 'is_active']),
    ('idx_marketplace_listing_marketplace', ['marketplace']),
    ('uq_marketplace_listing_variant',
     ['product_id', 'variant_id', 'marketplace'],
     {'unique': True, 'postgresql_where': sa.text('variant_id IS NOT NULL')}),
    ('uq_marketplace_listing_product_level',
     ['product_id', 'marketplace'],
     {'unique': True, 'postgresql_where': sa.text('variant_id IS NULL')}),
]

CLICK_INDEXES = [
    ('idx_marketplace_click_listing', ['marketplace_listing_id']),
    ('idx_marketplace_click_marketplace_time', ['marketplace', 'clicked_at']),
]

LISTING_FKS = [
    ('product_id', 'products', 'CASCADE'),
    ('variant_id', 'product_variants', 'CASCADE'),
]

CLICK_FKS = [
    ('marketplace_listing_id', 'marketplace_listings', 'SET NULL'),
]

STORE_SETTINGS_FLAGS = [
    ('direct_checkout_enabled', sa.false()),
    ('marketplace_purchase_enabled', sa.true()),
]


def _ensure_table(bind, table_name: str, columns, indexes, fks) -> None:
    """Create the table if missing; otherwise add only missing objects.

    Foreign keys are always created via ``op.create_foreign_key`` (both for a
    fresh table and an existing one) so constraint names are deterministic and
    the column audit path stays identical in every state.
    """
    if not _table_exists(bind, table_name):
        op.create_table(table_name, *columns)
        for local_col, referred_table, ondelete in fks:
            op.create_foreign_key(
                f"{table_name}_{local_col}_fkey", table_name, referred_table,
                [local_col], ["id"], ondelete=ondelete,
            )
        for entry in indexes:
            name, cols = entry[0], entry[1]
            kwargs = entry[2] if len(entry) > 2 else {}
            op.create_index(name, table_name, cols, **kwargs)
        return

    # ── Existing table: add only missing columns ───────────────────────────
    existing = {c["name"] for c in inspect(bind).get_columns(table_name)}
    for col in columns:
        name = col.name
        if name == "id" or name in existing:
            continue
        op.add_column(table_name, col)

    # ── Existing table: add only missing indexes ───────────────────────────
    for entry in indexes:
        name, cols = entry[0], entry[1]
        kwargs = entry[2] if len(entry) > 2 else {}
        if not _index_exists(bind, table_name, name):
            op.create_index(name, table_name, cols, **kwargs)

    # ── Existing table: add only missing foreign keys ──────────────────────
    for local_col, referred_table, ondelete in fks:
        if not _fk_exists(bind, table_name, [local_col], referred_table):
            op.create_foreign_key(
                f"{table_name}_{local_col}_fkey", table_name, referred_table,
                [local_col], ["id"], ondelete=ondelete,
            )


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. marketplace_listings ─────────────────────────────────────────────
    _ensure_table(bind, 'marketplace_listings',
                  LISTING_COLUMNS, LISTING_INDEXES, LISTING_FKS)

    # ── 2. marketplace_redirect_clicks ─────────────────────────────────────
    _ensure_table(bind, 'marketplace_redirect_clicks',
                  CLICK_COLUMNS, CLICK_INDEXES, CLICK_FKS)

    # ── 3. StoreSetting marketplace feature flags ──────────────────────────
    if not _table_exists(bind, 'store_settings'):
        # Defensive: store_settings is created by an earlier migration in the
        # chain, so this should never trigger in normal upgrade flows.
        raise RuntimeError(
            "store_settings table missing; run the full migration chain "
            "from the baseline before applying this migration."
        )
    for column_name, server_default in STORE_SETTINGS_FLAGS:
        if not _column_exists(bind, 'store_settings', column_name):
            op.add_column(
                'store_settings',
                sa.Column(column_name, sa.Boolean(),
                          nullable=False, server_default=server_default),
            )


def downgrade() -> None:
    bind = op.get_bind()

    # ── StoreSettings marketplace columns (independent of marketplace tables)
    if _table_exists(bind, 'store_settings'):
        for column_name, _server_default in STORE_SETTINGS_FLAGS:
            if _column_exists(bind, 'store_settings', column_name):
                op.drop_column('store_settings', column_name)

    # ── marketplace_redirect_clicks (references marketplace_listings) ──────
    if _table_exists(bind, 'marketplace_redirect_clicks'):
        for entry in CLICK_INDEXES:
            name = entry[0]
            if _index_exists(bind, 'marketplace_redirect_clicks', name):
                op.drop_index(name, table_name='marketplace_redirect_clicks')
        fk_name = _fk_name(bind, 'marketplace_redirect_clicks',
                           ['marketplace_listing_id'], 'marketplace_listings')
        if fk_name:
            op.drop_constraint(fk_name, 'marketplace_redirect_clicks',
                               type_='foreignkey')
        op.drop_table('marketplace_redirect_clicks')

    # ── marketplace_listings ───────────────────────────────────────────────
    if _table_exists(bind, 'marketplace_listings'):
        for entry in LISTING_INDEXES:
            name = entry[0]
            if _index_exists(bind, 'marketplace_listings', name):
                op.drop_index(name, table_name='marketplace_listings')
        for local_col, referred_table, _ondelete in LISTING_FKS:
            fk_name = _fk_name(bind, 'marketplace_listings',
                               [local_col], referred_table)
            if fk_name:
                op.drop_constraint(fk_name, 'marketplace_listings',
                                   type_='foreignkey')
        op.drop_table('marketplace_listings')
