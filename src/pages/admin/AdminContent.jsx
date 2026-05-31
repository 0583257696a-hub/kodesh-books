import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Plus, Trash2, Loader2, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', cta_text: 'למבצעים', image_url: '', is_active: true });
  const [uploading, setUploading] = useState(false);

  const { data: settings = [] } = useQuery({ queryKey: ['site-settings'], queryFn: () => base44.entities.SiteSettings.list() });

  const banners = settings.filter((setting) => setting.key?.startsWith('banner_'));

  const createM = useMutation({
    mutationFn: (data) => base44.entities.SiteSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setOpen(false);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) => base44.entities.SiteSettings.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-settings'] }),
  });

  const handleUploadBanner = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((current) => ({ ...current, image_url: file_url }));
    setUploading(false);
  };

  const saveBanner = () => {
    const key = `banner_${Date.now()}`;
    createM.mutate({ key, value: JSON.stringify(form), label: form.title });
  };

  const saveTopBanner = (text) => {
    const existing = settings.find((setting) => setting.key === 'top_banner');
    if (existing) {
      base44.entities.SiteSettings.update(existing.id, { value: text }).then(() => queryClient.invalidateQueries({ queryKey: ['site-settings'] }));
    } else {
      createM.mutate({ key: 'top_banner', value: text, label: 'הודעה עליונה' });
    }
  };

  const topBannerSetting = settings.find((setting) => setting.key === 'top_banner');
  const [topBannerText, setTopBannerText] = useState(topBannerSetting?.value || 'משלוח חינם בהזמנה מעל ₪200');

  return (
    <div className="min-h-screen space-y-8 bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ניהול תוכן</h1>
        <p className="mt-1 text-sm text-slate-500">באנרים, הודעות והגדרות תצוגה באתר.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-950">
          <Megaphone className="h-5 w-5 text-blue-600" /> הודעה עליונה
        </h2>
        <div className="flex gap-3">
          <Input
            value={topBannerText}
            onChange={(event) => setTopBannerText(event.target.value)}
            className="flex-1 border-slate-200 bg-white text-slate-950"
            placeholder="הודעה למשתמשים..."
          />
          <Button onClick={() => saveTopBanner(topBannerText)} className="whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700">
            שמירה
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-950">
            <Image className="h-5 w-5 text-blue-600" /> באנרים פרסומיים
          </h2>
          <Button onClick={() => setOpen(true)} className="h-9 bg-blue-600 text-sm text-white hover:bg-blue-700">
            <Plus className="ml-1 h-4 w-4" /> באנר חדש
          </Button>
        </div>

        {banners.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">אין באנרים עדיין</p>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => {
              let parsed = {};
              try {
                parsed = JSON.parse(banner.value);
              } catch {}
              return (
                <div key={banner.id} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {parsed.image_url && <img src={parsed.image_url} alt="" className="h-10 w-16 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <p className="font-semibold text-slate-950">{parsed.title || banner.label}</p>
                    <p className="text-xs text-slate-500">{parsed.subtitle}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteM.mutate(banner.id)} className="h-8 w-8 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-slate-200 bg-white text-slate-950" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">באנר חדש</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">כותרת</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="border-slate-200 bg-white text-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">תת כותרת</Label>
              <Textarea value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} className="border-slate-200 bg-white text-slate-950" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">תמונת רקע</Label>
              <Input type="file" accept="image/*" onChange={handleUploadBanner} className="border-slate-200 bg-white text-slate-950" />
              {uploading && <p className="text-sm text-blue-700">מעלה...</p>}
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />}
            </div>
            <Button onClick={saveBanner} disabled={createM.isPending || !form.title} className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700">
              {createM.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שמירת באנר'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
