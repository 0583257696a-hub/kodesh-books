import React from 'react';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4" dir="rtl">
      <div className="text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-lg border border-rose-100 bg-rose-50">
          <ShieldX className="h-10 w-10 text-rose-600" />
        </div>
        <h1 className="mb-3 text-5xl font-bold text-slate-950">403</h1>
        <h2 className="mb-3 text-xl font-bold text-slate-800">גישה נדחתה</h2>
        <p className="mb-8 max-w-sm text-slate-500">
          אין לך הרשאות לגשת לאזור זה. הגישה מוגבלת למנהלי מערכת בלבד.
        </p>
        <Button
          onClick={() => window.location.href = '/'}
          className="bg-blue-600 px-8 text-white hover:bg-blue-700"
        >
          חזרה לאתר
        </Button>
      </div>
    </div>
  );
}
