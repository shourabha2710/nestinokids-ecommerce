from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.schemas import (
    StaffUserResponse,
    StaffCreateRequest,
    StaffUpdateRequest,
    StaffPasswordResetRequest,
)
from app.models.models import User
from app.api.v1.endpoints.auth import get_current_user
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.core.constants import AuditAction, AuditEntityType
from app.services.audit_service import audit_service
from app.services.staff_service import (
    get_staff_users,
    create_staff,
    update_staff,
    deactivate_staff,
    reset_password,
)
from typing import List

router = APIRouter(prefix="/api/v1/admin", tags=["admin-staff"])


@router.get("/staff", response_model=List[StaffUserResponse])
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.USER_VIEW)),
):
    return get_staff_users(db)


@router.post("/staff", response_model=StaffUserResponse, status_code=201)
def create_staff_user(
    data: StaffCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.USER_MANAGE)),
):
    user = create_staff(db, data, current_user)
    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.CREATE,
        entity_type=AuditEntityType.USER,
        entity_id=user.id,
        description=f"Created staff user: {user.email} ({user.role.value})",
        new_values={"email": user.email, "role": user.role.value},
        request=request,
    )
    return user


@router.put("/staff/{user_id}", response_model=StaffUserResponse)
def update_staff_user(
    user_id: int,
    data: StaffUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.USER_MANAGE)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found")

    old_values = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.value,
        "is_active": user.is_active,
    }

    updated = update_staff(db, user_id, data, current_user)

    new_values = {
        "first_name": updated.first_name,
        "last_name": updated.last_name,
        "role": updated.role.value,
        "is_active": updated.is_active,
    }

    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.USER,
        entity_id=updated.id,
        description=f"Updated staff user: {updated.email}",
        old_values=old_values,
        new_values=new_values,
        request=request,
    )
    return updated


@router.patch("/staff/{user_id}/deactivate", response_model=StaffUserResponse)
def deactivate_staff_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.USER_MANAGE)),
):
    user = deactivate_staff(db, user_id, current_user)

    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.USER,
        entity_id=user.id,
        description=f"Deactivated staff user: {user.email}",
        old_values={"is_active": True},
        new_values={"is_active": False},
        request=request,
    )
    return user


@router.patch("/staff/{user_id}/reset-password", response_model=StaffUserResponse)
def reset_staff_password(
    user_id: int,
    data: StaffPasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.USER_MANAGE)),
):
    user = reset_password(db, user_id, data, current_user)

    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.USER,
        entity_id=user.id,
        description=f"Reset password for staff user: {user.email}",
        request=request,
    )
    return user
