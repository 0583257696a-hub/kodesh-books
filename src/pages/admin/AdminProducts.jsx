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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Search, Package } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/categories';

const EMPTY = { name: '', description: '', price: 0, sale_price: 0, category: 'chumashim', image_url: '', author: '', sku: '', is_new: false, is_on_sale: false, is_featured: false, in_stock: true };

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

  const createM = useMutation({ mutationFn: d => base44.entities.Product.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setOpen(false); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.Product.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setOpen(false); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.Product.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }) });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by_id, ...data } = editItem;
    if (id) updateM.mutate({ id, data }); else createM.mutate(data);
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditItem(p => ({ ...p, image_url: file_url }));
    setUploading(false);
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.author?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">ניהול מוצרים</h1>
          <p className="text-zinc-500 font-body text-sm mt-1">{products.length} מוצרים</p>
        </div>
        <Button onClick={() => { setEditItem({ ...EMPTY }); setOpen(true); }} className="bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body">
          <Plus className="h-4 w-4 ml-1" /> מוצר חדש
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מוצר..." className="bg-[#13131a] border-white/10 text-white pr-10 font-body placeholder:text-zinc-600" />
      </div>

      {/* Table */}
      <div className="bg-[#13131a] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">מוצר</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">קטגוריה</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">מחיר</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">מלאי</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">תגיות</th>
              <th className="text-right px-6 py-4 text-zinc-500 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-auto mt-2.5 text-zinc-600" />}
                    </div>
                    <div>
                      <p className="text-white font-medium">{p.name}</p>
                      {p.sku && <p className="text-zinc-600 text-xs">SKU: {p.sku}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-400">{CATEGORY_MAP[p.category]}</td>
                <td className="px-6 py-4">
                  {p.is_on_sale && p.sale_price ? (
                    <div><p className="text-gold font-bold">₪{p.sale_price}</p><p className="text-zinc-600 line-through text-xs">₪{p.price}</p></div>
                  ) : <p className="text-white">₪{p.price}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.in_stock ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {p.in_stock ? 'במלאי' : 'אזל'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {p.is_new && <span className="px-2 py-0.5 rounded-full text-xs bg-gold/10 text-gold">חדש</span>}
                    {p.is_on_sale && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">מבצע</span>}
                    {p.is_featured && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400">מוביל</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditItem(p); setOpen(true); }} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteM.mutate(p.id)} className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !isLoading && (
          <div className="text-center py-16 text-zinc-600 font-body">לא נמצאו מוצרים</div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#13131a] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{editItem?.id ? 'עריכת מוצר' : 'מוצר חדש'}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-zinc-300 font-body text-sm">שם המוצר *</Label>
                  <Input value={editItem.name} onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 font-body text-sm">מחבר</Label>
                  <Input value={editItem.author || ''} onChange={e => setEditItem(p => ({ ...p, author: e.target.value }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 font-body text-sm">SKU</Label>
                  <Input value={editItem.sku || ''} onChange={e => setEditItem(p => ({ ...p, sku: e.target.value }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300 font-body text-sm">תיאור מלא</Label>
                <Textarea value={editItem.description || ''} onChange={e => setEditItem(p => ({ ...p, description: e.target.value }))} className="bg-[#1c1c28] border-white/10 text-white font-body" rows={3} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 font-body text-sm">מחיר ₪ *</Label>
                  <Input type="number" value={editItem.price} onChange={e => setEditItem(p => ({ ...p, price: Number(e.target.value) }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 font-body text-sm">מחיר מבצע ₪</Label>
                  <Input type="number" value={editItem.sale_price || ''} onChange={e => setEditItem(p => ({ ...p, sale_price: Number(e.target.value) || 0 }))} className="bg-[#1c1c28] border-white/10 text-white font-body" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 font-body text-sm">קטגוריה</Label>
                  <Select value={editItem.category} onValueChange={v => setEditItem(p => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-[#1c1c28] border-white/10 text-white font-body"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1c1c28] border-white/10">
                      {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-white font-body">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300 font-body text-sm">תמונת מוצר</Label>
                <Input type="file" accept="image/*" onChange={handleImage} className="bg-[#1c1c28] border-white/10 text-white font-body" />
                {uploading && <p className="text-gold text-sm font-body">מעלה תמונה...</p>}
                {editItem.image_url && <img src={editItem.image_url} alt="" className="w-24 h-24 object-cover rounded-xl mt-2 border border-white/10" />}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[{ key: 'is_new', label: 'מוצר חדש' }, { key: 'is_on_sale', label: 'במבצע' }, { key: 'is_featured', label: 'מוצר מומלץ' }, { key: 'in_stock', label: 'במלאי' }].map(sw => (
                  <div key={sw.key} className="flex items-center justify-between bg-[#1c1c28] rounded-xl px-4 py-3">
                    <Label className="text-zinc-300 font-body text-sm">{sw.label}</Label>
                    <Switch checked={!!editItem[sw.key]} onCheckedChange={v => setEditItem(p => ({ ...p, [sw.key]: v }))} />
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={createM.isPending || updateM.isPending} className="w-full bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body font-semibold h-12 mt-2">
                {(createM.isPending || updateM.isPending) ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שמירה'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}