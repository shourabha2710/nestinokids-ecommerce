import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool

from alembic import context

# Add backend directory to sys.path so that `app` can be imported
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import Base and all models so they register with Base.metadata
from app.db.database import Base
from app.models.models import (
    User,
    Product,
    Category,
    ProductImage,
    ProductVariant,
    Inventory,
    Order,
    OrderItem,
    Address,
    Coupon,
    Review,
    Banner,
    InstagramPost,
    InstagramPostClick,
    SiteSettings,
    CustomerReview,
    HeroSlide,
    wishlist_association,
    cart_association,
    # Phase 7 models
    RecentlyViewed,
    LoyaltyTransaction,
    # Phase 8 models
    OrderTrackingEvent,
    SupportTicket,
    FAQ,
    AnnouncementBar,
    Notification,
    AuditLog,
    StoreSetting,
)

# Import settings for database URL
from app.core.config import settings

# This is the Alembic Config object
config = context.config

# Set up Python logging from the config file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point to our existing metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_engine(settings.DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
