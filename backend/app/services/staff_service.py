from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import User, RoleEnum
from app.core.security import hash_password
from app.schemas.schemas import StaffCreateRequest, StaffUpdateRequest, StaffPasswordResetRequest


STAFF_ROLES = [
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
    RoleEnum.SUPPORT,
    RoleEnum.INVENTORY_MANAGER,
]

ALLOWED_CREATE_ROLES = [
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
    RoleEnum.SUPPORT,
    RoleEnum.INVENTORY_MANAGER,
]


def get_staff_users(db: Session) -> list[User]:
    role_values = [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.SUPPORT, RoleEnum.INVENTORY_MANAGER, RoleEnum.MODERATOR]
    return (
        db.query(User)
        .filter(User.role.in_(role_values))
        .order_by(User.created_at.desc())
        .all()
    )


def create_staff(db: Session, data: StaffCreateRequest, current_user: User) -> User:
    if data.role not in ALLOWED_CREATE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create user with role '{data.role}'. Allowed: {[r.value for r in ALLOWED_CREATE_ROLES]}",
        )

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    role_enum = RoleEnum(data.role)

    user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        hashed_password=hash_password(data.password),
        role=role_enum,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_staff(db: Session, user_id: int, data: StaffUpdateRequest, current_user: User) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")

    if user.role == RoleEnum.SUPER_ADMIN and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SUPER_ADMIN can modify another SUPER_ADMIN",
        )

    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.role is not None:
        if current_user.role != RoleEnum.SUPER_ADMIN and user.role == RoleEnum.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only SUPER_ADMIN can change the role of a SUPER_ADMIN",
            )
        user.role = RoleEnum(data.role)
    if data.is_active is not None:
        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot change your own active status",
            )
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)
    return user


def deactivate_staff(db: Session, user_id: int, current_user: User) -> User:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate yourself",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")

    if user.role == RoleEnum.SUPER_ADMIN and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SUPER_ADMIN can deactivate a SUPER_ADMIN",
        )

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


def reset_password(db: Session, user_id: int, data: StaffPasswordResetRequest, current_user: User) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")

    if user.role == RoleEnum.SUPER_ADMIN and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SUPER_ADMIN can reset the password of a SUPER_ADMIN",
        )

    user.hashed_password = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return user
