import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/lib/AdminAuthContext';
import Unauthorized from '@/pages/admin/Unauthorized';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }) {
  const { adminUser, isLoadingAdminAuth, isAdminAuthenticated } = useAdminAuth();

  if (isLoadingAdminAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdminAuthenticated || !adminUser) {
    return <Navigate to="/admin-login" replace />;
  }

  if (adminUser.role !== 'admin') {
    return <Unauthorized />;
  }

  return children;
}
