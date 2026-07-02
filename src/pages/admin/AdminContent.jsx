import React, { useEffect, useMemo, useState } from 'react';
import { appApi } from '@/api/internalClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Plus, Trash2, Loader2, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  BANNER_PLACEMENTS,
  DEFAULT_BANNER_PLACEMENT,
  bannerPlacementLabel,
  bannerPlacementSize,
} from '@/lib/bannerPlacements';

const HERO_CONTENT_FIELDS = [
  { key: 'hero_overline', label: 'טקסט עליון', placeholder: 'ברוכים הבאים' },
  { key: 'hero_title_first', label: 'כותרת ראשונה', placeholder: 'אוצר' },
  { key: 'hero_title_second', label: 'כותרת שנייה', placeholder: 'הקדושה' },
  { key: 'hero_subtitle', label: 'תיאור מתחת לכותרת', placeholder: 'ספרי קודש · הכל לבית היהודי' },
  { key: 'hero_primary_cta', label: 'כפתור ראשי', placeholder: 'לקטלוג הספרים' },
  { key: 'hero_secondary_cta', label: 'כפתור משני', placeholder: 'למבצעים חמים' },
];

const TRUST_BADGE_FIELDS = [
  ['trust_badge_1_title', 'יתרון 1 - כותרת', 'משלוחים מהירים'],
  ['trust_badge_1_subtitle', 'יתרון 1 - תיאור', 'עד 5 ימי עסקים'],
  ['trust_badge_2_title', 'יתרון 2 - כותרת', 'מבחר ספרי קודש'],
  ['trust_badge_2_subtitle', 'יתרון 2 - תיאור', 'אלפי כותרים'],
  ['trust_badge_3_title', 'יתרון 3 - כותרת', 'רכישה מאובטחת'],
  ['trust_badge_3_subtitle', 'יתרון 3 - תיאור', 'תשלום בטוח ומוצפן'],
  ['trust_badge_4_title', 'יתרון 4 - כותרת', 'שירות אישי'],
  ['trust_badge_4_subtitle', 'יתרון 4 - תיאור', 'ליווי מקצועי'],
  ['trust_badge_5_title', 'יתרון 5 - כותרת', 'מחירים אטרקטיביים'],
  ['trust_badge_5_subtitle', 'יתרון 5 - תיאור', 'מבצעים שוטפים'],
].map(([key, label, placeholder]) => ({ key, label, placeholder }));

const DEFAULT_BANNER_FORM = {
  title: '',
  subtitle: '',
  cta_text: 'למבצעים',
  cta_url: '/catalog?sale=true',
  image_url: '',
  placement: DEFAULT_BANNER_PLACEMENT,
  is_active: true,
};

