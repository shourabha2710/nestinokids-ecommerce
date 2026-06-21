import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated && !token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Admin users should not access storefront protected routes
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
