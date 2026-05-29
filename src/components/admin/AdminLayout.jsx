import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminGuard from './AdminGuard';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={cn(
          'transition-all duration-300 min-h-screen',
          collapsed ? 'mr-16' : 'mr-60'
        )}>
          <Outlet />
        </main>
      </div>
    </AdminGuard>
  );
}