import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEcommerceEvent } from '@/lib/ecommerceTracking';
import { getShippingCost, useSiteSettings } from '@/hooks/useSiteSettings';
import { markCheckoutStarted } from '@/services/cartService';
import { createOrder, createTranzilaJ5Session } from '@/services/orderService';

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { settings } = useSiteSettings();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', city: '', shipping_address: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentFrameKey, setPaymentFrameKey] = useState(0);
  const [orderSuccessMessage, setOrderSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const tranzilaFormRef = useRef(null);

  const shipping = getShippingCost(settings, totalPrice, items);
  const total = totalPrice + shipping;

  const reloadTranzilaFrame = () => {
    setPaymentFrameKey((key) => key + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

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

      const orderItems = items.map(i => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        price: i.price,
        image_url: i.image_url,
        free_shipping: !!i.free_shipping,
      }));

      const order = await createOrder({
        customer: cleanedForm,
        items: orderItems,
        subtotal: totalPrice,
        shipping_cost: shipping,
        shipping_method: 'home_delivery',
        total,
      });

      await trackEcommerceEvent({
        event_type: 'order_created',
        customer_email: form.customer_email,
        value: total,
        metadata: { item_count: items.length, status: 'new', payment_method: 'tranzila_j5', order_id: order.id, order_number: order.order_number },
      });
      setCreatedOrder(order);
      clearCart();

      try {
        const session = await createTranzilaJ5Session({
          order_id: order.id,
          customer_email: order.customer_email,
        });
        setPaymentSession(session);
      } catch (paymentError) {
        console.warn('Tranzila J5 session failed:', paymentError);
        setOrderSuccessMessage('ההזמנה התקבלה בהצלחה. בשלב זה טופס האשראי של טרנזילה לא זמין, וניצור איתך קשר להשלמת התשלום.');
        setOrderPlaced(true);
      }
    } catch (error) {
      setSubmitError(error.message || 'שליחת ההזמנה נכשלה. נסו שוב או צרו קשר עם החנות.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!items.length) return;
    markCheckoutStarted(items, total).catch((error) => {
      console.warn('Checkout cart sync failed:', error);
    });
    trackEcommerceEvent({
      event_type: 'checkout_started',
      value: total,
      metadata: { item_count: items.length },
    });
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'tranzila:j5-success') {
        setOrderSuccessMessage('פרטי האשראי התקבלו בטרנזילה. החיוב הסופי יבוצע לאחר אישור מנהל בפאנל טרנזילה.');
        setPaymentSession(null);
        setOrderPlaced(true);
      }
      if (event.data?.type === 'tranzila:j5-fail') {
        setSubmitError('אימות האשראי בטרנזילה לא הושלם. ניתן לנסות שוב או ליצור קשר עם החנות.');
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!paymentSession) return undefined;

    const timer = window.setTimeout(() => {
      console.info('Tranzila iframe form submit', paymentSession.debug_log || {
        iframeUrl: paymentSession.iframe_url,
        terminalName: paymentSession.fields?.supplier,
        sum: paymentSession.fields?.sum,
        currency: paymentSession.fields?.currency,
        tranmode: paymentSession.fields?.tranmode,
        myid: paymentSession.fields?.myid,
        DCdisable: paymentSession.fields?.DCdisable,
        success_url_address: paymentSession.fields?.success_url_address,
        fail_url_address: paymentSession.fields?.fail_url_address,
        notify_url_address: paymentSession.fields?.notify_url_address,
      });
      tranzilaFormRef.current?.submit();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [paymentFrameKey, paymentSession]);

  if (orderPlaced) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4" style={{ background: '#FCFAF5' }} dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-gold" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[#1F160F] mb-3">תודה על הזמנתך!</h1>
          <p className="font-body text-[#6B5A45] mb-8 leading-relaxed">
            {orderSuccessMessage || 'ההזמנה התקבלה בהצלחה. ניצור איתך קשר בקרוב לאחר בדיקת המלאי ותיאום תשלום.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild className="font-body px-8 py-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}>
              <Link to="/">חזרה לחנות</Link>
            </Button>
            <Button asChild variant="outline" className="font-body px-8 py-3 rounded-lg border-[#E7D8B8] text-[#3A2415] hover:border-gold/50 hover:text-gold">
              <Link to="/contact">צור קשר</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentSession && createdOrder) {
    return (
      <div className="min-h-screen bg-[#FCFAF5] px-4 py-8" dir="rtl">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 rounded-xl border border-[#E7D8B8] bg-white p-5 shadow-sm">
            <h1 className="font-heading text-2xl font-bold text-[#1F160F]">תשלום מאובטח בטרנזילה</h1>
            <p className="mt-2 font-body text-sm leading-relaxed text-[#6B5A45]">
              ההזמנה נשמרה במערכת. יש להזין פרטי אשראי לאימות J5. החיוב הסופי יתבצע בפאנל טרנזילה לאחר אישור מנהל.
            </p>
            <p className="mt-2 font-body text-xs text-[#6B5A45]">
              מספר הזמנה: {createdOrder.order_number || createdOrder.id}
            </p>
          </div>

          {submitError && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

          <form
            ref={tranzilaFormRef}
            action={paymentSession.iframe_url}
            method={paymentSession.method || 'POST'}
            target="tranzila-payment-frame"
            className="hidden"
            aria-hidden="true"
          >
            {Object.entries(paymentSession.fields || {}).map(([key, value]) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={String(value ?? '')}
                readOnly
              />
            ))}
          </form>

          <div className="overflow-hidden rounded-xl border border-[#E7D8B8] bg-white shadow-sm">
            <iframe
              key={paymentFrameKey}
              title="טופס תשלום מאובטח של טרנזילה"
              name="tranzila-payment-frame"
              src="about:blank"
              className="h-[720px] w-full bg-white"
              allow="payment"
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={reloadTranzilaFrame}
              className="border-[#E7D8B8] text-[#3A2415] hover:border-gold/50 hover:text-gold"
            >
              טען שוב את טופס האשראי
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#E7D8B8] text-[#3A2415] hover:border-gold/50 hover:text-gold"
            >
              <Link to="/contact">צור קשר</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4" style={{ background: '#FCFAF5' }} dir="rtl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-[#1F160F] mb-3">העגלה ריקה</h1>
          <Button asChild className="font-body px-8 py-3 rounded-lg mt-2" style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}>
            <Link to="/catalog">לקטלוג הספרים</Link>
          </Button>
        </div>
      </div>
    );
  }

  const inputClass = "font-body border-[#E7D8B8] bg-white text-[#1F160F] focus:ring-gold/30 focus:border-gold/40 rounded-lg";

  return (
    <div className="min-h-screen" style={{ background: '#FCFAF5' }} dir="rtl">
      <div className="bg-[#1F1008] py-10 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-3xl font-bold text-cream">השלמת הזמנה</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-8 bg-gold/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-gold" />
            <div className="h-px w-8 bg-gold/40" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-xl p-6 border border-[#E7D8B8] space-y-5" style={{ boxShadow: '0 2px 16px rgba(42,22,11,0.06)' }}>
            <h2 className="font-heading text-xl font-bold text-[#1F160F] pb-4 border-b border-[#E7D8B8]">פרטי המזמין</h2>

            <div className="space-y-2">
              <Label htmlFor="checkout-name" className="font-body font-medium text-[#3A2415]">שם מלא *</Label>
              <Input id="checkout-name" required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkout-phone" className="font-body font-medium text-[#3A2415]">טלפון *</Label>
                <Input id="checkout-phone" required type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-email" className="font-body font-medium text-[#3A2415]">אימייל *</Label>
                <Input id="checkout-email" required type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-city" className="font-body font-medium text-[#3A2415]">עיר *</Label>
              <Input id="checkout-city" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputClass} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-address" className="font-body font-medium text-[#3A2415]">כתובת למשלוח *</Label>
              <Input id="checkout-address" required value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })} className={inputClass} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkout-notes" className="font-body font-medium text-[#3A2415]">הערות (אופציונלי)</Label>
              <Textarea id="checkout-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={3} />
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 bg-[#F8F3E8] rounded-lg p-3 border border-[#E7D8B8]">
              <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" aria-hidden="true" />
              <p className="font-body text-xs text-[#6B5A45]">הפרטים שלך מאובטחים ולא יועברו לצד שלישי</p>
            </div>

            {submitError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-body py-5 text-base rounded-lg"
              style={{ background: isSubmitting ? '#c9a84c' : 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ביצוע הזמנה'}
            </Button>
          </form>

          {/* Summary */}
          <div className="bg-white rounded-xl p-6 border border-[#E7D8B8] h-fit sticky top-28" style={{ boxShadow: '0 2px 16px rgba(42,22,11,0.06)' }}>
            <h2 className="font-heading text-xl font-bold text-[#1F160F] mb-4 pb-4 border-b border-[#E7D8B8]">סיכום הזמנה</h2>
            <div className="space-y-3 font-body text-sm">
              {items.map(item => (
                <div key={item.product_id} className="flex justify-between gap-3">
                  <span className="text-[#6B5A45] leading-snug">{item.product_name} ×{item.quantity}</span>
                  <span className="text-[#1F160F] font-medium flex-shrink-0">₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-[#E7D8B8]">
                <span className="text-[#6B5A45]">משלוח</span>
                <span className="text-gold font-semibold">{shipping === 0 ? 'חינם' : `₪${shipping}`}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#E7D8B8]">
                <span className="font-heading font-bold text-lg text-[#1F160F]">סה"כ</span>
                <span className="font-heading font-bold text-xl text-gold">₪{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
