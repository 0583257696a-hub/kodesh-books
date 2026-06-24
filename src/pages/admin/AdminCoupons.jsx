import React, { useState } from 'react';
import { appApi } from '@/api/internalClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Ticket, Copy } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY = { code: '', discount_percent: 10, expiry_date: '', max_uses: 100, is_active: true };

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: coupons = [] } = useQuery({ queryKey: ['admin-coupons'], queryFn: () => appApi.entities.Coupon.list('-created_date', 200) });

  const createM = useMutation({
    mutationFn: (data) => appApi.entities.Coupon.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setOpen(false);
      setForm({ ...EMPTY });
    },
  });
  const deleteM = useMutation({ mutationFn: (id) => appApi.entities.Coupon.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }) });
  const toggleM = useMutation({ mutationFn: ({ id, is_active }) => appApi.entities.Coupon.update(id, { is_active }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }) });

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    setForm((current) => ({ ...current, code: Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }));
  };

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">מערכת קופונים</h1>
          <p className="mt-1 text-sm text-slate-500">{coupons.length} קופונים</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="ml-1 h-4 w-4" /> קופון חדש
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((coupon) => (
          <div key={coupon.id} className={`rounded-lg border bg-white p-5 shadow-sm ${coupon.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-bold tracking-widest text-slate-950">{coupon.code}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => navigator.clipboard.writeText(coupon.code)} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={() => deleteM.mutate(coupon.id)} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mb-1 text-3xl font-bold text-blue-700">{coupon.discount_percent}%</p>
            <p className="mb-3 text-xs text-slate-500">
              {coupon.used_count || 0} / {coupon.max_uses || '∞'} שימושים
              {coupon.expiry_date && ` · עד ${format(new Date(coupon.expiry_date), 'dd/MM/yyyy')}`}
            </p>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coupon.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {coupon.is_active ? 'פעיל' : 'מושבת'}
              </span>
              <Switch checked={!!coupon.is_active} onCheckedChange={(value) => toggleM.mutate({ id: coupon.id, is_active: value })} />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-slate-200 bg-white text-slate-950" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">קופון חדש</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">קוד קופון</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="border-slate-200 bg-white tracking-widest text-slate-950 uppercase" placeholder="SAVE20" />
                <Button type="button" onClick={generateCode} variant="outline" className="whitespace-nowrap border-slate-200 text-slate-700 hover:bg-slate-50">יצירת קוד</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">הנחה %</Label>
                <Input type="number" min="1" max="100" value={form.discount_percent} onChange={(event) => setForm((current) => ({ ...current, discount_percent: Number(event.target.value) }))} className="border-slate-200 bg-white text-slate-950" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">מקסימום שימושים</Label>
                <Input type="number" value={form.max_uses} onChange={(event) => setForm((current) => ({ ...current, max_uses: Number(event.target.value) }))} className="border-slate-200 bg-white text-slate-950" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">תאריך תפוגה</Label>
              <Input type="date" value={form.expiry_date} onChange={(event) => setForm((current) => ({ ...current, expiry_date: event.target.value }))} className="border-slate-200 bg-white text-slate-950" />
            </div>
            <Button onClick={() => createM.mutate(form)} disabled={!form.code || createM.isPending} className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700">
              {createM.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'יצירת קופון'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
