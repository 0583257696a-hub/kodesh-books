import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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

  const { data: coupons = [] } = useQuery({ queryKey: ['admin-coupons'], queryFn: () => base44.entities.Coupon.list('-created_date', 200) });

  const createM = useMutation({ mutationFn: d => base44.entities.Coupon.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); setOpen(false); setForm({ ...EMPTY }); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.Coupon.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }) });
  const toggleM = useMutation({ mutationFn: ({ id, is_active }) => base44.entities.Coupon.update(id, { is_active }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }) });

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    setForm(p => ({ ...p, code: Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">מערכת קופונים</h1>
          <p className="text-zinc-500 font-body text-sm mt-1">{coupons.length} קופונים</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body">
          <Plus className="h-4 w-4 ml-1" /> קופון חדש
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c => (
          <div key={c.id} className={`bg-[#13131a] border rounded-2xl p-5 ${c.is_active ? 'border-white/5' : 'border-white/5 opacity-50'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-gold" />
                <span className="font-heading font-bold text-white text-lg tracking-widest">{c.code}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { navigator.clipboard.writeText(c.code); }} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteM.mutate(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="text-3xl font-heading font-bold text-gold mb-1">{c.discount_percent}%</p>
            <p className="text-zinc-500 font-body text-xs mb-3">
              {c.used_count || 0} / {c.max_uses || '∞'} שימושים
              {c.expiry_date && ` • עד ${format(new Date(c.expiry_date), 'dd/MM/yyyy')}`}
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                {c.is_active ? 'פעיל' : 'מושבת'}
              </span>
              <Switch checked={!!c.is_active} onCheckedChange={v => toggleM.mutate({ id: c.id, is_active: v })} />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#13131a] border-white/10 text-white max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">קופון חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 font-body text-sm">קוד קופון</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="bg-[#1c1c28] border-white/10 text-white font-body tracking-widest uppercase" placeholder="SAVE20" />
                <Button type="button" onClick={generateCode} variant="outline" className="border-white/10 text-white hover:bg-white/5 font-body whitespace-nowrap">יצור קוד</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 font-body text-sm">הנחה %</Label>
                <Input type="number" min="1" max="100" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: Number(e.target.value) }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 font-body text-sm">מקס׳ שימושים</Label>
                <Input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: Number(e.target.value) }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 font-body text-sm">תאריך תפוגה</Label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
            </div>
            <Button onClick={() => createM.mutate(form)} disabled={!form.code || createM.isPending} className="w-full bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body font-semibold h-12">
              {createM.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'יצירת קופון'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}