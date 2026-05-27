import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Store, Phone, Globe, Share2, UserPlus } from 'lucide-react';

const FIELDS = [
  { key: 'store_name', label: 'שם החנות', placeholder: 'אוצר הקדושה', icon: Store },
  { key: 'phone', label: 'טלפון', placeholder: '03-1234567', icon: Phone },
  { key: 'whatsapp', label: 'וואצאפ', placeholder: '972501234567', icon: Phone },
  { key: 'address', label: 'כתובת', placeholder: 'רחוב הרב קוק 12, ירושלים', icon: Store },
  { key: 'seo_title', label: 'כותרת SEO', placeholder: 'אוצר הקדושה | ספרי קודש', icon: Globe },
  { key: 'seo_description', label: 'תיאור SEO', placeholder: 'החנות המובילה לספרי קודש...', icon: Globe },
  { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/...', icon: Share2 },
  { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/...', icon: Share2 },
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
    settings.forEach(s => { map[s.key] = s.value; });
    setValues(map);
  }, [settings]);

  const saveSetting = async (key) => {
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await base44.entities.SiteSettings.update(existing.id, { value: values[key] || '' });
    } else {
      await base44.entities.SiteSettings.create({ key, value: values[key] || '', label: FIELDS.find(f => f.key === key)?.label || key });
    }
    queryClient.invalidateQueries({ queryKey: ['site-settings'] });
  };

  const handleInviteAdmin = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await base44.users.inviteUser(inviteEmail, 'admin');
      setInviteMsg(`✓ הזמנה נשלחה ל-${inviteEmail}`);
      setInviteEmail('');
    } catch (e) {
      setInviteMsg('שגיאה בשליחת ההזמנה');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">הגדרות מערכת</h1>
        <p className="text-zinc-500 font-body text-sm mt-1">פרטי החנות, SEO ורשתות חברתיות</p>
      </div>

      {/* Settings Fields */}
      <div className="bg-[#13131a] border border-white/5 rounded-2xl p-6">
        <h2 className="font-heading font-bold text-white mb-6">הגדרות חנות</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {FIELDS.map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-zinc-300 font-body text-sm">{field.label}</Label>
              <div className="flex gap-2">
                <Input
                  value={values[field.key] || ''}
                  onChange={e => setValues(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="bg-[#1c1c28] border-white/10 text-white font-body flex-1"
                />
                <Button onClick={() => saveSetting(field.key)} variant="outline" className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-body h-10 px-3 text-xs">
                  שמור
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Admin */}
      <div className="bg-[#13131a] border border-gold/10 rounded-2xl p-6">
        <h2 className="font-heading font-bold text-white mb-2 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-gold" /> הזמנת מנהל מערכת
        </h2>
        <p className="text-zinc-500 font-body text-sm mb-5">שלח הזמנה לאדמין חדש. הגישה מוגבלת — רק מנהלים יכולים לגשת לפאנל.</p>
        <div className="flex gap-3 max-w-sm">
          <Input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="admin@example.com"
            className="bg-[#1c1c28] border-white/10 text-white font-body flex-1"
          />
          <Button onClick={handleInviteAdmin} disabled={inviting || !inviteEmail} className="bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body whitespace-nowrap">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הזמן'}
          </Button>
        </div>
        {inviteMsg && (
          <p className={`mt-3 text-sm font-body ${inviteMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{inviteMsg}</p>
        )}
      </div>
    </div>
  );
}