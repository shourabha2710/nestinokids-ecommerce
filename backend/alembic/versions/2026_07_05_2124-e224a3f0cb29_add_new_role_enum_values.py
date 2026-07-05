"""add new role enum values

Revision ID: e224a3f0cb29
Revises: 8cc488df4d2f
Create Date: 2026-07-05 21:24:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e224a3f0cb29'
down_revision: Union[str, None] = '8cc488df4d2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'super_admin'")
    op.execute("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'manager'")
    op.execute("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'support'")
    op.execute("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'inventory_manager'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an ENUM type.
    # The new values will remain in the type but will not be used.
    pass
