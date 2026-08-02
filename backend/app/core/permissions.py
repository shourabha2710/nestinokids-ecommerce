from app.models.models import RoleEnum


class Permissions:
    PRODUCT_VIEW = "product:view"
    PRODUCT_CREATE = "product:create"
    PRODUCT_UPDATE = "product:update"
    PRODUCT_DELETE = "product:delete"

    ORDER_VIEW = "order:view"
    ORDER_UPDATE = "order:update"

    INVENTORY_VIEW = "inventory:view"
    INVENTORY_UPDATE = "inventory:update"

    USER_VIEW = "user:view"
    USER_MANAGE = "user:manage"

    SUPPORT_VIEW = "support:view"
    SUPPORT_REPLY = "support:reply"

    AUDIT_VIEW = "audit:view"

    SETTINGS_MANAGE = "settings:manage"
    REPORT_VIEW = "report:view"
    MEDIA_VIEW = "media:view"
    MEDIA_MANAGE = "media:manage"

    PROMOTION_VIEW = "promotion:view"
    PROMOTION_CREATE = "promotion:create"
    PROMOTION_UPDATE = "promotion:update"
    PROMOTION_DELETE = "promotion:delete"

    COUPON_VIEW = "coupon:view"
    COUPON_CREATE = "coupon:create"
    COUPON_UPDATE = "coupon:update"
    COUPON_DELETE = "coupon:delete"

    MARKETPLACE_VIEW = "marketplace:view"
    MARKETPLACE_MANAGE = "marketplace:manage"


ALL_PERMISSIONS = [
    getattr(Permissions, attr) for attr in dir(Permissions)
    if not attr.startswith("_")
]

ROLE_PERMISSIONS = {
    RoleEnum.SUPER_ADMIN: ALL_PERMISSIONS,
    RoleEnum.ADMIN: ALL_PERMISSIONS,
    RoleEnum.MANAGER: [
        Permissions.PRODUCT_VIEW,
        Permissions.PRODUCT_CREATE,
        Permissions.PRODUCT_UPDATE,
        Permissions.PRODUCT_DELETE,
        Permissions.ORDER_VIEW,
        Permissions.ORDER_UPDATE,
        Permissions.INVENTORY_VIEW,
        Permissions.INVENTORY_UPDATE,
        Permissions.SUPPORT_VIEW,
        Permissions.SUPPORT_REPLY,
        Permissions.REPORT_VIEW,
        Permissions.MEDIA_VIEW,
        Permissions.MEDIA_MANAGE,
        Permissions.PROMOTION_VIEW,
        Permissions.PROMOTION_CREATE,
        Permissions.PROMOTION_UPDATE,
        Permissions.PROMOTION_DELETE,
        Permissions.COUPON_VIEW,
        Permissions.COUPON_CREATE,
        Permissions.COUPON_UPDATE,
        Permissions.COUPON_DELETE,
        Permissions.MARKETPLACE_VIEW,
        Permissions.MARKETPLACE_MANAGE,
    ],
    RoleEnum.SUPPORT: [
        Permissions.ORDER_VIEW,
        Permissions.USER_VIEW,
        Permissions.SUPPORT_VIEW,
        Permissions.SUPPORT_REPLY,
    ],
    RoleEnum.INVENTORY_MANAGER: [
        Permissions.INVENTORY_VIEW,
        Permissions.INVENTORY_UPDATE,
    ],
    RoleEnum.MODERATOR: [
        Permissions.ORDER_VIEW,
        Permissions.SUPPORT_VIEW,
        Permissions.SUPPORT_REPLY,
    ],
    RoleEnum.USER: [],
}
