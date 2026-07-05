import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { ADMIN_ROLES } from '../constants/rolePermissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('adminAccessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.getCurrentUser();
      if (!ADMIN_ROLES.includes(res.data.role)) {
        clearSession();
        setIsLoading(false);
        return;
      }
      setUser(res.data);
      localStorage.setItem('adminUser', JSON.stringify(res.data));
      setIsAuthenticated(true);
    } catch {
      clearSession();
    }
    setIsLoading(false);
  }, [clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    const { access_token, refresh_token, user: userData } = res.data;

    if (!ADMIN_ROLES.includes(userData.role)) {
      throw new Error('Administrator access required');
    }

    localStorage.setItem('adminAccessToken', access_token);
    localStorage.setItem('adminRefreshToken', refresh_token);
    localStorage.setItem('adminUser', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);

    return userData;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
