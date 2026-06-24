import React, { useMemo } from 'react';
import { appApi } from '@/api/internalClient';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Search, ShoppingCart, Target, TrendingUp, Users } from 'lucide-react';
import { buildAnalytics, currency } from '@/lib/businessCenterData';
import { getLocalAnalyticsEvents } from '@/lib/ecommerceTracking';

const q = async (entity, fallback = []) => {
  try {
    return await appApi.entities[entity].list('-created_date', 500);
  } catch {
    return fallback;
  }
};

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function BookTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {['ספר', 'צפיות', 'הוספות לעגלה', 'רכישות', 'הכנסה', 'המרה'].map((head) => (
              <th key={head} className="px-4 py-3 text-left font-semibold">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold text-slate-950">{row.name}</td>
              <td className="px-4 py-3 text-slate-600">{row.views}</td>
              <td className="px-4 py-3 text-slate-600">{row.cartAdds}</td>
              <td className="px-4 py-3 text-slate-600">{row.purchases}</td>
              <td className="px-4 py-3 font-semibold text-slate-950">{currency(row.revenue)}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{row.conversionRate}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EcommerceAnalytics() {
  const { data = {} } = useQuery({
    queryKey: ['advanced-ecommerce-analytics'],
    queryFn: async () => ({
      products: await q('Product'),
      orders: await q('Order'),
      users: await q('User'),
      events: [...await q('AnalyticsEvent'), ...getLocalAnalyticsEvents()],
    }),
  });

  const analytics = useMemo(() => buildAnalytics(data), [data]);
  const productStats = analytics.productStats;
  const bestSeller = [...productStats].sort((a, b) => b.purchases - a.purchases)[0];
  const topViewed = [...productStats].sort((a, b) => b.views - a.views).slice(0, 8);
  const highestConversion = [...productStats].sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5);
  const lowestConversion = [...productStats].sort((a, b) => a.conversionRate - b.conversionRate).slice(0, 5);
  const purchasedOrders = (data.orders || []).filter((order) => order.status !== 'cancelled');
  const revenue = purchasedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const conversion = analytics.funnel[0]?.value ? Math.round((analytics.funnel.at(-1).value / analytics.funnel[0].value) * 100) : 0;

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight">אנליטיקת ספרים ומכירות</h1>
        <p className="mt-1 text-sm text-slate-500">צפיות בספרים, הוספות לעגלה, רכישות, חיפושים, המלצות, התנהגות לקוחות ומשפך מכירה.</p>
      </div>

      <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Kpi icon={TrendingUp} label="הכנסות" value={currency(revenue)} />
        <Kpi icon={ShoppingCart} label="הזמנות" value={purchasedOrders.length} />
        <Kpi icon={Users} label="לקוחות חדשים" value={analytics.customers.new} />
        <Kpi icon={Target} label="יחס המרה" value={`${conversion}%`} />
        <Kpi icon={Activity} label="עגלות נטושות" value={Math.max(0, analytics.funnel[2].value - analytics.funnel[4].value)} />
        <Kpi icon={ShoppingCart} label="הספר הנמכר ביותר" value={bestSeller?.name || 'אין נתונים'} sub={`${bestSeller?.purchases || 0} רכישות`} />
      </div>

      <div className="mb-7 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">משפך מכירה</h2>
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={analytics.funnel} isAnimationActive fill="#2563eb">
                <LabelList position="right" fill="#0f172a" stroke="none" dataKey="name" />
                {analytics.funnel.map((_, index) => <Cell key={index} fill={['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#22c55e'][index]} />)}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">הספרים הנצפים ביותר</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topViewed} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="views" fill="#2563eb" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-7 grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">ניתוח לפי ספר</h2>
          <BookTable rows={productStats} />
        </div>
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold">ניתוח לקוחות</h2>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={[
                { name: 'חדשים', value: analytics.customers.new },
                { name: 'חוזרים', value: analytics.customers.returning },
                { name: 'לא פעילים', value: analytics.customers.inactive },
              ]}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><Search className="h-4 w-4 text-blue-600" />ניתוח חיפושים</h2>
            <div className="space-y-3">
              {analytics.searchTerms.map((term) => (
                <div key={term.term} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-800">{term.term}</p>
                    <p className="text-xs text-slate-500">{term.noResults} חיפושים ללא תוצאות</p>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{term.searches}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">ספרים עם ההמרה הגבוהה ביותר</h2>
          <BookTable rows={highestConversion} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">ספרים עם ההמרה הנמוכה ביותר</h2>
          <BookTable rows={lowestConversion} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">ניתוח המלצות</h2>
          <div className="space-y-3 text-sm">
            {productStats.slice(0, 5).map((book, index) => (
              <div key={book.id} className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-950">לקוחות שקנו את {book.name} קנו גם:</p>
                <p className="mt-1 text-slate-500">{productStats[(index + 1) % productStats.length]?.name || 'ספר קשור'}, {productStats[(index + 2) % productStats.length]?.name || 'ספר משלים'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
