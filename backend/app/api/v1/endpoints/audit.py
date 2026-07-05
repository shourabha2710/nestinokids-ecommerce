from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.schemas import AuditLogListResponse, AuditLogResponse
from app.services.audit_service import audit_service
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.models.models import User

router = APIRouter(prefix="/api/v1/admin", tags=["admin-audit"])


@router.get("/audit-logs", response_model=AuditLogListResponse)
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: str = Query(None, description="Filter by entity type (PRODUCT, ORDER, etc.)"),
    action: str = Query(None, description="Filter by action (CREATE, UPDATE, DELETE, etc.)"),
    user_id: int = Query(None, ge=1, description="Filter by user ID"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permissions.AUDIT_VIEW)),
):
    logs = audit_service.get_logs(
        db,
        skip=skip,
        limit=limit,
        entity_type=entity_type,
        action=action,
        user_id=user_id,
    )
    total = len(logs)
    log_responses = []
    for log in logs:
        user_name = ""
        user_email = ""
        if log.user:
            user_name = f"{log.user.first_name} {log.user.last_name}".strip()
            user_email = log.user.email
        log_responses.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            user_name=user_name,
            user_email=user_email,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            description=log.description,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            created_at=log.created_at,
        ))
    return AuditLogListResponse(logs=log_responses, total=total)
