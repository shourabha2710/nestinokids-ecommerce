"""add_audit_logs_table

Revision ID: 8cc488df4d2f
Revises: abcdef123456
Create Date: 2026-07-05 13:26:03.656407

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8cc488df4d2f'
down_revision: Union[str, None] = 'abcdef123456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INTEGER,
            description TEXT,
            old_values JSON,
            new_values JSON,
            ip_address VARCHAR(45),
            user_agent VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON audit_logs (entity_type)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs (user_id)")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_action")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_created_at")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_entity_type")
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_user_id")
    op.execute("DROP INDEX IF EXISTS ix_cart_user_product_nonvariant")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_audit_action")
    op.execute("DROP INDEX IF EXISTS idx_audit_created_at")
    op.execute("DROP INDEX IF EXISTS idx_audit_entity_type")
    op.execute("DROP INDEX IF EXISTS idx_audit_user_id")
    op.execute("DROP TABLE IF EXISTS audit_logs CASCADE")
    op.create_index('ix_cart_user_product_nonvariant', 'cart_association', ['user_id', 'product_id'], unique=True, postgresql_where='(variant_id IS NULL)')
