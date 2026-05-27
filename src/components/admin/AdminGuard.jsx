import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import Unauthorized from '@/pages/admin/Unauthorized';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
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