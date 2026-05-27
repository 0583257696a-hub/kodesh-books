import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag,
  Megaphone, Settings, LogOut, ChevronLeft, Ticket, FolderOpen
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'דשבורד', icon: LayoutDashboard, path: '/secret-admin' },
  { label: 'מוצרים', icon: Package, path: '/secret-admin/products' },
  { label: 'קטגוריות', icon: FolderOpen, path: '/secret-admin/categories' },
  { label: 'הזמנות', icon: ShoppingBag, path: '/secret-admin/orders' },
  { label: 'לקוחות', icon: Users, path: '/secret-admin/customers' },
  { label: 'קופונים', icon: Ticket, path: '/secret-admin/coupons' },
  { label: 'ניהול תוכן', icon: Megaphone, path: '/secret-admin/content' },
  { label: 'הגדרות', icon: Settings, path: '/secret-admin/settings' },
];

export default function AdminSidebar({ collapsed, setCollapsed }) {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  return (
    <aside className={cn(
      'fixed top-0 right-0 h-full bg-[#0f0f17] border-l border-white/5 flex flex-col z-40 transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 h-16 border-b border-white/5', collapsed && 'justify-center px-2')}>
        {!collapsed && (
          <div>
            <p className="text-gold font-heading font-bold text-base leading-tight">אוצר הקדושה</p>
            <p className="text-zinc-600 text-xs font-body">Admin Panel</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mr-auto p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 mx-2 rounded-xl mb-0.5 transition-all font-body text-sm',
                active
                  ? 'bg-gold/15 text-gold'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('flex-shrink-0', active ? 'h-5 w-5' : 'h-4 w-4')} />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-gold" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => logout()}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-body text-sm',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'התנתקות' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && 'התנתקות'}
        </button>
      </div>
    </aside>
  );
}