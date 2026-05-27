import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Eye, Printer, Clock, AlertCircle, Truck, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS = {
  pending:   { label: 'חדש',     color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  confirmed: { label: 'בטיפול', color: 'bg-blue-500/10   text-blue-400   border-blue-500/20',   icon: AlertCircle },
  shipped:   { label: 'נשלח',   color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Truck },
  delivered: { label: 'הושלם',  color: 'bg-green-500/10  text-green-400  border-green-500/20',  icon: CheckCircle2 },
  cancelled: { label: 'בוטל',   color: 'bg-red-500/10    text-red-400    border-red-500/20',    icon: AlertCircle },
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: () => base44.entities.Order.list('-created_date', 500) });

  const updateM = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.customer_name?.includes(search) || o.customer_phone?.includes(search) || o.customer_email?.includes(search);
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handlePrint = (order) => {
    const w = window.open('', '_blank');
    w.document.write(`<html dir="rtl"><head><title>הזמנה</title></head><body style="font-family:Arial;padding:20px">
      <h2>הזמנה — אוצר הקדושה</h2>
      <p><b>לקוח:</b> ${order.customer_name}</p>
      <p><b>טלפון:</b> ${order.customer_phone}</p>
      <p><b>כתובת:</b> ${order.shipping_address}</p>
      <hr/>
      <table width="100%" border="1" cellpadding="5" style="border-collapse:collapse">
        <tr><th>מוצר</th><th>כמות</th><th>מחיר</th></tr>
        ${order.items?.map(i => `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>₪${i.price}</td></tr>`).join('')}
      </table>
      <p><b>סה"כ: ₪${order.total}</b></p>
    </body></html>`);
    w.print();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-white">ניהול הזמנות</h1>
        <p className="text-zinc-500 font-body text-sm mt-1">{orders.length} הזמנות</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לקוח..." className="bg-[#13131a] border-white/10 text-white pr-10 font-body w-64 placeholder:text-zinc-600" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-[#13131a] border-white/10 text-white font-body w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#13131a] border-white/10">
            <SelectItem value="all" className="text-white font-body">כל הסטטוסים</SelectItem>
            {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k} className="text-white font-body">{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-[#13131a] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">לקוח</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">מוצרים</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">סכום</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">תאריך</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">סטטוס</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const sc = STATUS[o.status] || STATUS.pending;
              return (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{o.customer_name || '—'}</p>
                    <p className="text-zinc-500 text-xs">{o.customer_phone}</p>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-xs max-w-[200px]">
                    {o.items?.map((i, idx) => <div key={idx}>{i.product_name} ×{i.quantity}</div>)}
                  </td>
                  <td className="px-6 py-4 text-gold font-bold">₪{o.total}</td>
                  <td className="px-6 py-4 text-zinc-500">{format(new Date(o.created_date), 'dd/MM/yy')}</td>
                  <td className="px-6 py-4">
                    <Select value={o.status || 'pending'} onValueChange={v => updateM.mutate({ id: o.id, data: { status: v } })}>
                      <SelectTrigger className={`w-28 text-xs border font-body h-8 ${sc.color}`}><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#1c1c28] border-white/10">
                        {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k} className="text-white font-body">{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(o)} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePrint(o)} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-16 text-zinc-600 font-body">לא נמצאו הזמנות</div>}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-[#13131a] border-white/10 text-white max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">פרטי הזמנה</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 font-body text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[['לקוח', selectedOrder.customer_name], ['טלפון', selectedOrder.customer_phone], ['אימייל', selectedOrder.customer_email], ['כתובת', selectedOrder.shipping_address]].map(([k, v]) => (
                  <div key={k} className="bg-[#1c1c28] rounded-xl p-3">
                    <p className="text-zinc-500 text-xs mb-0.5">{k}</p>
                    <p className="text-white font-medium">{v || '—'}</p>
                  </div>
                ))}
              </div>
              {selectedOrder.notes && (
                <div className="bg-[#1c1c28] rounded-xl p-3">
                  <p className="text-zinc-500 text-xs mb-0.5">הערות</p>
                  <p className="text-white">{selectedOrder.notes}</p>
                </div>
              )}
              <div className="bg-[#1c1c28] rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-2">מוצרים</p>
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-white">{item.product_name} ×{item.quantity}</span>
                    <span className="text-gold">₪{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1">
                  <span className="text-white font-bold">סה"כ</span>
                  <span className="text-gold font-bold">₪{selectedOrder.total}</span>
                </div>
              </div>
              <Button onClick={() => handlePrint(selectedOrder)} variant="outline" className="w-full border-white/10 text-white hover:bg-white/5 font-body">
                <Printer className="h-4 w-4 ml-2" /> הדפסת הזמנה
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}