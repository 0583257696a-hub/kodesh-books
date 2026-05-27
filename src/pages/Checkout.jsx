import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', shipping_address: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const shipping = totalPrice >= 200 ? 0 : 30;
  const total = totalPrice + shipping;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await base44.entities.Order.create({
      ...form,
      items: items.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, price: i.price })),
      total,
      status: 'pending',
    });
    clearCart();
    setOrderPlaced(true);
    setIsSubmitting(false);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-cream px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-20 w-20 text-gold mx-auto mb-6" />
          <h1 className="font-heading text-3xl font-bold text-foreground mb-3">ההזמנה התקבלה!</h1>
          <p className="font-body text-muted-foreground mb-8">תודה רבה על הזמנתך. ניצור איתך קשר בהקדם לאישור ותיאום המשלוח.</p>
          <Link to="/">
            <Button className="bg-gold text-walnut hover:bg-gold/90 font-body px-8 py-3">חזרה לעמוד הראשי</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-cream px-4">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-3">העגלה ריקה</h1>
          <Link to="/catalog">
            <Button className="bg-gold text-walnut hover:bg-gold/90 font-body px-8 py-3">לקטלוג הספרים</Button>
          </Link>
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
              <Label className="font-body">שם מלא *</Label>
              <Input required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="font-body border-gold/20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body">טלפון *</Label>
                <Input required type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className="font-body border-gold/20" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">אימייל</Label>
                <Input type="email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} className="font-body border-gold/20" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-body">כתובת למשלוח *</Label>
              <Input required value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })} className="font-body border-gold/20" />
            </div>

            <div className="space-y-2">
              <Label className="font-body">הערות</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="font-body border-gold/20" rows={3} />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-gold text-walnut hover:bg-gold/90 font-body py-5 text-base rounded-lg">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'אישור הזמנה'}
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