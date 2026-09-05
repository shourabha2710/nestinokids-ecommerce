"""add auth lockout fields to users

Revision ID: b0c1d2e3f4a5
Revises: a7f3e9d1c2b4
Create Date: 2026-09-05

Adds account-level brute-force protection fields to the users table:

- failed_login_attempts : consecutive failed login counter (default 0)
- locked_until          : timestamp until which the account is locked (NULL = not locked)
"""
from alembic import op
import sqlalchemy as sa

revision = 'b0c1d2e3f4a5'
down_revision = 'a7f3e9d1c2b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')