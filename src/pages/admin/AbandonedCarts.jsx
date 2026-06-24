import React, { useMemo } from 'react';
import { appApi } from '@/api/internalClient';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Mail, MessageCircle } from 'lucide-react';
import { buildAbandonedCarts, buildLeads, currency, safeDate } from '@/lib/businessCenterData';

const q = async (entity, fallback = []) => {
  try {
    return await appApi.entities[entity].list('-created_date', entity === 'Product' ? 10000 : 500);
  } catch {
    return fallback;
  }
};

export default function AbandonedCarts() {
  const { data = {} } = useQuery({
    queryKey: ['admin-abandoned-carts'],
    queryFn: async () => ({
      users: await q('User'),
      orders: await q('Order'),
      products: await q('Product'),
      events: await q('AnalyticsEvent'),
    }),
  });

  const abandoned = useMemo(() => buildAbandonedCarts(buildLeads(data)).filter((lead) => {
    const ageMs = Date.now() - safeDate(lead.last_activity).getTime();
    return ageMs >= 3 * 24 * 60 * 60 * 1000;
  }), [data]);

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">עגלות נטושות</h1>
          <p className="mt-1 text-sm text-slate-500">לקוחות שהוסיפו מוצרים לעגלה ולא השלימו הזמנה במשך 3 ימים.</p>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700">
          <p className="text-xs">עגלות לטיפול</p>
          <p className="text-2xl font-bold">{abandoned.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-right font-semibold">לקוח</th>
                <th className="px-5 py-3 text-right font-semibold">פרטי קשר</th>
                <th className="px-5 py-3 text-right font-semibold">מוצרים</th>
                <th className="px-5 py-3 text-right font-semibold">שווי עגלה</th>
                <th className="px-5 py-3 text-right font-semibold">פעילות אחרונה</th>
                <th className="px-5 py-3 text-right font-semibold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {abandoned.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-950">{lead.full_name || 'לקוח'}</td>
                  <td className="px-5 py-4 text-slate-600">
                    <div>{lead.phone || '-'}</div>
                    <div className="text-xs text-slate-400">{lead.email || '-'}</div>
                  </td>
                  <td className="max-w-[340px] px-5 py-4 text-slate-600">{lead.products_in_cart || '-'}</td>
                  <td className="px-5 py-4 font-bold text-blue-700">{currency(lead.cart_value)}</td>
                  <td className="px-5 py-4 text-slate-500">{safeDate(lead.last_activity).toLocaleDateString('he-IL')}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <a href={lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent('העגלה שלך באוצר הקדושה')}` : '#'} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700" title="שלח אימייל">
                        <Mail className="h-4 w-4" />
                      </a>
                      <a href={lead.phone ? `https://wa.me/${String(lead.phone).replace(/\D/g, '')}` : '#'} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" title="וואטסאפ עתידי">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {abandoned.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-slate-500">
            <AlertCircle className="mb-3 h-10 w-10 text-slate-300" />
            אין עגלות נטושות לטיפול כרגע.
          </div>
        )}
      </div>
    </div>
  );
}
