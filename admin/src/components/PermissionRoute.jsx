import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function PermissionRoute({ permission, children }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

export default PermissionRoute;
