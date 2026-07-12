import { Permissions } from './permissions';

const ALL_PERMISSIONS = Object.values(Permissions);

export const Roles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPPORT: 'support',
  INVENTORY_MANAGER: 'inventory_manager',
  MODERATOR: 'moderator',
  USER: 'user',
};

export const ROLE_PERMISSIONS = {
  [Roles.SUPER_ADMIN]: ALL_PERMISSIONS,
  [Roles.ADMIN]: ALL_PERMISSIONS,
  [Roles.MANAGER]: [
    Permissions.MEDIA_VIEW,
    Permissions.MEDIA_MANAGE,
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
  ],
  [Roles.SUPPORT]: [
    Permissions.ORDER_VIEW,
    Permissions.SUPPORT_VIEW,
    Permissions.SUPPORT_REPLY,
  ],
  [Roles.INVENTORY_MANAGER]: [
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_UPDATE,
  ],
  [Roles.MODERATOR]: [
    Permissions.ORDER_VIEW,
    Permissions.SUPPORT_VIEW,
    Permissions.SUPPORT_REPLY,
  ],
  [Roles.USER]: [],
};

export const ADMIN_ROLES = [
  Roles.SUPER_ADMIN,
  Roles.ADMIN,
  Roles.MANAGER,
  Roles.SUPPORT,
  Roles.INVENTORY_MANAGER,
  Roles.MODERATOR,
];
