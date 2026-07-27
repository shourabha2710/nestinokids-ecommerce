"""Add loyalty accounts, tiers, and expanded loyalty transactions.

Revision ID: f9a0b1c2d3e4
Revises: e3f4a5b6c7d8
Create Date: 2026-07-27 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'f9a0b1c2d3e4'
down_revision = 'e3f4a5b6c7d8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create loyalty_accounts table
    op.create_table(
        'loyalty_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), unique=True, nullable=False),
        sa.Column('current_points', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('lifetime_earned', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('lifetime_redeemed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('current_tier', sa.Enum('bronze', 'silver', 'gold', 'platinum', name='loyaltytierenum'), server_default='bronze'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_loyalty_account_user', 'loyalty_accounts', ['user_id'])

    # Extend loyalty_transactions table
    op.add_column('loyalty_transactions', sa.Column('loyalty_account_id', sa.Integer(), sa.ForeignKey('loyalty_accounts.id'), nullable=False))
    op.add_column('loyalty_transactions', sa.Column('balance_after', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('loyalty_transactions', sa.Column('reference_type', sa.String(50), nullable=True))
    op.add_column('loyalty_transactions', sa.Column('reference_id', sa.Integer(), nullable=True))
    op.add_column('loyalty_transactions', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))

    # Migrate existing transactions: create loyalty_accounts for each user with transactions
    op.execute("""
        INSERT INTO loyalty_accounts (user_id, current_points, lifetime_earned, lifetime_redeemed, current_tier)
        SELECT
            lt.user_id,
            GREATEST(
                COALESCE(SUM(CASE WHEN lt.points > 0 THEN lt.points ELSE 0 END), 0)
                - COALESCE(SUM(CASE WHEN lt.points < 0 THEN ABS(lt.points) ELSE 0 END), 0),
                0
            ) as current_points,
            COALESCE(SUM(CASE WHEN lt.points > 0 THEN lt.points ELSE 0 END), 0) as lifetime_earned,
            COALESCE(SUM(CASE WHEN lt.points < 0 THEN ABS(lt.points) ELSE 0 END), 0) as lifetime_redeemed,
            'bronze' as current_tier
        FROM loyalty_transactions lt
        GROUP BY lt.user_id
        ON CONFLICT (user_id) DO NOTHING;
    """)

    # Map transaction_type strings to new enum values
    op.execute("""
        UPDATE loyalty_transactions
        SET transaction_type = 'earn'
        WHERE transaction_type IN ('earned', 'signup_bonus', 'referral_bonus');
    """)
    op.execute("""
        UPDATE loyalty_transactions
        SET transaction_type = 'redeem'
        WHERE transaction_type = 'redeemed';
    """)
    op.execute("""
        UPDATE loyalty_transactions
        SET transaction_type = 'adjustment'
        WHERE transaction_type = 'admin_adjustment';
    """)

    # Set loyalty_account_id for existing transactions
    op.execute("""
        UPDATE loyalty_transactions lt
        SET loyalty_account_id = la.id
        FROM loyalty_accounts la
        WHERE la.user_id = lt.user_id;
    """)

    # Create new enum type and replace old string column
    op.execute("ALTER TABLE loyalty_transactions ALTER COLUMN transaction_type TYPE loyaltytransactiontypeenum USING transaction_type::loyaltytransactiontypeenum")

    # Drop old indexes, create new ones
    op.drop_index('idx_loyalty_user', table_name='loyalty_transactions')
    op.drop_index('idx_loyalty_order', table_name='loyalty_transactions')
    op.create_index('idx_loyalty_tx_user', 'loyalty_transactions', ['user_id'])
    op.create_index('idx_loyalty_tx_account', 'loyalty_transactions', ['loyalty_account_id'])
    op.create_index('idx_loyalty_tx_order', 'loyalty_transactions', ['order_id'])
    op.create_index('idx_loyalty_tx_type', 'loyalty_transactions', ['transaction_type'])


def downgrade() -> None:
    op.drop_table('loyalty_accounts')
    op.execute("ALTER TABLE loyalty_transactions ALTER COLUMN transaction_type TYPE VARCHAR(30) USING transaction_type::VARCHAR(30)")
    op.drop_column('loyalty_transactions', 'expires_at')
    op.drop_column('loyalty_transactions', 'reference_id')
    op.drop_column('loyalty_transactions', 'reference_type')
    op.drop_column('loyalty_transactions', 'balance_after')
    op.drop_column('loyalty_transactions', 'loyalty_account_id')
