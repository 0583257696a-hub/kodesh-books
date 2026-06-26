import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Eye, Printer, Clock, AlertCircle, Truck, CheckCircle2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import {
  calculateOrderProfit,
  currency,
  normalizeOrderStatus,
  ORDER_STATUSES,
} from '@/lib/orderWorkflow';
import { getAdminOrderPrintHtml, listAdminOrders, updateAdminOrderStatus } from '@/services/orderService';

const STATUS = {
  new: { ...ORDER_STATUSES.new, color: ORDER_STATUSES.new.tone, icon: Clock },
  pending_approval: { ...ORDER_STATUSES.pending_approval, color: ORDER_STATUSES.pending_approval.tone, icon: AlertCircle },
  approved: { ...ORDER_STATUSES.approved, color: ORDER_STATUSES.approved.tone, icon: CheckCircle2 },
  delivered: { ...ORDER_STATUSES.delivered, color: ORDER_STATUSES.delivered.tone, icon: Truck },
  cancelled: { ...ORDER_STATUSES.cancelled, color: ORDER_STATUSES.cancelled.tone, icon: AlertCircle },
};

const PAYMENT_STATUS_LABELS = {
  manual_pending: 'ממתין לתשלום',
  pending_payment_verification: 'ממתין לאימות אשראי',
  payment_verified_waiting_manager_approval: 'אומת - לאישור בפאנל טרנזילה',
  payment_verification_failed: 'אימות אשראי נכשל',
  paid: 'שולם',
  j5_session_created: 'נפתח אימות אשראי',
  j5_verified: 'אומת - לאישור בפאנל טרנזילה',
  j5_failed: 'אימות אשראי נכשל',
  j5_pending: 'ממתין לאימות אשראי',
};

