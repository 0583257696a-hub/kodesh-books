import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, FolderOpen, Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

const CATEGORY_IMAGES = {
  chumashim: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/c7956dabc_generated_58adb81d.png',
  gemarot: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/522a640b6_generated_aae8d1f9.png',
  halacha: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/492a71714_generated_ef0436d4.png',
  chassidut: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f0982ad6d_generated_8f79bc9b.png',
  kids: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/cd371a324_generated_686fa02d.png',
  siddurim: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/f910326d1_generated_d7cb5ac1.png',
  tashmishei_kedusha: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/583d0969f_generated_5e782f7b.png',
  gifts: 'https://media.base44.com/images/public/6a16fe7abf75ec5b5710e703/0d11dfa5e_generated_df9cd4ac.png',
};

export default function AdminCategories() {
  const [editCat, setEditCat] = useState(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catImages, setCatImages] = useState({ ...CATEGORY_IMAGES });

  const { base44 } = window.__base44__ || {};

  const handleImageUpload = async (catId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { base44: sdk } = await import('@/api/base44Client');
      const { file_url } = await sdk.integrations.Core.UploadFile({ file });
      setCatImages(p => ({ ...p, [catId]: file_url }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-white">ניהול קטגוריות</h1>
        <p className="text-zinc-500 font-body text-sm mt-1">{CATEGORIES.length} קטגוריות</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="bg-[#13131a] border border-white/5 rounded-2xl overflow-hidden group">
            <div className="relative aspect-video overflow-hidden">
              <img src={catImages[cat.id]} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/40" />
              <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/50">
                <div className="text-center">
                  <p className="text-white font-body text-xs mb-1">החלף תמונה</p>
                  {uploading && <Loader2 className="h-4 w-4 text-gold animate-spin mx-auto" />}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(cat.id, e)} />
              </label>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-gold" />
                <p className="text-white font-heading font-bold">{cat.name}</p>
              </div>
              <a href={`/catalog?category=${cat.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-gold transition-colors font-body">
                צפה ←
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-[#13131a] border border-white/5 rounded-2xl p-6">
        <p className="text-zinc-500 font-body text-sm">
          💡 לעריכת שמות קטגוריות ומזהים, ערוך את הקובץ <code className="text-gold bg-gold/10 px-1.5 py-0.5 rounded text-xs">lib/categories.js</code>
        </p>
      </div>
    </div>
  );
}