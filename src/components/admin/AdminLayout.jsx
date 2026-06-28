import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminGuard from './AdminGuard';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const syncMobileState = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };

    syncMobileState();
    window.addEventListener('resize', syncMobileState);
    return () => window.removeEventListener('resize', syncMobileState);
  }, []);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-white text-slate-950" dir="rtl">
        <a href="#admin-main-content" className="skip-link">
          דלג לתוכן הניהול
        </a>
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={cn(
          'transition-all duration-300 min-h-screen',
          collapsed ? 'mr-16' : 'mr-0 md:mr-60'
        )} id="admin-main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </AdminGuard>
  );
}
