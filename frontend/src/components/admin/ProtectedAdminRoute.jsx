import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedAdminRoute = () => {
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);

  if (!isAuthenticated && !token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;
