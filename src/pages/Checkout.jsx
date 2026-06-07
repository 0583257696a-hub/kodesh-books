import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEcommerceEvent } from '@/lib/ecommerceTracking';
import { getShippingCost, useSiteSettings } from '@/hooks/useSiteSettings';
import { buildCustomerOrderEmail, buildOrderAdminEmail, buildOrderPrintHtml, reserveStockForItems, restoreReservedStock, sendManagedEmail } from '@/lib/orderWorkflow';

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { settings } = useSiteSettings();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', city: '', shipping_address: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const shipping = getShippingCost(settings, totalPrice);
  const total = totalPrice + shipping;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    let reserved = [];
    try {
      const cleanedForm = {
        ...form,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_email: form.customer_email.trim(),
        city: form.city.trim(),
        shipping_address: form.shipping_address.trim(),
        notes: form.notes.trim(),
      };

      if (!cleanedForm.customer_name || !cleanedForm.customer_phone || !cleanedForm.customer_email || !cleanedForm.city || !cleanedForm.shipping_address) {
        throw new Error('יש למלא שם מלא, טלפון, אימייל, עיר וכתובת למשלוח.');
      }

      const enforceStock = settings.enforce_stock_limit === 'true';
      const orderItems = items.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        price: i.price,
      }));
      const reservation = await reserveStockForItems(orderItems, {
        enforceStock,
      });
      reserved = reservation.reserved;

      const order = await base44.entities.Order.create({
        ...cleanedForm,
        order_number: `OK-${Date.now()}`,
        items: reservation.enrichedItems,
        subtotal: totalPrice,
        shipping_cost: shipping,
        shipping_method: 'home_delivery',
        total,
        status: 'new',
        payment_status: 'manual_pending',
        payment_method: 'manual',
        stock_reserved: enforceStock && reserved.length > 0,
        stock_reservations: reserved,
        internal_notes: '',
      });

      await sendManagedEmail(settings, {
        type: 'admin_new_order',
        enabledKey: 'enable_order_emails',
        to: settings.admin_email || settings.email,
        subject: 'התקבלה הזמנה חדשה באתר אוצר הקדושה',
        body: buildOrderAdminEmail(order),
        printHtml: buildOrderPrintHtml(order, settings),
        printFileName: `order-${order.order_number || order.id}.html`,
        order_id: order.id,
      });

      await sendManagedEmail(settings, {
        type: 'customer_order_received',
        enabledKey: 'enable_customer_order_emails',
        to: order.customer_email,
        subject: `הזמנתך התקבלה באתר ${settings.store_name || 'אוצר הקדושה'}`,
        body: buildCustomerOrderEmail(order, settings),
        printHtml: buildOrderPrintHtml(order, settings),
        printFileName: `סיכום-הזמנה-${order.order_number || order.id}.html`,
        order_id: order.id,
      });

      await trackEcommerceEvent({
        event_type: 'purchase',
        customer_email: form.customer_email,
        value: total,
        metadata: { item_count: items.length, status: 'new', manual_payment: true },
      });
      clearCart();
      setOrderPlaced(true);
    } catch (error) {
      if (reserved.length) {
        await restoreReservedStock({ stock_reservations: reserved });
      }
      setSubmitError(error.message || 'שליחת ההזמנה נכשלה. נסו שוב או צרו קשר עם החנות.');
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (!items.length) return;
    trackEcommerceEvent({
      event_type: 'checkout_start',
      value: total,
      metadata: { item_count: items.length },
    });
  }, []);

  if (orderPlaced) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-cream px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-20 w-20 text-gold mx-auto mb-6" />
          <h1 className="font-heading text-3xl font-bold text-foreground mb-3">ההזמנה התקבלה!</h1>
          <p className="font-body text-muted-foreground mb-8">תודה רבה על הזמנתך. ההזמנה התקבלה לבדיקה ידנית. ניצור איתך קשר לאחר בדיקת מלאי ותיאום תשלום.</p>
          <Button asChild className="bg-gold text-walnut hover:bg-gold/90 font-body px-8 py-3">
            <Link to="/">חזרה לעמוד הראשי</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-cream px-4">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-3">העגלה ריקה</h1>
          <Button asChild className="bg-gold text-walnut hover:bg-gold/90 font-body px-8 py-3">
            <Link to="/catalog">לקטלוג הספרים</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-walnut py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-3xl font-bold text-cream">השלמת הזמנה</h1>
          <div className="w-16 h-0.5 bg-gold mx-auto mt-3" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gold/10 space-y-5">
            <h2 className="font-heading text-xl font-bold text-foreground">פרטי המזמין</h2>

            <div className="space-y-2">
              <Label htmlFor="checkout-name" className="font-body">שם מלא *</Label>
              <Input id="checkout-name" required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="font-body border-gold/20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkout-phone" className="font-body">טלפון *</Label>
                <Input id="checkout-phone" required type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className="font-body border-gold/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-email" className="font-body">אימייל *</Label>
                <Input id="checkout-email" required type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} className="font-body border-gold/20" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-city" className="font-body">עיר *</Label>
              <Input id="checkout-city" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="font-body border-gold/20" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-address" className="font-body">כתובת *</Label>
              <Input id="checkout-address" required value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })} className="font-body border-gold/20" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-notes" className="font-body">הערות</Label>
              <Textarea id="checkout-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="font-body border-gold/20" rows={3} />
            </div>

            {submitError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

            <Button type="submit" disabled={isSubmitting} className="w-full bg-gold text-walnut hover:bg-gold/90 font-body py-5 text-base rounded-lg">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שליחת הזמנה לאישור'}
            </Button>
          </form>

          {/* Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gold/10 h-fit">
            <h2 className="font-heading text-xl font-bold text-foreground mb-4">סיכום</h2>
            <div className="space-y-3 font-body text-sm">
              {items.map(item => (
                <div key={item.product_id} className="flex justify-between">
                  <span className="text-muted-foreground">{item.product_name} ×{item.quantity}</span>
                  <span>₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gold/10">
                <span className="text-muted-foreground">משלוח</span>
                <span className="text-gold">{shipping === 0 ? 'חינם' : `₪${shipping}`}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gold/10">
                <span className="font-heading font-bold text-lg">סה"כ</span>
                <span className="font-heading font-bold text-lg text-gold">₪{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
