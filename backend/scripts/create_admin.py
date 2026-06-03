"""
One-time admin user bootstrap script.
Creates admin@nestinokids.com if it doesn't already exist.
"""

from app.db.database import SessionLocal
from app.models.models import User, RoleEnum
from app.core.security import hash_password


ADMIN_EMAIL = "admin@nestinokids.com"
ADMIN_PASSWORD = "Admin@123"
ADMIN_FIRST_NAME = "Admin"
ADMIN_LAST_NAME = "User"


def create_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            if existing.role == RoleEnum.ADMIN:
                print(f"✓ Admin user already exists: {ADMIN_EMAIL}")
                return
            existing.role = RoleEnum.ADMIN
            db.add(existing)
            db.commit()
            print(f"✓ Existing user '{ADMIN_EMAIL}' promoted to ADMIN")
            return

        admin = User(
            email=ADMIN_EMAIL,
            first_name=ADMIN_FIRST_NAME,
            last_name=ADMIN_LAST_NAME,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role=RoleEnum.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"✓ Admin user created: {ADMIN_EMAIL}")
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
