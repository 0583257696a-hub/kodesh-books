import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAdminUser, loginAdmin, logoutAdmin } from '@/services/adminAuthService';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [isLoadingAdminAuth, setIsLoadingAdminAuth] = useState(true);

  const refreshAdminAuth = useCallback(async () => {
    setIsLoadingAdminAuth(true);
    try {
      const user = await getAdminUser();
      setAdminUser(user);
      return user;
    } catch {
      setAdminUser(null);
      return null;
    } finally {
      setIsLoadingAdminAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshAdminAuth();
  }, [refreshAdminAuth]);

  const login = useCallback(async (email, password) => {
    const user = await loginAdmin(email, password);
    setAdminUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      setAdminUser(null);
      window.location.href = '/admin-login';
    }
  }, []);

  const value = useMemo(() => ({
    adminUser,
    isAdminAuthenticated: Boolean(adminUser),
    isLoadingAdminAuth,
    login,
    logout,
    refreshAdminAuth,
  }), [adminUser, isLoadingAdminAuth, login, logout, refreshAdminAuth]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
