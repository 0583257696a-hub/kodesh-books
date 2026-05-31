import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Store, Phone, Globe, Share2, UserPlus } from 'lucide-react';

const FIELDS = [
  { key: 'store_name', label: 'שם החנות', placeholder: 'אוצר הקדושה', icon: Store },
  { key: 'phone', label: 'טלפון', placeholder: '03-1234567', icon: Phone },
  { key: 'whatsapp', label: 'וואטסאפ', placeholder: '972501234567', icon: Phone },
  { key: 'address', label: 'כתובת', placeholder: 'רחוב הרב קוק 12, ירושלים', icon: Store },
  { key: 'seo_title', label: 'כותרת SEO', placeholder: 'אוצר הקדושה | ספרי קודש', icon: Globe },
  { key: 'seo_description', label: 'תיאור SEO', placeholder: 'החנות המובילה לספרי קודש...', icon: Globe },
  { key: 'facebook', label: 'קישור פייסבוק', placeholder: 'https://facebook.com/...', icon: Share2 },
  { key: 'instagram', label: 'קישור אינסטגרם', placeholder: 'https://instagram.com/...', icon: Share2 },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  const { data: settings = [] } = useQuery({ queryKey: ['site-settings'], queryFn: () => base44.entities.SiteSettings.list() });

  useEffect(() => {
    const map = {};
    settings.forEach((setting) => {
      map[setting.key] = setting.value;
    });
    setValues(map);
  }, [settings]);

  const saveSetting = async (key) => {
    const existing = settings.find((setting) => setting.key === key);
    if (existing) {
      await base44.entities.SiteSettings.update(existing.id, { value: values[key] || '' });
    } else {
      await base44.entities.SiteSettings.create({ key, value: values[key] || '', label: FIELDS.find((field) => field.key === key)?.label || key });
    }
    queryClient.invalidateQueries({ queryKey: ['site-settings'] });
  };

  const handleInviteAdmin = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await base44.users.inviteUser(inviteEmail, 'admin');
      setInviteMsg(`הזמנה נשלחה אל ${inviteEmail}`);
      setInviteEmail('');
    } catch {
      setInviteMsg('שגיאה בשליחת ההזמנה');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="min-h-screen space-y-8 bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">הגדרות מערכת</h1>
        <p className="mt-1 text-sm text-slate-500">פרטי החנות, SEO ורשתות חברתיות.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 font-bold text-slate-950">הגדרות חנות</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm text-slate-700">{field.label}</Label>
              <div className="flex gap-2">
                <Input
                  value={values[field.key] || ''}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  className="flex-1 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                />
                <Button onClick={() => saveSetting(field.key)} variant="outline" className="h-10 border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50">
                  שמור
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
          <UserPlus className="h-5 w-5 text-blue-600" /> הזמנת מנהל מערכת
        </h2>
        <p className="mb-5 text-sm text-slate-600">שלח הזמנה לאדמין חדש. הגישה מוגבלת למנהלים בלבד.</p>
        <div className="flex max-w-sm gap-3">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="admin@example.com"
            className="flex-1 border-slate-200 bg-white text-slate-950"
          />
          <Button onClick={handleInviteAdmin} disabled={inviting || !inviteEmail} className="whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הזמן'}
          </Button>
        </div>
        {inviteMsg && <p className={`mt-3 text-sm ${inviteMsg.startsWith('הזמנה') ? 'text-emerald-700' : 'text-rose-700'}`}>{inviteMsg}</p>}
      </div>
    </div>
  );
}
