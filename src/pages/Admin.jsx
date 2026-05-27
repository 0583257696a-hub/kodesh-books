import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Package, ShoppingBag, Loader2 } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/categories';

const emptyProduct = { name: '', description: '', price: 0, sale_price: 0, category: 'chumashim', image_url: '', author: '', is_new: false, is_on_sale: false, is_featured: false, in_stock: true };

export default function Admin() {
  const queryClient = useQueryClient();
  const [editProduct, setEditProduct] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setDialogOpen(false); setEditProduct(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setDialogOpen(false); setEditProduct(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const handleSave = () => {
    if (editProduct?.id) {
      const { id, created_date, updated_date, created_by_id, ...data } = editProduct;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(editProduct);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditProduct(prev => ({ ...prev, image_url: file_url }));
    setUploading(false);
  };

  const statusLabels = { pending: 'ממתין', confirmed: 'אושר', shipped: 'נשלח', delivered: 'נמסר', cancelled: 'בוטל' };

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-walnut py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-heading text-3xl font-bold text-cream">פאנל ניהול</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="products" dir="rtl">
          <TabsList className="bg-white border border-gold/10 mb-6">
            <TabsTrigger value="products" className="font-body data-[state=active]:bg-gold data-[state=active]:text-walnut">
              <Package className="h-4 w-4 ml-2" />
              מוצרים
            </TabsTrigger>
            <TabsTrigger value="orders" className="font-body data-[state=active]:bg-gold data-[state=active]:text-walnut">
              <ShoppingBag className="h-4 w-4 ml-2" />
              הזמנות
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading text-xl font-bold">מוצרים ({products.length})</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditProduct({ ...emptyProduct })} className="bg-gold text-walnut hover:bg-gold/90 font-body">
                    <Plus className="h-4 w-4 ml-2" />
                    מוצר חדש
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-cream max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl">{editProduct?.id ? 'עריכת מוצר' : 'מוצר חדש'}</DialogTitle>
                  </DialogHeader>
                  {editProduct && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="font-body">שם המוצר *</Label>
                        <Input value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} className="font-body" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-body">מחבר</Label>
                        <Input value={editProduct.author} onChange={e => setEditProduct({ ...editProduct, author: e.target.value })} className="font-body" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-body">תיאור</Label>
                        <Textarea value={editProduct.description} onChange={e => setEditProduct({ ...editProduct, description: e.target.value })} className="font-body" rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-body">מחיר *</Label>
                          <Input type="number" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: Number(e.target.value) })} className="font-body" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-body">מחיר מבצע</Label>
                          <Input type="number" value={editProduct.sale_price || ''} onChange={e => setEditProduct({ ...editProduct, sale_price: Number(e.target.value) || 0 })} className="font-body" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-body">קטגוריה</Label>
                        <Select value={editProduct.category} onValueChange={v => setEditProduct({ ...editProduct, category: v })}>
                          <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="font-body">{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-body">תמונה</Label>
                        <Input type="file" accept="image/*" onChange={handleImageUpload} className="font-body" />
                        {uploading && <p className="text-sm text-gold font-body">מעלה...</p>}
                        {editProduct.image_url && <img src={editProduct.image_url} alt="" className="w-20 h-20 object-cover rounded-lg mt-2" />}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'is_new', label: 'חדש' },
                          { key: 'is_on_sale', label: 'במבצע' },
                          { key: 'is_featured', label: 'מוביל' },
                          { key: 'in_stock', label: 'במלאי' },
                        ].map(sw => (
                          <div key={sw.key} className="flex items-center justify-between">
                            <Label className="font-body">{sw.label}</Label>
                            <Switch checked={editProduct[sw.key]} onCheckedChange={v => setEditProduct({ ...editProduct, [sw.key]: v })} />
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="w-full bg-gold text-walnut hover:bg-gold/90 font-body py-5">
                        {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-5 w-5 animate-spin" /> : 'שמירה'}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-body text-right">מוצר</TableHead>
                    <TableHead className="font-body text-right">קטגוריה</TableHead>
                    <TableHead className="font-body text-right">מחיר</TableHead>
                    <TableHead className="font-body text-right">סטטוס</TableHead>
                    <TableHead className="font-body text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-body">
                        <div className="flex items-center gap-3">
                          {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                          <span className="font-semibold">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-body">{CATEGORY_MAP[p.category]}</TableCell>
                      <TableCell className="font-body">
                        {p.is_on_sale && p.sale_price ? (
                          <span className="text-gold">₪{p.sale_price} <span className="line-through text-muted-foreground text-xs">₪{p.price}</span></span>
                        ) : `₪${p.price}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.is_new && <Badge className="bg-gold/10 text-gold text-xs font-body">חדש</Badge>}
                          {p.is_on_sale && <Badge className="bg-red-100 text-red-600 text-xs font-body">מבצע</Badge>}
                          {p.is_featured && <Badge className="bg-blue-100 text-blue-600 text-xs font-body">מוביל</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditProduct(p); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <h2 className="font-heading text-xl font-bold mb-6">הזמנות ({orders.length})</h2>
            <div className="bg-white rounded-xl border border-gold/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-body text-right">לקוח</TableHead>
                    <TableHead className="font-body text-right">מוצרים</TableHead>
                    <TableHead className="font-body text-right">סכום</TableHead>
                    <TableHead className="font-body text-right">סטטוס</TableHead>
                    <TableHead className="font-body text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-body">
                        <div>
                          <p className="font-semibold">{o.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-body text-sm">
                        {o.items?.map((item, i) => <div key={i}>{item.product_name} ×{item.quantity}</div>)}
                      </TableCell>
                      <TableCell className="font-body font-bold text-gold">₪{o.total}</TableCell>
                      <TableCell>
                        <Select value={o.status || 'pending'} onValueChange={v => updateOrderMutation.mutate({ id: o.id, data: { status: v } })}>
                          <SelectTrigger className="w-28 font-body text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k} className="font-body">{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-body text-xs text-muted-foreground">
                        {o.shipping_address}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}