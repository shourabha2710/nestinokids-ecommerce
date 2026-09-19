"""add tax schema foundation

Revision ID: d2e3f4a5b6c7
Revises: 9f8e7d6c5b4a
Create Date: 2026-09-14

G4.1 - GST / tax schema foundation. ADDITIVE ONLY and backward-compatible.

The engine still runs tax-exempt (``tax_amount`` unchanged, ``tax_enabled``
untouched): this migration only lays the structural foundation a future GST
phase needs. No GST is calculated, enabled, backfilled or assumed here.

- ``orders``:        8 nullable tax/snapshot columns (taxable_amount,
                     cgst/sgst/igst_amount, tax_type default "none",
                     place_of_supply, seller_state, invoice_number). Existing
                     rows stay NULL; nothing writes them yet.
- ``order_items``:   8 nullable order-time snapshots (hsn_code, tax_rate,
                     taxable_value, cgst/sgst/igst_amount, product_name,
                     sku). Immutable copies so historical invoices survive
                     product edits.
- ``products``:      nullable hsn_code + gst_rate (no rates assumed).
- ``categories``:    nullable hsn_code + gst_rate (fallback config only).
- ``store_settings``: nullable seller_state (seller's origin state).
- ``invoices``:      minimal foundation table. One invoice per order
                     (``order_id`` UNIQUE), ``invoice_number`` UNIQUE for a
                     future numbering phase. No numbering logic/PDF/API yet;
                     rows are intentionally never created in G4.1.

Stability: the four known out-of-scope index drifts (media assets timestamps /
file_type / folder, promotion_rules promotion_id) are NOT touched. No existing
committed migration is modified. Fully reversible.

Environment note: the local dev database already contains a manually created,
empty ``invoices`` table identical to the specification below (same columns and
same ``uq_invoice_order_id``/``uq_invoice_number`` constraints). The ``invoices``
create is therefore guarded with an existence check - matching the guarded-DDL
precedent used by other project migrations - so the migration is deterministic
on both a blank schema and this dev database.
"""
from alembic import op
import sqlalchemy as sa

revision = 'd2e3f4a5b6c7'
down_revision = '9f8e7d6c5b4a'
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    bind = op.get_bind()
    return sa.inspect(bind).has_table(name)


def upgrade() -> None:
    # Orders: tax snapshot columns (additive, nullable)
    op.add_column('orders', sa.Column('taxable_amount', sa.Float(), nullable=True))
    op.add_column('orders', sa.Column('cgst_amount', sa.Float(), nullable=True))
    op.add_column('orders', sa.Column('sgst_amount', sa.Float(), nullable=True))
    op.add_column('orders', sa.Column('igst_amount', sa.Float(), nullable=True))
    op.add_column('orders', sa.Column('tax_type', sa.String(length=20), nullable=True))
    op.add_column('orders', sa.Column('place_of_supply', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('seller_state', sa.String(length=100), nullable=True))
    op.add_column('orders', sa.Column('invoice_number', sa.String(length=50), nullable=True))

    # Order items: tax + product snapshots (additive, nullable)
    op.add_column('order_items', sa.Column('hsn_code', sa.String(length=8), nullable=True))
    op.add_column('order_items', sa.Column('tax_rate', sa.Float(), nullable=True))
    op.add_column('order_items', sa.Column('taxable_value', sa.Float(), nullable=True))
    op.add_column('order_items', sa.Column('cgst_amount', sa.Float(), nullable=True))
    op.add_column('order_items', sa.Column('sgst_amount', sa.Float(), nullable=True))
    op.add_column('order_items', sa.Column('igst_amount', sa.Float(), nullable=True))
    op.add_column('order_items', sa.Column('product_name', sa.String(length=255), nullable=True))
    op.add_column('order_items', sa.Column('sku', sa.String(length=100), nullable=True))

    # Products / categories: per-entity tax config (additive, nullable)
    op.add_column('products', sa.Column('hsn_code', sa.String(length=8), nullable=True))
    op.add_column('products', sa.Column('gst_rate', sa.Float(), nullable=True))
    op.add_column('categories', sa.Column('hsn_code', sa.String(length=8), nullable=True))
    op.add_column('categories', sa.Column('gst_rate', sa.Float(), nullable=True))

    # Store settings: seller state (additive, nullable)
    op.add_column('store_settings', sa.Column('seller_state', sa.String(length=100), nullable=True))

    # Invoices: minimal foundation table.
    # Guarded: local dev DB already has an empty table with this exact shape.
    if not _table_exists('invoices'):
        op.create_table(
            'invoices',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id'), nullable=False),
            sa.Column('invoice_number', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('order_id', name='uq_invoice_order_id'),
            sa.UniqueConstraint('invoice_number', name='uq_invoice_number'),
        )


def downgrade() -> None:
    if _table_exists('invoices'):
        op.drop_table('invoices')
    op.drop_column('store_settings', 'seller_state')
    op.drop_column('categories', 'gst_rate')
    op.drop_column('categories', 'hsn_code')
    op.drop_column('products', 'gst_rate')
    op.drop_column('products', 'hsn_code')
    op.drop_column('order_items', 'sku')
    op.drop_column('order_items', 'product_name')
    op.drop_column('order_items', 'igst_amount')
    op.drop_column('order_items', 'sgst_amount')
    op.drop_column('order_items', 'cgst_amount')
    op.drop_column('order_items', 'taxable_value')
    op.drop_column('order_items', 'tax_rate')
    op.drop_column('order_items', 'hsn_code')
    op.drop_column('orders', 'invoice_number')
    op.drop_column('orders', 'seller_state')
    op.drop_column('orders', 'place_of_supply')
    op.drop_column('orders', 'tax_type')
    op.drop_column('orders', 'igst_amount')
    op.drop_column('orders', 'sgst_amount')
    op.drop_column('orders', 'cgst_amount')
    op.drop_column('orders', 'taxable_amount')