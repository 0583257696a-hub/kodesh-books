import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appApi } from '@/api/internalClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORY_IMAGES, buildCategoryCollections } from '@/hooks/useStoreCategories';
import { imageKeyFromImageUrl, uploadCategoryImage } from '@/services/uploadService';
import { Boxes, FolderOpen, Loader2, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react';

const EMPTY_CATEGORY = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  r2_key: '',
  icon: 'FolderOpen',
  display_order: 100,
  show_in_home: true,
  show_in_nav: true,
  active: true,
};

const slugifyHebrew = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 60);

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: storedCategories = [], isLoading } = useQuery({
    queryKey: ['store-categories-admin'],
    queryFn: () => appApi.entities.StoreCategory.list('display_order', 500),
    retry: false,
  });

  const { categories } = useMemo(
    () => buildCategoryCollections(storedCategories, { includeInactive: true }),
    [storedCategories]
  );
  const activeCategoryCount = categories.filter((category) => category.active).length;

  const saveMutation = useMutation({
    mutationFn: async (category) => {
      const payload = {
        name: category.name.trim(),
        slug: slugifyHebrew(category.slug || category.name),
        description: category.description || '',
        image_url: category.image_url || '',
        r2_key: category.r2_key || '',
        icon: category.icon || 'FolderOpen',
        display_order: Number(category.display_order || 100),
        show_in_home: category.show_in_home !== false,
        show_in_nav: category.show_in_nav !== false,
        active: category.active !== false,
      };

      if (category.record_id) {
        return appApi.entities.StoreCategory.update(category.record_id, payload);
      }

      const existing = storedCategories.find((item) => item.slug === payload.slug);
      if (existing) {
        return appApi.entities.StoreCategory.update(existing.id, payload);
      }

      return appApi.entities.StoreCategory.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories-admin'] });
      setOpen(false);
      setEditItem(null);
      setFormError('');
    },
    onError: (error) => setFormError(error.message || 'שמירת הקטגוריה נכשלה.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (category) => {
      const confirmation = window.prompt(`כדי להסיר את הקטגוריה "${category.name}", כתוב בדיוק: הסר קטגוריה`);
      if (confirmation !== 'הסר קטגוריה') {
        return null;
      }

      if (category.system) {
        const payload = {
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          image_url: category.image_url || '',
          r2_key: category.r2_key || '',
          icon: category.icon || 'FolderOpen',
          display_order: Number(category.display_order || 100),
          show_in_home: false,
          show_in_nav: false,
          active: false,
        };

        if (category.record_id) {
          return appApi.entities.StoreCategory.update(category.record_id, payload);
        }

        return appApi.entities.StoreCategory.create(payload);
      }

      if (category.record_id) {
        return appApi.entities.StoreCategory.delete(category.record_id);
      }

      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories-admin'] });
    },
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const categorySlug = slugifyHebrew(editItem?.slug || editItem?.name) || 'new-category';
      const image = await uploadCategoryImage(file, {
        categorySlug,
        altText: editItem?.name || file.name,
        replaceImageKey: editItem?.r2_key || imageKeyFromImageUrl(editItem?.image_url),
        replaceImageUrl: editItem?.image_url,
      });
      if (image?.image_url) {
        setEditItem((current) => ({
          ...current,
          image_url: image.image_url,
          r2_key: image.image_key || current?.r2_key || '',
        }));
      }
    } catch (error) {
      setFormError(error.message || 'העלאת תמונת הקטגוריה נכשלה.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const openEditor = (category = EMPTY_CATEGORY) => {
    setFormError('');
    setEditItem({
      ...EMPTY_CATEGORY,
      ...category,
      slug: category.slug || category.id || '',
      image_url: category.image_url || CATEGORY_IMAGES[category.slug || category.id] || '',
      r2_key: category.r2_key || '',
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!editItem?.name?.trim()) {
      setFormError('יש למלא שם קטגוריה.');
      return;
    }
    if (!slugifyHebrew(editItem.slug || editItem.name)) {
      setFormError('יש למלא מזהה קטגוריה תקין.');
      return;
    }
    setFormError('');
    saveMutation.mutate(editItem);
  };

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול קטגוריות</h1>
          <p className="mt-1 text-sm text-slate-500">
            {categories.length} קטגוריות מוגדרות, {activeCategoryCount} פעילות באתר. קטגוריה חדשה תופיע בתפריט, בקטלוג ובקובץ האקסל לייבוא.
          </p>
        </div>
        <Button onClick={() => openEditor()} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="ml-2 h-4 w-4" />
          קטגוריה חדשה
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="ml-2 h-5 w-5 animate-spin" />
          טוען קטגוריות...
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <div key={cat.slug} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-50">
                    <Boxes className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  {cat.active ? 'פעילה' : 'כבויה'}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                      <p className="truncate font-bold text-slate-950">{cat.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{cat.slug}</p>
                  </div>
                  <a href={`/catalog?category=${cat.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                    צפייה
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {cat.show_in_nav && <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">בתפריט</span>}
                  {cat.show_in_home && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">בדף הבית</span>}
                  {!cat.record_id && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">ברירת מחדל</span>}
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEditor(cat)} className="flex-1">
                    <Pencil className="ml-2 h-4 w-4" />
                    עריכה
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(cat)}
                    disabled={deleteMutation.isPending}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-slate-200 bg-white text-slate-950" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editItem?.record_id || editItem?.slug ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</DialogTitle>
          </DialogHeader>

          {editItem && (
            <div className="space-y-5">
              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>שם קטגוריה *</Label>
                  <Input
                    value={editItem.name}
                    onChange={(event) => setEditItem((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: current.record_id || current.slug ? current.slug : slugifyHebrew(event.target.value),
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>מזהה קטגוריה *</Label>
                  <Input
                    value={editItem.slug}
                    onChange={(event) => setEditItem((current) => ({ ...current, slug: slugifyHebrew(event.target.value) }))}
                    placeholder="לדוגמה: sifrei_chabad"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>תיאור קצר</Label>
                <Textarea
                  value={editItem.description || ''}
                  onChange={(event) => setEditItem((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <Label>תמונת קטגוריה</Label>
                  <Input value={editItem.image_url || ''} onChange={(event) => setEditItem((current) => ({ ...current, image_url: event.target.value }))} />
                </div>
                <label className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">
                  {uploading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UploadCloud className="ml-2 h-4 w-4" />}
                  העלאה
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {editItem.image_url && <img src={editItem.image_url} alt={editItem.name || 'תמונת קטגוריה'} className="h-28 w-44 rounded-lg border border-slate-200 object-cover" />}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>סדר תצוגה</Label>
                  <Input
                    type="number"
                    value={editItem.display_order}
                    onChange={(event) => setEditItem((current) => ({ ...current, display_order: Number(event.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>שם אייקון</Label>
                  <Input
                    value={editItem.icon || 'FolderOpen'}
                    onChange={(event) => setEditItem((current) => ({ ...current, icon: event.target.value }))}
                    placeholder="FolderOpen"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ['show_in_nav', 'הצגה בתפריט'],
                  ['show_in_home', 'הצגה בדף הבית'],
                  ['active', 'קטגוריה פעילה'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <Label>{label}</Label>
                    <Switch checked={editItem[key] !== false} onCheckedChange={(value) => setEditItem((current) => ({ ...current, [key]: value }))} />
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !editItem.name.trim() || !slugifyHebrew(editItem.slug || editItem.name)}
                className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שמירה'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
