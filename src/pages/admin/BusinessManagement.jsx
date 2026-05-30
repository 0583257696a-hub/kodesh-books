import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, CreditCard, LineChart, Plus, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildExpenseRows, buildIncomeRows, buildLeads, businessKpis, chartByMonth, currency } from '@/lib/businessCenterData';
import { getLocalAnalyticsEvents } from '@/lib/ecommerceTracking';

const q = async (entity, fallback = []) => {
  try {
    return await base44.entities[entity].list('-created_date', 500);
  } catch {
    return fallback;
  }
};

const incomeCategories = ['Subscription', 'Product Sale', 'Service', 'Other'];
const expenseCategories = ['Advertising', 'Software', 'Domain', 'Hosting', 'Payroll', 'Office', 'Other'];

function Metric({ icon: Icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function EntryForm({ type, onAdd }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: type === 'income' ? 'Product Sale' : 'Advertising',
    customer: '',
    supplier: '',
    amount: '',
    payment_method: 'Card',
    notes: '',
  });

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onAdd({ ...form, id: `${type}-${Date.now()}`, amount: Number(form.amount || 0) });
        setForm((current) => ({ ...current, customer: '', supplier: '', amount: '', notes: '' }));
      }}
      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-6"
    >
      <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="bg-white" />
      <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
        <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
      </Select>
      <Input placeholder={type === 'income' ? 'Customer' : 'Supplier'} value={type === 'income' ? form.customer : form.supplier} onChange={(event) => setForm({ ...form, [type === 'income' ? 'customer' : 'supplier']: event.target.value })} className="bg-white" />
      <Input type="number" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="bg-white" />
      {type === 'income' ? (
        <Input placeholder="Payment method" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })} className="bg-white" />
      ) : (
        <Textarea placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-10 resize-none bg-white" />
      )}
      <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />Add</Button>
    </form>
  );
}

function LedgerTable({ rows, type }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-left">{type === 'income' ? 'Customer' : 'Supplier'}</th>
            <th className="px-4 py-3 text-left">Amount</th>
            <th className="px-4 py-3 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="px-4 py-3 text-slate-600">{row.date?.slice(0, 10)}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{row.category}</span></td>
              <td className="px-4 py-3 text-slate-700">{type === 'income' ? row.customer : row.supplier}</td>
              <td className="px-4 py-3 font-semibold text-slate-950">{currency(row.amount)}</td>
              <td className="px-4 py-3 text-slate-500">{row.notes || row.payment_method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BusinessManagement() {
  const [manualIncome, setManualIncome] = useState([]);
  const [manualExpenses, setManualExpenses] = useState([]);

  const { data = {} } = useQuery({
    queryKey: ['business-management-center'],
    queryFn: async () => ({
      orders: await q('Order'),
      users: await q('User'),
      products: await q('Product'),
      leads: await q('Lead'),
      incomes: await q('BusinessIncome'),
      expenses: await q('BusinessExpense'),
      events: [...await q('AnalyticsEvent'), ...getLocalAnalyticsEvents()],
    }),
  });

  const rows = useMemo(() => {
    const leads = buildLeads({ ...data, events: data.events || [] });
    const expenses = buildExpenseRows([...(data.expenses || []), ...manualExpenses]);
    const incomes = buildIncomeRows(data.orders || [], [...(data.incomes || []), ...manualIncome]);
    return { leads, expenses, incomes };
  }, [data, manualExpenses, manualIncome]);

  const kpis = businessKpis({ orders: data.orders || [], users: data.users || [], leads: rows.leads, expenses: rows.expenses });
  const incomeChart = chartByMonth(rows.incomes);
  const expenseChart = chartByMonth(rows.expenses);

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="ltr">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Management</h1>
          <p className="mt-1 text-sm text-slate-500">Finance, profitability, subscribers, abandoned carts, and operating ledger.</p>
        </div>
        <div className="rounded-lg bg-blue-600 px-4 py-3 text-white">
          <p className="text-xs text-blue-100">Monthly Profit</p>
          <p className="text-2xl font-bold">{currency(kpis.monthlyProfit)}</p>
        </div>
      </div>

      <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={TrendingUp} label="Monthly Revenue" value={currency(kpis.monthlyRevenue)} tone="green" />
        <Metric icon={TrendingDown} label="Monthly Expenses" value={currency(kpis.monthlyExpenses)} tone="red" />
        <Metric icon={Building2} label="Active Subscribers" value={kpis.activeSubscribers} />
        <Metric icon={ReceiptText} label="Abandoned Carts" value={kpis.abandonedCarts} tone="slate" />
        <Metric icon={CreditCard} label="Trial Users" value={kpis.trialUsers} />
        <Metric icon={LineChart} label="Conversion Rate" value={`${kpis.conversionRate}%`} tone="green" />
      </div>

      <div className="mb-7 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Revenue Chart</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={incomeChart}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip />
              <Area dataKey="value" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Expense Chart</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={expenseChart}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Tabs defaultValue="income">
        <TabsList className="mb-5 bg-slate-100">
          <TabsTrigger value="income">Income Tracking</TabsTrigger>
          <TabsTrigger value="expenses">Expense Tracking</TabsTrigger>
        </TabsList>
        <TabsContent value="income">
          <EntryForm type="income" onAdd={(row) => setManualIncome((current) => [row, ...current])} />
          <LedgerTable rows={rows.incomes} type="income" />
        </TabsContent>
        <TabsContent value="expenses">
          <EntryForm type="expense" onAdd={(row) => setManualExpenses((current) => [row, ...current])} />
          <LedgerTable rows={rows.expenses} type="expense" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

