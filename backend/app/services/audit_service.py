import logging
from typing import Optional

from fastapi import Request
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.models import AuditLog, User

logger = logging.getLogger(__name__)


class AuditService:

    def create_log(
        self,
        db: Session,
        user: Optional[User],
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        description: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        request: Optional[Request] = None,
    ) -> None:
        try:
            log = AuditLog(
                user_id=user.id if user else None,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                description=description,
                old_values=old_values,
                new_values=new_values,
                ip_address=request.client.host if request and request.client else None,
                user_agent=request.headers.get("user-agent") if request else None,
            )
            db.add(log)
            db.commit()
        except Exception:
            logger.exception("Failed to create audit log: %s %s %s", action, entity_type, entity_id)
            db.rollback()

    def get_logs(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        entity_type: Optional[str] = None,
        action: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> list[AuditLog]:
        query = db.query(AuditLog)

        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if action:
            query = query.filter(AuditLog.action == action)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)

        return (
            query
            .order_by(desc(AuditLog.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )


audit_service = AuditService()
