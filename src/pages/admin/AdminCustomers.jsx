import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Search, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');

  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => base44.entities.User.list('-created_date', 500) });
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: () => base44.entities.Order.list('-created_date', 500) });

  const getOrderCount = (userId) => orders.filter((order) => order.created_by_id === userId).length;
  const getTotalSpent = (userId) => orders.filter((order) => order.created_by_id === userId && order.status !== 'cancelled').reduce((sum, order) => sum + (order.total || 0), 0);

  const filtered = users.filter((user) => !search || user.full_name?.includes(search) || user.email?.includes(search));

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight">ניהול לקוחות</h1>
        <p className="mt-1 text-sm text-slate-500">{users.length} לקוחות רשומים</p>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש לקוח..." className="border-slate-200 bg-white pr-10 text-slate-950 placeholder:text-slate-400" />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-right font-semibold">לקוח</th>
                <th className="px-5 py-3 text-right font-semibold">אימייל</th>
                <th className="px-5 py-3 text-right font-semibold">הזמנות</th>
                <th className="px-5 py-3 text-right font-semibold">סך קניות</th>
                <th className="px-5 py-3 text-right font-semibold">הצטרף</th>
                <th className="px-5 py-3 text-right font-semibold">תפקיד</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                        {user.full_name?.[0] || user.email?.[0] || '?'}
                      </div>
                      <p className="font-semibold text-slate-950">{user.full_name || '-'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{user.email}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <ShoppingBag className="h-4 w-4 text-slate-400" />
                      {getOrderCount(user.id)}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold text-blue-700">₪{getTotalSpent(user.id).toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-500">{format(new Date(user.created_date), 'dd/MM/yyyy')}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {user.role === 'admin' ? 'מנהל' : 'לקוח'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-16 text-center text-sm text-slate-500">לא נמצאו לקוחות</div>}
      </div>
    </div>
  );
}
