import React from 'react';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-5xl font-heading font-bold text-white mb-3">403</h1>
        <h2 className="text-xl font-heading text-zinc-300 mb-3">גישה נדחתה</h2>
        <p className="text-zinc-500 font-body mb-8 max-w-sm">
          אין לך הרשאות לגשת לאזור זה. הגישה מוגבלת למנהלי מערכת בלבד.
        </p>
        <Button
          onClick={() => window.location.href = '/'}
          className="bg-gold text-[#0a0a0f] hover:bg-gold/90 font-body px-8"
        >
          חזרה לאתר
        </Button>
      </div>
    </div>
  );
}