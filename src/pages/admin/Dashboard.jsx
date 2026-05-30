import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, startOfMonth, subDays } from 'date-fns';
import { AlertCircle, Bell, CheckCircle2, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { buildAnalytics, buildExpenseRows, buildLeads, businessKpis, currency, safeDate } from '@/lib/businessCenterData';
import { getLocalAnalyticsEvents } from '@/lib/ecommerceTracking';

const q = async (entity, fallback = []) => {
  try {
    return await base44.entities[entity].list('-created_date', 500);
  } catch {
    return fallback;
  }
};

function StatCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data = {} } = useQuery({
    queryKey: ['admin-dashboard-center'],
    queryFn: async () => ({
      orders: await q('Order'),
      products: await q('Product'),
      users: await q('User'),
      leads: await q('Lead'),
      expenses: await q('BusinessExpense'),
      events: [...await q('AnalyticsEvent'), ...getLocalAnalyticsEvents()],
    }),
  });

  const orders = data.orders || [];
  const products = data.products || [];
  const users = data.users || [];
  const leads = useMemo(() => buildLeads(data), [data]);
  const analytics = useMemo(() => buildAnalytics(data), [data]);
  const expenses = buildExpenseRows(data.expenses || []);
  const kpis = businessKpis({ orders, users, leads, expenses });
  const monthStart = startOfMonth(new Date());
  const monthlyOrders = orders.filter((order) => order.status !== 'cancelled' && safeDate(order.created_date) >= monthStart);
  const pendingPayments = orders.filter((order) => order.status === 'pending');
  const bestSeller = [...analytics.productStats].sort((a, b) => b.purchases - a.purchases)[0];

  const revenueChart = Array.from({ length: 10 }).map((_, index) => {
    const day = subDays(new Date(), 9 - index);
    const key = format(day, 'dd/MM');
    const dayOrders = orders.filter((order) => format(safeDate(order.created_date), 'dd/MM') === key && order.status !== 'cancelled');
    return {
      day: key,
      revenue: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      orders: dayOrders.length,
    };
  });

  const expenseChart = expenses.slice(0, 8).map((expense) => ({ name: expense.category, value: Number(expense.amount || 0) }));
  const topProducts = analytics.productStats.sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const recentOrders = orders.slice(0, 7);

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="ltr">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">ABD-finance style command center for sales, operations, and ecommerce performance.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-semibold">{pendingPayments.length + kpis.abandonedCarts} active alerts</span>
        </div>
      </div>

      <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="Revenue" value={currency(kpis.monthlyRevenue)} sub={`${monthlyOrders.length} orders this month`} tone="green" />
        <StatCard icon={ShoppingBag} label="Orders" value={orders.length} sub={`${pendingPayments.length} pending payments`} tone="blue" />
        <StatCard icon={Users} label="New Customers" value={analytics.customers.new} sub={`${users.length} total customers`} tone="slate" />
        <StatCard icon={AlertCircle} label="Abandoned Carts" value={kpis.abandonedCarts} sub={`${kpis.conversionRate}% lead conversion`} tone="rose" />
        <StatCard icon={CheckCircle2} label="Conversion Rate" value={`${Math.round((analytics.funnel.at(-1).value / Math.max(analytics.funnel[0].value, 1)) * 100)}%`} tone="green" />
        <StatCard icon={Package} label="Best Selling Book" value={bestSeller?.name || 'No data'} sub={`${bestSeller?.purchases || 0} purchases`} tone="amber" />
        <StatCard icon={Users} label="New Leads" value={leads.filter((lead) => ['New Visitor', 'Registered'].includes(lead.status)).length} tone="blue" />
        <StatCard icon={ShoppingBag} label="New Registrations" value={users.filter((user) => safeDate(user.created_date) >= monthStart).length} tone="slate" />
      </div>

      <div className="mb-7 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Revenue Chart</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueChart}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip />
              <Area dataKey="revenue" stroke="#2563eb" fill="#dbeafe" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Expense Chart</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={expenseChart}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Top Selling Products</h2>
          <div className="space-y-3">
            {topProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.purchases} purchases</p>
                </div>
                <p className="font-bold text-blue-700">{currency(product.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Pending Payments</h2>
          <div className="space-y-3">
            {pendingPayments.slice(0, 6).map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{order.customer_name || 'Customer'}</p>
                  <p className="text-xs text-amber-700">{order.customer_phone || order.customer_email}</p>
                </div>
                <p className="font-bold text-amber-700">{currency(order.total)}</p>
              </div>
            ))}
            {!pendingPayments.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No pending payments.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Recent Orders</h2>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                <div>
                  <p className="font-semibold text-slate-900">{order.customer_name || 'Customer'}</p>
                  <p className="text-xs text-slate-500">{format(safeDate(order.created_date), 'dd/MM/yyyy')}</p>
                </div>
                <p className="font-bold text-slate-950">{currency(order.total)}</p>
              </div>
            ))}
            {!recentOrders.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No orders yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

