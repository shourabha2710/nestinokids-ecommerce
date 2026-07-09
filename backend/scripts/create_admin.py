"""
One-time admin user bootstrap script.
Creates admin@nestinokids.com if it doesn't already exist.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.database import SessionLocal
from app.models.models import User, RoleEnum
from app.core.security import hash_password


ADMIN_EMAIL = "admin.local@nestinokids.com"
ADMIN_PASSWORD = "Admin@123"
ADMIN_FIRST_NAME = "Admin"
ADMIN_LAST_NAME = "User"


def create_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            existing.role = RoleEnum.ADMIN
            existing.is_active = True
            existing.hashed_password = hash_password(ADMIN_PASSWORD)
            db.commit()
            print(f"OK Admin user updated: {ADMIN_EMAIL}")
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
        print(f"OK Admin user created: {ADMIN_EMAIL}")
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
