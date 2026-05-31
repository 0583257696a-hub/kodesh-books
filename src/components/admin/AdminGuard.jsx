import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import Unauthorized from '@/pages/admin/Unauthorized';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    window.location.href = '/admin-login';
    return null;
  }

  if (user.role !== 'admin') {
    return <Unauthorized />;
  }

  return children;
}
