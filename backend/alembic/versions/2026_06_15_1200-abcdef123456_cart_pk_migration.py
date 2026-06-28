"""cart_pk_migration: add id PK to cart_association

Revision ID: abcdef123456
Revises: 4994db470446
Create Date: 2026-06-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abcdef123456'
down_revision: Union[str, None] = '4994db470446'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add id column as nullable first, then fill, then make PK
    op.add_column('cart_association', sa.Column('id', sa.Integer()))

    # Create sequence for id values
    op.execute("CREATE SEQUENCE cart_association_id_seq")
    op.execute("UPDATE cart_association SET id = nextval('cart_association_id_seq')")
    op.execute("ALTER SEQUENCE cart_association_id_seq OWNED BY cart_association.id")

    # Make id NOT NULL
    op.alter_column('cart_association', 'id', nullable=False)

    # Drop old composite primary key
    op.execute('ALTER TABLE cart_association DROP CONSTRAINT cart_association_pkey')

    # Create new primary key on id
    op.create_primary_key('cart_association_pkey', 'cart_association', ['id'])

    # Set default for id to use sequence
    op.alter_column('cart_association', 'id',
                    server_default=sa.text("nextval('cart_association_id_seq')"))

    # Create unique index to prevent duplicate non-variant entries
    op.create_index('ix_cart_user_product_nonvariant', 'cart_association',
                    ['user_id', 'product_id'],
                    postgresql_where=sa.text('variant_id IS NULL'),
                    unique=True)


def downgrade() -> None:
    # Remove the unique partial index
    op.drop_index('ix_cart_user_product_nonvariant', table_name='cart_association')

    # Remove id default
    op.alter_column('cart_association', 'id', server_default=None)

    # Drop new PK
    op.execute('ALTER TABLE cart_association DROP CONSTRAINT cart_association_pkey')

    # Restore old composite PK
    op.create_primary_key('cart_association_pkey', 'cart_association', ['user_id', 'product_id'])

    # Remove id column (PostgreSQL will also drop the owned sequence)
    op.drop_column('cart_association', 'id')
