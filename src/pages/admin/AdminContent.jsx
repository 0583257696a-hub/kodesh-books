import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Megaphone, Plus, Trash2, Loader2, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EMPTY_BANNER = { key: '', value: '', label: '' };

export default function AdminContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', cta_text: 'למבצעים', image_url: '', is_active: true });
  const [uploading, setUploading] = useState(false);

  const { data: settings = [] } = useQuery({ queryKey: ['site-settings'], queryFn: () => base44.entities.SiteSettings.list() });

  const siteMessages = settings.filter(s => s.key?.startsWith('message_') || s.key === 'top_banner');
  const banners = settings.filter(s => s.key?.startsWith('banner_'));

  const createM = useMutation({ mutationFn: d => base44.entities.SiteSettings.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['site-settings'] }); setOpen(false); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.SiteSettings.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-settings'] }) });

  const handleUploadBanner = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, image_url: file_url }));
    setUploading(false);
  };

  const saveBanner = () => {
    const key = `banner_${Date.now()}`;
    createM.mutate({ key, value: JSON.stringify(form), label: form.title });
  };

  const saveTopBanner = (text) => {
    const existing = settings.find(s => s.key === 'top_banner');
    if (existing) {
      base44.entities.SiteSettings.update(existing.id, { value: text }).then(() => queryClient.invalidateQueries({ queryKey: ['site-settings'] }));
    } else {
      createM.mutate({ key: 'top_banner', value: text, label: 'הודעה עליונה' });
    }
  };

  const topBannerSetting = settings.find(s => s.key === 'top_banner');
  const [topBannerText, setTopBannerText] = useState(topBannerSetting?.value || 'משלוח חינם בהזמנה מעל ₪200');

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">ניהול תוכן</h1>
        <p className="text-zinc-500 font-body text-sm mt-1">באנרים, הודעות והגדרות תצוגה</p>
      </div>

      {/* Top Banner */}
      <div className="bg-[#13131a] border border-white/5 rounded-2xl p-6">
        <h2 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-gold" /> הודעה עליונה (Top Bar)
        </h2>
        <div className="flex gap-3">
          <Input
            value={topBannerText}
            onChange={e => setTopBannerText(e.target.value)}
            className="bg-[#1c1c28] border-white/10 text-white font-body flex-1"
            placeholder="הודעה למשתמשים..."
          />
          <Button onClick={() => saveTopBanner(topBannerText)} className="bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body whitespace-nowrap">
            שמירה
          </Button>
        </div>
      </div>

      {/* Banners */}
      <div className="bg-[#13131a] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-bold text-white flex items-center gap-2">
            <Image className="h-5 w-5 text-gold" /> באנרים פרסומיים
          </h2>
          <Button onClick={() => setOpen(true)} className="bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body h-9 text-sm">
            <Plus className="h-4 w-4 ml-1" /> באנר חדש
          </Button>
        </div>

        {banners.length === 0 ? (
          <p className="text-zinc-600 font-body text-sm text-center py-6">אין באנרים עדיין</p>
        ) : (
          <div className="space-y-3">
            {banners.map(b => {
              let parsed = {};
              try { parsed = JSON.parse(b.value); } catch {}
              return (
                <div key={b.id} className="flex items-center gap-4 bg-[#1c1c28] rounded-xl p-4">
                  {parsed.image_url && <img src={parsed.image_url} alt="" className="w-16 h-10 object-cover rounded-lg" />}
                  <div className="flex-1">
                    <p className="text-white font-medium font-body">{parsed.title || b.label}</p>
                    <p className="text-zinc-500 text-xs font-body">{parsed.subtitle}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteM.mutate(b.id)} className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Banner Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#13131a] border-white/10 text-white max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">באנר חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 font-body text-sm">כותרת</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 font-body text-sm">תת כותרת</Label>
              <Textarea value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} className="bg-[#1c1c28] border-white/10 text-white font-body" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 font-body text-sm">תמונת רקע</Label>
              <Input type="file" accept="image/*" onChange={handleUploadBanner} className="bg-[#1c1c28] border-white/10 text-white font-body" />
              {uploading && <p className="text-gold text-sm font-body">מעלה...</p>}
              {form.image_url && <img src={form.image_url} alt="" className="w-full h-24 object-cover rounded-xl mt-2" />}
            </div>
            <Button onClick={saveBanner} disabled={createM.isPending || !form.title} className="w-full bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body font-semibold h-12">
              {createM.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שמירת באנר'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}