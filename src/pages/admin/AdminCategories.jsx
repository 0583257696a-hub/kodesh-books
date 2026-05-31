import React, { useState } from 'react';
import { Loader2, FolderOpen } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [catImages, setCatImages] = useState({ ...CATEGORY_IMAGES });

  const handleImageUpload = async (catId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCatImages((current) => ({ ...current, [catId]: file_url }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight">ניהול קטגוריות</h1>
        <p className="mt-1 text-sm text-slate-500">{CATEGORIES.length} קטגוריות באתר</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-video overflow-hidden bg-slate-100">
              <img src={catImages[cat.id]} alt={cat.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-950/0 opacity-0 transition-all group-hover:bg-slate-950/40 group-hover:opacity-100">
                <div className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-slate-950 shadow-sm">
                  החלף תמונה
                  {uploading && <Loader2 className="mx-auto mt-1 h-4 w-4 animate-spin text-blue-600" />}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(cat.id, event)} />
              </label>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <p className="font-bold text-slate-950">{cat.name}</p>
              </div>
              <a href={`/catalog?category=${cat.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800">
                צפייה
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
        לעריכת שמות קטגוריות ומזהים יש לעדכן את הקובץ <code className="rounded bg-white px-1.5 py-0.5 text-blue-700">lib/categories.js</code>.
      </div>
    </div>
  );
}
