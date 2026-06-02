import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Search, Package } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/categories';

const EMPTY = {
  name: '',
  description: '',
  price: 0,
  sale_price: 0,
  category: 'chumashim',
  image_url: '',
  author: '',
  sku: '',
  is_new: false,
  is_on_sale: false,
  is_featured: false,
  in_stock: true,
};

const tagClass = {
  new: 'bg-amber-50 text-amber-700 border-amber-100',
  sale: 'bg-rose-50 text-rose-700 border-rose-100',
  featured: 'bg-blue-50 text-blue-700 border-blue-100',
  stock: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  out: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
  });

  const createM = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setOpen(false);
    },
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setOpen(false);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by_id, ...data } = editItem;
    if (id) {
      updateM.mutate({ id, data });
    } else {
      createM.mutate(data);
    }
  };

  const handleImage = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditItem((current) => ({ ...current, image_url: file_url }));
    setUploading(false);
  };

  const filtered = products.filter((product) => {
    const q = search.toLowerCase();
    return (
      product.name?.toLowerCase().includes(q) ||
      product.author?.toLowerCase().includes(q) ||
      product.rabbi?.toLowerCase().includes(q) ||
      product.publisher?.toLowerCase().includes(q) ||
      product.barcode?.toLowerCase().includes(q) ||
      product.sub_category?.toLowerCase().includes(q) ||
      CATEGORY_MAP[product.category]?.toLowerCase().includes(q) ||
      product.sku?.toLowerCase().includes(q)
    );
  });

  const isSaving = createM.isPending || updateM.isPending;

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול מוצרים</h1>
          <p className="mt-1 text-sm text-slate-500">{products.length} מוצרים בחנות</p>
        </div>
        <Button
          onClick={() => {
            setEditItem({ ...EMPTY });
            setOpen(true);
          }}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="ml-2 h-4 w-4" />
          מוצר חדש
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש מוצר..."
            className="border-slate-200 bg-white pr-10 text-slate-950 placeholder:text-slate-400"
          />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} מוצרים מוצגים</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 text-right font-semibold">מוצר</th>
                <th className="px-5 py-3 text-right font-semibold">קטגוריה</th>
                <th className="px-5 py-3 text-right font-semibold">מחיר</th>
                <th className="px-5 py-3 text-right font-semibold">מלאי</th>
                <th className="px-5 py-3 text-right font-semibold">תגיות</th>
                <th className="px-5 py-3 text-right font-semibold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name || 'מוצר'} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[360px] truncate font-semibold text-slate-950">{product.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {product.author && <span>{product.author}</span>}
                          {product.sku && <span>מק״ט: {product.sku}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{CATEGORY_MAP[product.category] || '-'}</td>
                  <td className="px-5 py-4">
                    {product.is_on_sale && product.sale_price ? (
                      <div>
                        <p className="font-bold text-blue-700">₪{product.sale_price}</p>
                        <p className="text-xs text-slate-400 line-through">₪{product.price}</p>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-950">₪{product.price}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${product.in_stock ? tagClass.stock : tagClass.out}`}>
                      {product.in_stock ? 'במלאי' : 'אזל'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {product.is_new && <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tagClass.new}`}>חדש</span>}
                      {product.is_on_sale && <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tagClass.sale}`}>מבצע</span>}
                      {product.is_featured && <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tagClass.featured}`}>מומלץ</span>}
                      {!product.is_new && !product.is_on_sale && !product.is_featured && <span className="text-xs text-slate-400">אין תגיות</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditItem(product);
                          setOpen(true);
                        }}
                        className="h-8 w-8 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteM.mutate(product.id)}
                        className="h-8 w-8 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !isLoading && (
          <div className="py-16 text-center text-sm text-slate-500">לא נמצאו מוצרים</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-slate-200 bg-white text-slate-950" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editItem?.id ? 'עריכת מוצר' : 'מוצר חדש'}</DialogTitle>
          </DialogHeader>

          {editItem && (
            <div className="mt-2 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-sm text-slate-700">שם המוצר *</Label>
                  <Input value={editItem.name} onChange={(event) => setEditItem((current) => ({ ...current, name: event.target.value }))} className="border-slate-200 bg-white text-slate-950" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-700">מחבר</Label>
                  <Input value={editItem.author || ''} onChange={(event) => setEditItem((current) => ({ ...current, author: event.target.value }))} className="border-slate-200 bg-white text-slate-950" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-700">מק״ט</Label>
                  <Input value={editItem.sku || ''} onChange={(event) => setEditItem((current) => ({ ...current, sku: event.target.value }))} className="border-slate-200 bg-white text-slate-950" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">תיאור מלא</Label>
                <Textarea value={editItem.description || ''} onChange={(event) => setEditItem((current) => ({ ...current, description: event.target.value }))} className="border-slate-200 bg-white text-slate-950" rows={3} />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-700">מחיר ₪ *</Label>
                  <Input type="number" value={editItem.price} onChange={(event) => setEditItem((current) => ({ ...current, price: Number(event.target.value) }))} className="border-slate-200 bg-white text-slate-950" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-700">מחיר מבצע ₪</Label>
                  <Input type="number" value={editItem.sale_price || ''} onChange={(event) => setEditItem((current) => ({ ...current, sale_price: Number(event.target.value) || 0 }))} className="border-slate-200 bg-white text-slate-950" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-700">קטגוריה</Label>
                  <Select value={editItem.category} onValueChange={(value) => setEditItem((current) => ({ ...current, category: value }))}>
                    <SelectTrigger className="border-slate-200 bg-white text-slate-950"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">תמונת מוצר</Label>
                <Input type="file" accept="image/*" onChange={handleImage} className="border-slate-200 bg-white text-slate-950" />
                {uploading && <p className="text-sm text-blue-700">מעלה תמונה...</p>}
                {editItem.image_url && <img src={editItem.image_url} alt="תמונת מוצר" className="mt-2 h-24 w-24 rounded-lg border border-slate-200 object-cover" />}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { key: 'is_new', label: 'מוצר חדש' },
                  { key: 'is_on_sale', label: 'במבצע' },
                  { key: 'is_featured', label: 'מוצר מומלץ' },
                  { key: 'in_stock', label: 'במלאי' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <Label className="text-sm text-slate-700">{item.label}</Label>
                    <Switch checked={!!editItem[item.key]} onCheckedChange={(value) => setEditItem((current) => ({ ...current, [item.key]: value }))} />
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שמירה'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
