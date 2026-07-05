import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_PERMISSIONS } from '../constants/rolePermissions';

export function usePermissions() {
  const { user } = useAuth();

  const userPermissions = useMemo(() => {
    if (!user?.role) return [];
    return ROLE_PERMISSIONS[user.role] || [];
  }, [user?.role]);

  const hasPermission = (permission) => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions) => {
    return permissions.some((p) => userPermissions.includes(p));
  };

  const hasAllPermissions = (permissions) => {
    return permissions.every((p) => userPermissions.includes(p));
  };

  const isRole = (role) => {
    return user?.role === role;
  };

  return {
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
  };
}
