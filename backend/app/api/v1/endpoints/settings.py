from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import StoreSettingResponse, StoreSettingUpdate
from app.api.v1.endpoints.auth import get_current_user
from app.core.rbac import require_permission
from app.core.permissions import Permissions
from app.core.constants import AuditAction, AuditEntityType
from app.services.audit_service import audit_service
from app.services.settings_service import get_settings, update_settings

router = APIRouter(prefix="/api/v1/admin", tags=["admin-settings"])


@router.get("/settings", response_model=StoreSettingResponse)
def get_admin_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.SETTINGS_MANAGE)),
):
    return get_settings(db)


@router.put("/settings", response_model=StoreSettingResponse)
def update_admin_settings(
    data: StoreSettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permissions.SETTINGS_MANAGE)),
):
    old_settings = get_settings(db)
    old_values = {
        "store_name": old_settings.store_name,
        "store_email": old_settings.store_email,
        "store_phone": old_settings.store_phone,
        "store_address": old_settings.store_address,
        "logo_url": old_settings.logo_url,
        "favicon_url": old_settings.favicon_url,
        "currency": old_settings.currency,
        "timezone": old_settings.timezone,
        "gst_number": old_settings.gst_number,
        "tax_enabled": old_settings.tax_enabled,
        "tax_percentage": old_settings.tax_percentage,
        "free_shipping_enabled": old_settings.free_shipping_enabled,
        "free_shipping_min": old_settings.free_shipping_min,
        "cod_enabled": old_settings.cod_enabled,
        "online_payment_enabled": old_settings.online_payment_enabled,
        "maintenance_mode": old_settings.maintenance_mode,
    }

    update_data = data.model_dump(exclude_unset=True)
    updated = update_settings(db, update_data)

    new_values = {
        "store_name": updated.store_name,
        "store_email": updated.store_email,
        "store_phone": updated.store_phone,
        "store_address": updated.store_address,
        "logo_url": updated.logo_url,
        "favicon_url": updated.favicon_url,
        "currency": updated.currency,
        "timezone": updated.timezone,
        "gst_number": updated.gst_number,
        "tax_enabled": updated.tax_enabled,
        "tax_percentage": updated.tax_percentage,
        "free_shipping_enabled": updated.free_shipping_enabled,
        "free_shipping_min": updated.free_shipping_min,
        "cod_enabled": updated.cod_enabled,
        "online_payment_enabled": updated.online_payment_enabled,
        "maintenance_mode": updated.maintenance_mode,
    }

    audit_service.create_log(
        db=db,
        user=current_user,
        action=AuditAction.UPDATE,
        entity_type=AuditEntityType.SETTINGS,
        description="Store settings updated",
        old_values=old_values,
        new_values=new_values,
        request=request,
    )

    return updated
