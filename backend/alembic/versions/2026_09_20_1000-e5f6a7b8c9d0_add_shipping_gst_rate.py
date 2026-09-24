"""add shipping gst rate to store settings

Revision ID: e5f6a7b8c9d0
Revises: d2e3f4a5b6c7
Create Date: 2026-09-20

G4.2 - SHIPPING OPTION A. One reversible, additive migration.

Adds a single nullable ``shipping_gst_rate`` column to ``store_settings``
(percent value, e.g. 18.0 = 18%). Nothing is backfilled and no GST is assumed:
shipping GST is only ever computed when the store master switch
(``store_settings.tax_enabled``) is ON, a shipping charge is actually applied,
and this rate is explicitly configured by the admin.

Legacy ``store_settings.tax_percentage`` is intentionally untouched (G4.2
does not reuse it). The four known out-of-scope index drifts are not touched.
Fully reversible; keeps the migration chain linear (single head).
"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd2e3f4a5b6c7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Store settings: shipping GST rate (additive, nullable, no backfill)
    op.add_column(
        'store_settings',
        sa.Column('shipping_gst_rate', sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('store_settings', 'shipping_gst_rate')