function paymentStatusLabel(order) {
  return PAYMENT_STATUS_LABELS[order?.payment_status] || order?.payment_status || 'לא ידוע';
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');

  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: listAdminOrders });

  const updateM = useMutation({
    mutationFn: ({ id, data }) => updateAdminOrderStatus(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const filtered = orders.filter((order) => {
    const matchSearch = !search || order.customer_name?.includes(search) || order.customer_phone?.includes(search) || order.customer_email?.includes(search);
    const matchStatus = filterStatus === 'all' || normalizeOrderStatus(order.status) === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (order, status) => {
    setAdminMessage('');
    const data = { status };
    const updatedOrder = await updateM.mutateAsync({ id: order.id, data });

    setSelectedOrder((current) => current?.id === order.id ? updatedOrder : current);
    setAdminMessage('סטטוס ההזמנה עודכן בהצלחה.');
  };

  const handlePrint = async (order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write('<html dir="rtl"><body style="font-family:Arial;padding:20px">טוען הזמנה...</body></html>');

    try {
      const html = await getAdminOrderPrintHtml(order.id);
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      printWindow.document.open();
      printWindow.document.write(`<html dir="rtl"><body style="font-family:Arial;padding:20px">${error.message || 'הדפסת ההזמנה נכשלה'}</body></html>`);
      printWindow.document.close();
    }
    return;
    /* const w = window.open('', '_blank');
    w.document.write(`<html dir="rtl"><head><title>הזמנה</title></head><body style="font-family:Arial;padding:20px">
      <h2>הזמנה - אוצר הקדושה</h2>
      <p><b>לקוח:</b> ${order.customer_name}</p>
      <p><b>טלפון:</b> ${order.customer_phone}</p>
      <p><b>אימייל:</b> ${order.customer_email}</p>
      <p><b>עיר:</b> ${order.city || ''}</p>
      <p><b>כתובת:</b> ${order.shipping_address}</p>
      <hr/>
      <table width="100%" border="1" cellpadding="5" style="border-collapse:collapse">
        <tr><th>מוצר</th><th>כמות</th><th>מחיר</th></tr>
        ${order.items?.map((item) => `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>₪${item.price}</td></tr>`).join('')}
      </table>
      <p><b>סכום מוצרים:</b> ₪${order.subtotal ?? (Number(order.total || 0) - Number(order.shipping_cost || 0))}</p>
      <p><b>משלוח:</b> ₪${order.shipping_cost ?? 0}</p>
      <p><b>סה"כ: ₪${order.total}</b></p>
    </body></html>`);
    w.print(); */
  };

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight">ניהול הזמנות</h1>
        <p className="mt-1 text-sm text-slate-500">{orders.length} הזמנות</p>
      </div>
      {adminMessage && <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{adminMessage}</p>}

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש לקוח..." className="w-64 border-slate-200 bg-white pr-10 text-slate-950 placeholder:text-slate-400" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 border-slate-200 bg-white text-slate-950"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(STATUS).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-right font-semibold">לקוח</th>
                <th className="px-5 py-3 text-right font-semibold">מוצרים</th>
                <th className="px-5 py-3 text-right font-semibold">סכום</th>
                <th className="px-5 py-3 text-right font-semibold">תאריך</th>
                <th className="px-5 py-3 text-right font-semibold">סטטוס</th>
                <th className="px-5 py-3 text-right font-semibold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const normalizedStatus = normalizeOrderStatus(order.status);
                const status = STATUS[normalizedStatus] || STATUS.new;
                return (
                  <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{order.customer_name || '-'}</p>
                      <p className="text-xs text-slate-500">{order.customer_phone}</p>
                    </td>
                    <td className="max-w-[260px] px-5 py-4 text-xs text-slate-600">
                      {order.items?.map((item, index) => <div key={index}>{item.product_name} x{item.quantity}</div>)}
                    </td>
                    <td className="px-5 py-4 font-bold text-blue-700">₪{order.total}</td>
                    <td className="px-5 py-4 text-slate-500">{format(new Date(order.created_date), 'dd/MM/yy')}</td>
                    <td className="px-5 py-4">
                      <Select value={normalizedStatus} onValueChange={(value) => handleStatusChange(order, value)}>
                        <SelectTrigger className={`h-9 w-28 border text-xs font-semibold ${status.color}`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white">
                          {Object.entries(STATUS).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)} className="h-8 w-8 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(order)} className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-950">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-16 text-center text-sm text-slate-500">לא נמצאו הזמנות</div>}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg border-slate-200 bg-white text-slate-950" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">פרטי הזמנה</DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            const profit = calculateOrderProfit(selectedOrder);
            const normalizedStatus = normalizeOrderStatus(selectedOrder.status);
            return (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[['לקוח', selectedOrder.customer_name], ['טלפון', selectedOrder.customer_phone], ['אימייל', selectedOrder.customer_email], ['עיר', selectedOrder.city], ['כתובת', selectedOrder.shipping_address], ['סטטוס', STATUS[normalizedStatus]?.label]].map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-0.5 text-xs text-slate-500">{key}</p>
                    <p className="font-semibold text-slate-950">{value || '-'}</p>
                  </div>
                ))}
              </div>
              {selectedOrder.notes && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-0.5 text-xs text-slate-500">הערות</p>
                  <p className="text-slate-700">{selectedOrder.notes}</p>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs text-slate-500">מוצרים</p>
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex justify-between border-b border-slate-100 py-1.5 last:border-0">
                    <span className="text-slate-700">{item.product_name} x{item.quantity}</span>
                    <span className="font-semibold text-blue-700">₪{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-slate-600">
                  <span>סכום מוצרים</span>
                  <span>₪{selectedOrder.subtotal ?? (Number(selectedOrder.total || 0) - Number(selectedOrder.shipping_cost || 0))}</span>
                </div>
                <div className="mt-1 flex justify-between text-slate-600">
                  <span>משלוח</span>
                  <span>₪{selectedOrder.shipping_cost ?? 0}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-950">סה״כ</span>
                  <span className="font-bold text-blue-700">₪{selectedOrder.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">הכנסה</p>
                  <p className="font-bold text-slate-950">{currency(profit.revenue)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">עלות</p>
                  <p className="font-bold text-slate-950">{currency(profit.cost)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">רווח</p>
                  <p className="font-bold text-emerald-700">{currency(profit.profit)}</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-500" />
                    <p className="font-semibold text-slate-950">תשלום טרנזילה</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {paymentStatusLabel(selectedOrder)}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div>סכום לחיוב: <span className="font-semibold text-slate-950">₪{Number(selectedOrder.final_amount ?? selectedOrder.total ?? 0).toFixed(2)}</span></div>
                  <div>מטבע: <span className="font-semibold text-slate-950">{selectedOrder.currency || '1'}</span></div>
                  <div>כרטיס: <span className="font-semibold text-slate-950">{selectedOrder.card_last4 ? `**** ${selectedOrder.card_last4}` : 'לא נקלט'}</span></div>
                  <div>אימות: <span className="font-semibold text-slate-950">{selectedOrder.verified_at ? format(new Date(selectedOrder.verified_at), 'dd/MM/yy HH:mm') : 'ממתין'}</span></div>
                </div>
                {selectedOrder.payment_error && (
                  <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{selectedOrder.payment_error}</p>
                )}
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  האישור והחיוב הסופי מתבצעים בפאנל טרנזילה, לא מתוך האתר.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">הערות פנימיות</p>
                <Textarea
                  value={selectedOrder.internal_notes || ''}
                  onChange={(event) => setSelectedOrder((current) => ({ ...current, internal_notes: event.target.value }))}
                  className="border-slate-200 bg-white text-slate-950"
                  rows={3}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateM.mutate({ id: selectedOrder.id, data: { internal_notes: selectedOrder.internal_notes || '' } })}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  שמירת הערות פנימיות
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => handleStatusChange(selectedOrder, 'approved')} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  אשר הזמנה
                </Button>
                <Button onClick={() => handleStatusChange(selectedOrder, 'cancelled')} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50">
                  בטל והחזר מלאי
                </Button>
              </div>
              <Button onClick={() => handlePrint(selectedOrder)} variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                <Printer className="ml-2 h-4 w-4" /> הדפסת הזמנה
              </Button>
            </div>
          )})()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
