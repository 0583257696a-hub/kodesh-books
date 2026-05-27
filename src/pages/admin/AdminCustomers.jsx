import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Search, User, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');

  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => base44.entities.User.list('-created_date', 500) });
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: () => base44.entities.Order.list('-created_date', 500) });

  const getOrderCount = (userId) => orders.filter(o => o.created_by_id === userId).length;
  const getTotalSpent = (userId) => orders.filter(o => o.created_by_id === userId && o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);

  const filtered = users.filter(u =>
    !search || u.full_name?.includes(search) || u.email?.includes(search)
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-white">ניהול לקוחות</h1>
        <p className="text-zinc-500 font-body text-sm mt-1">{users.length} לקוחות רשומים</p>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לקוח..." className="bg-[#13131a] border-white/10 text-white pr-10 font-body placeholder:text-zinc-600" />
      </div>

      <div className="bg-[#13131a] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">לקוח</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">אימייל</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">הזמנות</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">סה״כ קניות</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">הצטרף</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">תפקיד</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                      {u.full_name?.[0] || u.email?.[0] || '?'}
                    </div>
                    <p className="text-white font-medium">{u.full_name || '—'}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                    {getOrderCount(u.id)}
                  </div>
                </td>
                <td className="px-6 py-4 text-gold font-bold">₪{getTotalSpent(u.id).toLocaleString()}</td>
                <td className="px-6 py-4 text-zinc-500">{format(new Date(u.created_date), 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-gold/10 text-gold' : 'bg-white/5 text-zinc-400'}`}>
                    {u.role === 'admin' ? 'מנהל' : 'לקוח'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-16 text-zinc-600 font-body">לא נמצאו לקוחות</div>}
      </div>
    </div>
  );
}