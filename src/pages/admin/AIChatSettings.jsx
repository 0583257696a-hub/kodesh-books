import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, MessageSquare, Plus, Save, Trash2, UserRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const SETTING_KEYS = ['ai_chat_enabled', 'ai_chat_opening', 'ai_chat_whatsapp'];

function settingsToMap(settings = []) {
  return settings.reduce((map, setting) => {
    map[setting.key] = setting;
    return map;
  }, {});
}

export default function AIChatSettings() {
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState({
    ai_chat_enabled: true,
    ai_chat_opening: 'שלום וברכה. אני ספרן אוצר הקדושה. אשמח לעזור לך למצוא ספרים, מתנות יהודיות או לענות על שאלות על החנות. מה אתה מחפש היום?',
    ai_chat_whatsapp: '',
  });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'כללי', is_active: true });

  const { data: settings = [] } = useQuery({ queryKey: ['site-settings'], queryFn: () => base44.entities.SiteSettings.list() });
  const { data: faqs = [] } = useQuery({ queryKey: ['chat-faq-admin'], queryFn: () => base44.entities.ChatFAQ.list('-created_date', 200) });
  const { data: sessions = [] } = useQuery({ queryKey: ['chat-sessions-admin'], queryFn: () => base44.entities.ChatSession.list('-created_date', 200) });
  const { data: messages = [] } = useQuery({ queryKey: ['chat-messages-admin'], queryFn: () => base44.entities.ChatMessage.list('-created_date', 500) });
  const { data: leads = [] } = useQuery({ queryKey: ['chat-leads-admin'], queryFn: () => base44.entities.ChatLead.list('-created_date', 200) });

  const settingsMap = useMemo(() => settingsToMap(settings), [settings]);
  const activeFaqs = faqs.filter((faq) => faq.is_active !== false);
  const commonQuestions = useMemo(() => {
    const counts = messages
      .filter((message) => message.role === 'user')
      .reduce((map, message) => {
        const text = message.message?.trim();
        if (!text) return map;
        map[text] = (map[text] || 0) + 1;
        return map;
      }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [messages]);

  useEffect(() => {
    if (!settings.length) return;
    setSettingsForm((current) => ({
      ...current,
      ai_chat_enabled: settingsMap.ai_chat_enabled?.value !== 'false',
      ai_chat_opening: settingsMap.ai_chat_opening?.value || current.ai_chat_opening,
      ai_chat_whatsapp: settingsMap.ai_chat_whatsapp?.value || settingsMap.whatsapp?.value || '',
    }));
  }, [settings, settingsMap]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      for (const key of SETTING_KEYS) {
        const value = key === 'ai_chat_enabled' ? String(settingsForm[key]) : settingsForm[key];
        const existing = settingsMap[key];
        if (existing) {
          await base44.entities.SiteSettings.update(existing.id, { value });
        } else {
          await base44.entities.SiteSettings.create({ key, value, label: key });
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-settings'] }),
  });

  const createFaq = useMutation({
    mutationFn: (data) => base44.entities.ChatFAQ.create(data),
    onSuccess: () => {
      setFaqForm({ question: '', answer: '', category: 'כללי', is_active: true });
      queryClient.invalidateQueries({ queryKey: ['chat-faq-admin'] });
      queryClient.invalidateQueries({ queryKey: ['chat-faq'] });
    },
  });

  const deleteFaq = useMutation({
    mutationFn: (id) => base44.entities.ChatFAQ.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-faq-admin'] });
      queryClient.invalidateQueries({ queryKey: ['chat-faq'] });
    },
  });

  return (
    <div className="min-h-screen space-y-6 bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">צ׳אט AI</h1>
        <p className="mt-1 text-sm text-slate-500">ניהול ספרן דיגיטלי, FAQ, שיחות ולידים.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['שיחות', sessions.length],
          ['הודעות', messages.length],
          ['לידים', leads.length],
          ['שאלות FAQ פעילות', activeFaqs.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Bot className="h-5 w-5 text-blue-600" /> הגדרות בוט
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className="font-semibold">הפעלת הבוט באתר</span>
            <Switch
              checked={settingsForm.ai_chat_enabled}
              onCheckedChange={(value) => setSettingsForm((current) => ({ ...current, ai_chat_enabled: value }))}
            />
          </label>
          <div className="space-y-1.5">
            <Label>וואטסאפ לנציג</Label>
            <Input
              value={settingsForm.ai_chat_whatsapp}
              onChange={(event) => setSettingsForm((current) => ({ ...current, ai_chat_whatsapp: event.target.value }))}
              placeholder="972548029242"
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label>הודעת פתיחה</Label>
            <Textarea
              value={settingsForm.ai_chat_opening}
              onChange={(event) => setSettingsForm((current) => ({ ...current, ai_chat_opening: event.target.value }))}
              rows={4}
            />
          </div>
        </div>
        <Button onClick={() => saveSettings.mutate()} className="mt-4 bg-blue-600 text-white hover:bg-blue-700">
          <Save className="ml-2 h-4 w-4" /> שמירת הגדרות
        </Button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <MessageSquare className="h-5 w-5 text-blue-600" /> ניהול FAQ לבוט
        </h2>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_auto]">
          <Input value={faqForm.question} onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))} placeholder="שאלה" />
          <Input value={faqForm.answer} onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))} placeholder="תשובה קצרה" />
          <Input value={faqForm.category} onChange={(event) => setFaqForm((current) => ({ ...current, category: event.target.value }))} placeholder="קטגוריה" />
          <Button onClick={() => createFaq.mutate(faqForm)} disabled={!faqForm.question || !faqForm.answer} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="ml-2 h-4 w-4" /> הוסף
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex-1">
                <p className="font-semibold">{faq.question}</p>
                <p className="text-sm text-slate-600">{faq.answer}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteFaq.mutate(faq.id)} className="text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {faqs.length === 0 && <p className="py-4 text-center text-sm text-slate-500">אין שאלות FAQ עדיין.</p>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">שאלות נפוצות בצ׳אט</h2>
          <div className="space-y-2">
            {commonQuestions.map(([question, count]) => (
              <div key={question} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm">
                <span>{question}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
            {commonQuestions.length === 0 && <p className="py-4 text-center text-sm text-slate-500">אין שאלות עדיין.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <UserRound className="h-5 w-5 text-blue-600" /> לידים מהצ׳אט
          </h2>
          <div className="space-y-2">
            {leads.slice(0, 10).map((lead) => (
              <div key={lead.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold">{lead.name || 'ללא שם'} | {lead.phone}</p>
                <p className="text-slate-600">{lead.message}</p>
              </div>
            ))}
            {leads.length === 0 && <p className="py-4 text-center text-sm text-slate-500">אין לידים מהצ׳אט עדיין.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
