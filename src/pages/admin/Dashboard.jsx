import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ShoppingBag, Package, Users, TrendingUp, Clock, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import { format, subDays, startOfMonth, isAfter } from 'date-fns';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-[#13131a] border border-white/5 rounded-2xl p-6">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-3xl font-heading font-bold text-white mb-1">{value}</p>
    <p className="text-zinc-500 font-body text-sm">{label}</p>
    {sub && <p className="text-xs text-zinc-600 mt-1 font-body">{sub}</p>}
  </div>
);

const statusConfig = {
  pending: { label: 'חדש', color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
  confirmed: { label: 'בטיפול', color: 'bg-blue-500/10 text-blue-400', icon: AlertCircle },
  shipped: { label: 'נשלח', color: 'bg-purple-500/10 text-purple-400', icon: Truck },
  delivered: { label: 'הושלם', color: 'bg-green-500/10 text-green-400', icon: CheckCircle2 },
  cancelled: { label: 'בוטל', color: 'bg-red-500/10 text-red-400', icon: AlertCircle },
};

export default function Dashboard() {
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: () => base44.entities.Order.list('-created_date', 500) });
  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: () => base44.entities.Product.list('-created_date', 500) });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => base44.entities.User.list('-created_date', 500) });

  const now = new Date();
  const monthStart = startOfMonth(now);

  const monthlyRevenue = orders
    .filter(o => o.status !== 'cancelled' && isAfter(new Date(o.created_date), monthStart))
    .reduce((s, o) => s + (o.total || 0), 0);

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);

  // Last 7 days chart data
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(now, 6 - i);
    const dayStr = format(day, 'dd/MM');
    const dayOrders = orders.filter(o => format(new Date(o.created_date), 'dd/MM') === dayStr && o.status !== 'cancelled');
    return { date: dayStr, מכירות: dayOrders.reduce((s, o) => s + (o.total || 0), 0), הזמנות: dayOrders.length };
  });

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-white">דשבורד</h1>
        <p className="text-zinc-500 font-body text-sm mt-1">{format(now, 'dd/MM/yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={TrendingUp} label="הכנסות החודש" value={`₪${monthlyRevenue.toLocaleString()}`} color="bg-gold/10 text-gold" />
        <StatCard icon={ShoppingBag} label="סה״כ הזמנות" value={orders.length} sub={`${orders.filter(o=>o.status==='pending').length} ממתינות`} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={Package} label="מוצרים פעילים" value={products.filter(p => p.in_stock).length} sub={`${products.length} סה״כ`} color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={Users} label="לקוחות" value={users.length} color="bg-green-500/10 text-green-400" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#13131a] border border-white/5 rounded-2xl p-6">
          <h2 className="font-heading font-bold text-white mb-6">מכירות — 7 ימים אחרונים</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1c1c28', border: '1px solid #ffffff10', borderRadius: 8, color: '#fff', fontFamily: 'Assistant' }} />
              <Area type="monotone" dataKey="מכירות" stroke="#D4AF37" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#13131a] border border-white/5 rounded-2xl p-6">
          <h2 className="font-heading font-bold text-white mb-6">הזמנות לפי יום</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1c1c28', border: '1px solid #ffffff10', borderRadius: 8, color: '#fff', fontFamily: 'Assistant' }} />
              <Bar dataKey="הזמנות" fill="#D4AF37" opacity={0.8} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-[#13131a] border border-white/5 rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="font-heading font-bold text-white">הזמנות אחרונות</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">לקוח</th>
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">סכום</th>
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">סטטוס</th>
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">תאריך</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => {
                const sc = statusConfig[o.status] || statusConfig.pending;
                return (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{o.customer_name || '—'}</td>
                    <td className="px-6 py-4 text-gold font-bold">₪{o.total}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                        <sc.icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{format(new Date(o.created_date), 'dd/MM/yyyy')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}