export default function AdminContent() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_BANNER_FORM });
  const [uploading, setUploading] = useState(false);
  const [contentValues, setContentValues] = useState({});
  const [savingKey, setSavingKey] = useState('');
  const [contentMessage, setContentMessage] = useState('');
  const [bannerError, setBannerError] = useState('');

  const { data: settings = [] } = useQuery({ queryKey: ['site-settings'], queryFn: () => appApi.entities.SiteSettings.list() });
  const settingsMap = useMemo(() => settings.reduce((map, setting) => {
    if (setting?.key) map[setting.key] = setting;
    return map;
  }, {}), [settings]);

  const banners = settings.filter((setting) => setting.key?.startsWith('banner_'));
  const selectedBannerSize = bannerPlacementSize(form.placement || DEFAULT_BANNER_PLACEMENT);

  useEffect(() => {
    const fields = [...HERO_CONTENT_FIELDS, ...TRUST_BADGE_FIELDS];
    setContentValues(
      fields.reduce((next, field) => {
        next[field.key] = settingsMap[field.key]?.value ?? field.placeholder ?? '';
        return next;
      }, {})
    );
  }, [settingsMap]);

  const createM = useMutation({
    mutationFn: (data) => appApi.entities.SiteSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setForm({ ...DEFAULT_BANNER_FORM });
      setBannerError('');
      setOpen(false);
    },
    onError: (error) => {
      setBannerError(error.message || 'שמירת הבאנר נכשלה.');
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) => appApi.entities.SiteSettings.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-settings'] }),
  });

  const handleUploadBanner = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    setBannerError('');
    try {
      const { file_url } = await appApi.uploads.uploadFile({ file });
      setForm((current) => ({ ...current, image_url: file_url }));
    } catch (error) {
      setBannerError(error.message || 'העלאת תמונת הבאנר נכשלה.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const saveBanner = () => {
    setBannerError('');
    const key = `banner_${Date.now()}`;
    const payload = {
      ...form,
      placement: form.placement || DEFAULT_BANNER_PLACEMENT,
      cta_text: form.cta_text || DEFAULT_BANNER_FORM.cta_text,
      cta_url: form.cta_url || DEFAULT_BANNER_FORM.cta_url,
      is_active: form.is_active !== false,
    };
    createM.mutate({ key, value: JSON.stringify(payload), label: payload.title || 'באנר פרסומי', value_type: 'json' });
  };

  const saveTopBanner = (text) => {
    const existing = settings.find((setting) => setting.key === 'top_banner');
    if (existing) {
      appApi.entities.SiteSettings.update(existing.id, { value: text }).then(() => queryClient.invalidateQueries({ queryKey: ['site-settings'] }));
    } else {
      createM.mutate({ key: 'top_banner', value: text, label: 'הודעה עליונה' });
    }
  };

  const topBannerSetting = settings.find((setting) => setting.key === 'top_banner');
  const [topBannerText, setTopBannerText] = useState(topBannerSetting?.value || 'משלוח חינם בהזמנה מעל ₪200');

  useEffect(() => {
    if (topBannerSetting?.value !== undefined) {
      setTopBannerText(topBannerSetting.value);
    }
  }, [topBannerSetting?.value]);

  const saveContentSetting = async (field) => {
    setSavingKey(field.key);
    setContentMessage('');
    try {
      const existing = settingsMap[field.key];
      const value = contentValues[field.key] ?? '';
      if (existing?.id) {
        await appApi.entities.SiteSettings.update(existing.id, { value });
      } else {
        await appApi.entities.SiteSettings.create({ key: field.key, value, label: field.label });
      }
      setContentMessage('השדה נשמר בהצלחה.');
      await queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (error) {
      setContentMessage(error.message || 'שמירת השדה נכשלה.');
    } finally {
      setSavingKey('');
    }
  };

  const renderEditableField = (field) => (
    <div key={field.key} className="space-y-1.5">
      <Label className="text-sm text-slate-700">{field.label}</Label>
      <div className="flex gap-2">
        <Input
          value={contentValues[field.key] ?? ''}
          onChange={(event) => setContentValues((current) => ({ ...current, [field.key]: event.target.value }))}
          className="flex-1 border-slate-200 bg-white text-slate-950"
          placeholder={field.placeholder}
        />
        <Button
          type="button"
          onClick={() => saveContentSetting(field)}
          disabled={savingKey === field.key}
          variant="outline"
          className="h-10 border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
        >
          {savingKey === field.key ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
        </Button>
      </div>
    </div>
  );

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
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
          <Megaphone className="h-5 w-5 text-blue-600" /> טקסטים במסך הבית
        </h2>
        <p className="mb-5 text-sm text-slate-500">עריכת הכותרת הראשית, התיאור וכפתורי הפעולה שמופיעים בראש האתר.</p>
        {contentMessage && <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{contentMessage}</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          {HERO_CONTENT_FIELDS.map(renderEditableField)}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
          <Image className="h-5 w-5 text-blue-600" /> יתרונות מתחת למסך הבית
        </h2>
        <p className="mb-5 text-sm text-slate-500">עריכת הכותרות והתיאורים של חמשת היתרונות המופיעים מתחת לתמונת הפתיחה.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {TRUST_BADGE_FIELDS.map(renderEditableField)}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-950">
            <Image className="h-5 w-5 text-blue-600" /> באנרים פרסומיים
          </h2>
          <Button
            onClick={() => {
              setForm({ ...DEFAULT_BANNER_FORM });
              setOpen(true);
            }}
            className="h-9 bg-blue-600 text-sm text-white hover:bg-blue-700"
          >
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
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {bannerPlacementLabel(parsed.placement || DEFAULT_BANNER_PLACEMENT)}
                    </p>
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

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setBannerError('');
        }}
      >
        <DialogContent className="max-w-md border-slate-200 bg-white text-slate-950" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">באנר חדש</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            {bannerError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">
                {bannerError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">כותרת</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="border-slate-200 bg-white text-slate-950" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">תת כותרת</Label>
              <Textarea value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} className="border-slate-200 bg-white text-slate-950" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">מיקום הבאנר באתר</Label>
              <Select value={form.placement || DEFAULT_BANNER_PLACEMENT} onValueChange={(value) => setForm((current) => ({ ...current, placement: value }))}>
                <SelectTrigger className="border-slate-200 bg-white text-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {BANNER_PLACEMENTS.map((placement) => (
                    <SelectItem key={placement.value} value={placement.value}>
                      {placement.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                מידה מומלצת למיקום הזה: {selectedBannerSize}. מומלץ להעלות JPG/WebP ביחס רחב, עם מרכז תמונה נקי לטקסט.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">טקסט כפתור</Label>
                <Input value={form.cta_text} onChange={(event) => setForm((current) => ({ ...current, cta_text: event.target.value }))} className="border-slate-200 bg-white text-slate-950" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">קישור כפתור</Label>
                <Input value={form.cta_url} onChange={(event) => setForm((current) => ({ ...current, cta_url: event.target.value }))} className="border-slate-200 bg-white text-slate-950" placeholder="/catalog?sale=true" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">תמונת רקע</Label>
              <Input type="file" accept="image/*" onChange={handleUploadBanner} className="border-slate-200 bg-white text-slate-950" />
              {uploading && <p className="text-sm text-blue-700">מעלה...</p>}
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <Label className="text-sm text-slate-700">באנר פעיל</Label>
              <Switch checked={form.is_active !== false} onCheckedChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
            </div>
            <Button onClick={saveBanner} disabled={createM.isPending || (!form.title && !form.image_url)} className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700">
              {createM.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שמירת באנר'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
