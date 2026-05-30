import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Ticket,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/secret-admin' },
  { label: 'Products', icon: Package, path: '/secret-admin/products' },
  { label: 'Categories', icon: FolderOpen, path: '/secret-admin/categories' },
  { label: 'Orders', icon: ShoppingBag, path: '/secret-admin/orders' },
  { label: 'Customers', icon: Users, path: '/secret-admin/customers' },
  { label: 'Sales & Leads', icon: KanbanSquare, path: '/secret-admin/sales-leads' },
  { label: 'Business', icon: BriefcaseBusiness, path: '/secret-admin/business' },
  { label: 'Analytics', icon: BarChart3, path: '/secret-admin/analytics' },
  { label: 'Coupons', icon: Ticket, path: '/secret-admin/coupons' },
  { label: 'Content', icon: Megaphone, path: '/secret-admin/content' },
  { label: 'Settings', icon: Settings, path: '/secret-admin/settings' },
];

export default function AdminSidebar({ collapsed, setCollapsed }) {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  return (
    <aside className={cn(
      'fixed top-0 right-0 z-40 flex h-full flex-col border-l border-slate-200 bg-white shadow-sm transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <div className={cn('flex h-16 items-center gap-3 border-b border-slate-200 px-4', collapsed && 'justify-center px-2')}>
        {!collapsed && (
          <div>
            <p className="font-heading text-base font-bold leading-tight text-blue-700">אוצר הקדושה</p>
            <p className="font-body text-xs text-slate-500">ABD Finance Center</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="mr-auto rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {NAV.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-4 py-3 font-body text-sm transition-all',
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('flex-shrink-0', active ? 'h-5 w-5' : 'h-4 w-4')} />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-blue-600" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={() => logout()}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm text-rose-500 transition-all hover:bg-rose-50 hover:text-rose-700',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
}

