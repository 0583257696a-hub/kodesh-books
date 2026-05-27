import React from 'react';
import { Phone, Mail, MessageCircle, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function Contact() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-walnut py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-cream mb-2">צור קשר</h1>
          <div className="w-16 h-0.5 bg-gold mx-auto" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-2">אוצר הקדושה</h2>
              <p className="font-body text-muted-foreground">נשמח לעמוד לשירותכם בכל שאלה או בקשה.</p>
            </div>

            <div className="space-y-5">
              {[
                { icon: Phone, label: 'טלפון', value: '03-123-4567' },
                { icon: MessageCircle, label: 'וואצאפ', value: '050-123-4567' },
                { icon: Mail, label: 'אימייל', value: 'info@otzar-hakodesh.co.il' },
                { icon: MapPin, label: 'כתובת', value: 'רחוב הרב קוק 12, ירושלים' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-body font-semibold text-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 border border-gold/10">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="h-5 w-5 text-gold" />
                <h3 className="font-heading font-bold text-foreground">שעות פעילות</h3>
              </div>
              <div className="font-body text-sm text-muted-foreground space-y-1">
                <p>ראשון – חמישי: 09:00 – 20:00</p>
                <p>יום שישי: 09:00 – 13:00</p>
                <p>מוצ"ש: 20:00 – 23:00</p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gold/10">
            <h2 className="font-heading text-xl font-bold text-foreground mb-6">שלח הודעה</h2>
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <div className="space-y-2">
                <Label className="font-body">שם מלא</Label>
                <Input className="font-body border-gold/20" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">טלפון</Label>
                <Input type="tel" className="font-body border-gold/20" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">אימייל</Label>
                <Input type="email" className="font-body border-gold/20" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">הודעה</Label>
                <Textarea className="font-body border-gold/20" rows={4} />
              </div>
              <Button className="w-full bg-gold text-walnut hover:bg-gold/90 font-body py-5 text-base rounded-lg gold-glow gold-glow-hover">
                שליחה
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}