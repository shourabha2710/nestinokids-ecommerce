from fastapi import Depends, HTTPException, status
from app.models.models import User, RoleEnum
from app.api.v1.endpoints.auth import get_current_user
from app.core.permissions import ROLE_PERMISSIONS


def has_permission(user: User | RoleEnum, permission: str) -> bool:
    role = user.role if isinstance(user, User) else user
    permissions = ROLE_PERMISSIONS.get(role, [])
    return permission in permissions


def get_user_permissions(user: User | RoleEnum) -> list[str]:
    role = user.role if isinstance(user, User) else user
    return ROLE_PERMISSIONS.get(role, []).copy()


def require_permission(permission: str):
    def dependency(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return dependency
