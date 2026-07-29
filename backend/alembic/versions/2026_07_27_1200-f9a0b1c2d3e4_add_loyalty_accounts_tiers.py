"""Add loyalty accounts, tiers, and expanded loyalty transactions.

Revision ID: f9a0b1c2d3e4
Revises: e3f4a5b6c7d8
Create Date: 2026-07-27 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM

revision = 'f9a0b1c2d3e4'
down_revision = 'e3f4a5b6c7d8'
branch_labels = None
depends_on = None

# PostgreSQL enum values — MUST match SQLAlchemy Enum(LoyaltyTierEnum).enums
# which uses the Python enum member NAMES (uppercase), not .value (lowercase).
LOYALTY_TIER_VALUES = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
LOYALTY_TX_TYPE_VALUES = [
    'EARN', 'REDEEM', 'EXPIRE', 'ADJUSTMENT',
    'REFUND', 'REFERRAL_BONUS', 'PROMOTION_BONUS',
]


# ─── helpers ───────────────────────────────────────────────────────────────────

def _enum_exists(bind, enum_name: str) -> bool:
    return bind.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :n"),
        {"n": enum_name},
    ).scalar() is not None


def _table_exists(bind, table_name: str) -> bool:
    return bind.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :n"
        ),
        {"n": table_name},
    ).scalar() is not None


def _index_exists(bind, index_name: str) -> bool:
    return bind.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes "
            "WHERE schemaname = 'public' AND indexname = :n"
        ),
        {"n": index_name},
    ).scalar() is not None


def _column_exists(bind, table: str, column: str) -> bool:
    return bind.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    ).scalar() is not None


def _column_type(bind, table: str, column: str) -> str:
    return bind.execute(
        sa.text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    ).scalar() or ''


# ─── upgrade ───────────────────────────────────────────────────────────────────

def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. Create enum types idempotently ─────────────────────────────────────
    #    Use PG_ENUM.create(checkfirst=True) — same pattern as promotions migration.
    tier_enum = PG_ENUM(
        *LOYALTY_TIER_VALUES,
        name='loyaltytierenum',
        create_type=False,
    )
    tier_enum.create(bind, checkfirst=True)

    tx_type_enum = PG_ENUM(
        *LOYALTY_TX_TYPE_VALUES,
        name='loyaltytransactiontypeenum',
        create_type=False,
    )
    tx_type_enum.create(bind, checkfirst=True)

    # ── 2. Create loyalty_accounts table ───────────────────────────────────────
    if not _table_exists(bind, 'loyalty_accounts'):
        op.create_table(
            'loyalty_accounts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'),
                      unique=True, nullable=False),
            sa.Column('current_points', sa.Integer(), nullable=False,
                      server_default='0'),
            sa.Column('lifetime_earned', sa.Integer(), nullable=False,
                      server_default='0'),
            sa.Column('lifetime_redeemed', sa.Integer(), nullable=False,
                      server_default='0'),
            sa.Column('current_tier', PG_ENUM(
                *LOYALTY_TIER_VALUES,
                name='loyaltytierenum',
                create_type=False,
            ), server_default='BRONZE'),
            sa.Column('created_at', sa.DateTime(timezone=True),
                      server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True),
                      onupdate=sa.func.now()),
        )

    if not _index_exists(bind, 'idx_loyalty_account_user'):
        op.create_index('idx_loyalty_account_user', 'loyalty_accounts', ['user_id'])

    # ── 3. Add columns to loyalty_transactions (nullable, no FK yet) ──────────
    for col_name, col_def in [
        ('loyalty_account_id', sa.Column('loyalty_account_id', sa.Integer())),
        ('balance_after',      sa.Column('balance_after', sa.Integer(),
                                        server_default='0')),
        ('reference_type',     sa.Column('reference_type', sa.String(50))),
        ('reference_id',       sa.Column('reference_id', sa.Integer())),
        ('expires_at',         sa.Column('expires_at',
                                        sa.DateTime(timezone=True))),
    ]:
        if not _column_exists(bind, 'loyalty_transactions', col_name):
            op.add_column('loyalty_transactions', col_def)

    # ── 4. Populate loyalty_accounts from existing transaction data ───────────
    op.execute("""
        INSERT INTO loyalty_accounts
            (user_id, current_points, lifetime_earned, lifetime_redeemed, current_tier)
        SELECT
            lt.user_id,
            GREATEST(
                COALESCE(SUM(CASE WHEN lt.points > 0 THEN lt.points ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN lt.points < 0 THEN ABS(lt.points) ELSE 0 END), 0),
              0
            ),
            COALESCE(SUM(CASE WHEN lt.points > 0 THEN lt.points ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN lt.points < 0 THEN ABS(lt.points) ELSE 0 END), 0),
            'BRONZE'::loyaltytierenum
        FROM loyalty_transactions lt
        GROUP BY lt.user_id
        ON CONFLICT (user_id) DO NOTHING
    """)

    # ── 5. Map transaction_type strings → new enum values ─────────────────────
    #    Strings in DB are lowercase; PostgreSQL enum values are UPPERCASE.
    for old, new in [
        (['earned', 'signup_bonus', 'referral_bonus'], 'EARN'),
        (['redeemed'],                                  'REDEEM'),
        (['admin_adjustment'],                          'ADJUSTMENT'),
    ]:
        binders = ', '.join(f"'{v}'" for v in old)
        op.execute(
            f"UPDATE loyalty_transactions SET transaction_type='{new}' "
            f"WHERE transaction_type IN ({binders})"
        )

    # ── 6. Link transactions → accounts ───────────────────────────────────────
    op.execute("""
        UPDATE loyalty_transactions lt
        SET    loyalty_account_id = la.id
        FROM   loyalty_accounts la
        WHERE  la.user_id = lt.user_id
    """)

    # ── 7. Validate no NULLs remain ───────────────────────────────────────────
    null_count = bind.execute(sa.text(
        "SELECT COUNT(*) FROM loyalty_transactions "
        "WHERE loyalty_account_id IS NULL"
    )).scalar()
    if null_count:
        raise RuntimeError(
            f"Migration aborted: {null_count} loyalty_transactions "
            "still have NULL loyalty_account_id"
        )

    # ── 8. Add FK constraint (column is now fully populated) ──────────────────
    has_fk = bind.execute(sa.text(
        "SELECT 1 FROM information_schema.table_constraints "
        "WHERE table_name='loyalty_transactions' "
        "AND constraint_name='fk_loyalty_tx_account'"
    )).scalar()
    if not has_fk:
        op.create_foreign_key(
            'fk_loyalty_tx_account',
            'loyalty_transactions', 'loyalty_accounts',
            ['loyalty_account_id'], ['id'],
        )

    # ── 9. SET NOT NULL (validated above) ─────────────────────────────────────
    op.execute("ALTER TABLE loyalty_transactions "
               "ALTER COLUMN loyalty_account_id SET NOT NULL")
    op.execute("ALTER TABLE loyalty_transactions "
               "ALTER COLUMN balance_after SET NOT NULL")

    # ── 10. Convert transaction_type column to enum type ──────────────────────
    if _column_type(bind, 'loyalty_transactions', 'transaction_type') == 'character varying':
        op.execute(
            "ALTER TABLE loyalty_transactions "
            "ALTER COLUMN transaction_type TYPE loyaltytransactiontypeenum "
            "USING transaction_type::loyaltytransactiontypeenum"
        )

    # ── 11. Recreate indexes ──────────────────────────────────────────────────
    for old_idx in ['idx_loyalty_user', 'idx_loyalty_order']:
        if _index_exists(bind, old_idx):
            op.drop_index(old_idx, table_name='loyalty_transactions')

    for name, cols in [
        ('idx_loyalty_tx_user',    ['user_id']),
        ('idx_loyalty_tx_account', ['loyalty_account_id']),
        ('idx_loyalty_tx_order',   ['order_id']),
        ('idx_loyalty_tx_type',    ['transaction_type']),
    ]:
        if not _index_exists(bind, name):
            op.create_index(name, 'loyalty_transactions', cols)


# ─── downgrade ─────────────────────────────────────────────────────────────────

def downgrade() -> None:
    bind = op.get_bind()

    # Drop new indexes
    for name in ['idx_loyalty_tx_user', 'idx_loyalty_tx_account',
                 'idx_loyalty_tx_order', 'idx_loyalty_tx_type']:
        if _index_exists(bind, name):
            op.drop_index(name, table_name='loyalty_transactions')

    # Re-create old indexes
    if not _index_exists(bind, 'idx_loyalty_user'):
        op.create_index('idx_loyalty_user', 'loyalty_transactions', ['user_id'])
    if not _index_exists(bind, 'idx_loyalty_order'):
        op.create_index('idx_loyalty_order', 'loyalty_transactions', ['order_id'])

    # Revert transaction_type to VARCHAR
    if _column_type(bind, 'loyalty_transactions', 'transaction_type') != 'character varying':
        op.execute(
            "ALTER TABLE loyalty_transactions "
            "ALTER COLUMN transaction_type TYPE VARCHAR(30) "
            "USING transaction_type::VARCHAR(30)"
        )

    # Drop FK if present
    has_fk = bind.execute(sa.text(
        "SELECT 1 FROM information_schema.table_constraints "
        "WHERE table_name='loyalty_transactions' "
        "AND constraint_name='fk_loyalty_tx_account'"
    )).scalar()
    if has_fk:
        op.drop_constraint('fk_loyalty_tx_account', 'loyalty_transactions',
                           type_='foreignkey')

    # Drop columns that were added in upgrade (each checked individually)
    for col in ['expires_at', 'reference_id', 'reference_type',
                'balance_after', 'loyalty_account_id']:
        if _column_exists(bind, 'loyalty_transactions', col):
            op.drop_column('loyalty_transactions', col)

    # Drop loyalty_accounts
    if _index_exists(bind, 'idx_loyalty_account_user'):
        op.drop_index('idx_loyalty_account_user', table_name='loyalty_accounts')
    if _table_exists(bind, 'loyalty_accounts'):
        op.drop_table('loyalty_accounts')

    # Drop enum types
    for enum_name in ['loyaltytransactiontypeenum', 'loyaltytierenum']:
        if _enum_exists(bind, enum_name):
            bind.execute(sa.text(f"DROP TYPE {enum_name}"))
