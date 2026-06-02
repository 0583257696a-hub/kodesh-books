import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Bot, Link2, MessageSquare, Plus, Save, Sparkles, Trash2, UserRound } from 'lucide-react';
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

function aggregate(items, key) {
  const counts = items.reduce((map, item) => {
    const value = item[key] || item.search_term;
    if (!value) return map;
    map[value] = (map[value] || 0) + Number(item.count || 1);
    return map;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function aggregateIds(ids, productById) {
  const counts = ids.reduce((map, id) => {
    if (!id) return map;
    map[id] = (map[id] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts)
    .map(([id, count]) => [productById.get(id)?.name || id, count])
    .sort((a, b) => b[1] - a[1]);
}

function InsightList({ title, items }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 font-bold">{title}</h3>
      <div className="space-y-2">
        {items.slice(0, 8).map(([label, count]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
            <span className="truncate">{label}</span>
            <span className="font-bold text-blue-700">{count}</span>
          </div>
        ))}
        {items.length === 0 && <p className="py-3 text-center text-sm text-slate-500">אין נתונים עדיין</p>}
      </div>
    </div>
  );
}

function AdminRows({ items, onDelete, render }) {
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <span className="flex-1">{render(item)}</span>
          <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-8 w-8 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="py-4 text-center text-sm text-slate-500">אין רשומות עדיין.</p>}
    </div>
  );
}

export default function AIChatSettings() {
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState({
    ai_chat_enabled: true,
    ai_chat_opening: 'שלום וברכה. אני ספרן אוצר הקדושה. אשמח לעזור לך למצוא ספרים, מתנות יהודיות או לענות על שאלות על החנות. מה אתה מחפש היום?',
    ai_chat_whatsapp: '',
  });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'כללי', is_active: true });
  const [synonymForm, setSynonymForm] = useState({ term: '', equivalent_term: '', priority: 1, active: true });
  const [ruleForm, setRuleForm] = useState({ trigger_term: '', recommended_tags: '', priority: 1, active: true });

  const { data: settings = [] } = useQuery({ queryKey: ['site-settings'], queryFn: () => base44.entities.SiteSettings.list() });
  const { data: faqs = [] } = useQuery({ queryKey: ['chat-faq-admin'], queryFn: () => base44.entities.ChatFAQ.list('-created_date', 200) });
  const { data: sessions = [] } = useQuery({ queryKey: ['chat-sessions-admin'], queryFn: () => base44.entities.ChatSession.list('-created_date', 200) });
  const { data: messages = [] } = useQuery({ queryKey: ['chat-messages-admin'], queryFn: () => base44.entities.ChatMessage.list('-created_date', 500) });
  const { data: leads = [] } = useQuery({ queryKey: ['chat-leads-admin'], queryFn: () => base44.entities.ChatLead.list('-created_date', 200) });
  const { data: searches = [] } = useQuery({ queryKey: ['search-analytics-admin'], queryFn: () => base44.entities.SearchAnalytics.list('-created_at', 1000) });
  const { data: missing = [] } = useQuery({ queryKey: ['missing-searches-admin'], queryFn: () => base44.entities.MissingSearch.list('-created_at', 1000) });
  const { data: synonyms = [] } = useQuery({ queryKey: ['chat-synonyms-admin'], queryFn: () => base44.entities.SearchSynonym.list('-priority', 500) });
  const { data: rules = [] } = useQuery({ queryKey: ['chat-rules-admin'], queryFn: () => base44.entities.RecommendationRule.list('-priority', 200) });
  const { data: products = [] } = useQuery({ queryKey: ['admin-products-chat-intelligence'], queryFn: () => base44.entities.Product.list('-created_date', 10000) });

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
  const conversionRate = searches.length ? Math.round((searches.filter((item) => item.added_to_cart_product_id).length / searches.length) * 100) : 0;
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const topSearches = useMemo(() => aggregate(searches, 'normalized_term').slice(0, 8), [searches]);
  const missingSearches = useMemo(() => aggregate(missing, 'normalized_term').slice(0, 8), [missing]);
  const requestedProducts = useMemo(() => aggregateIds(searches.flatMap((item) => item.clicked_product_id ? [item.clicked_product_id] : []), productById).slice(0, 8), [searches, productById]);
  const cartProducts = useMemo(() => aggregateIds(searches.flatMap((item) => item.added_to_cart_product_id ? [item.added_to_cart_product_id] : []), productById).slice(0, 8), [searches, productById]);

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

  const createSynonym = useMutation({
    mutationFn: (data) => base44.entities.SearchSynonym.create({ ...data, priority: Number(data.priority || 1) }),
    onSuccess: () => {
      setSynonymForm({ term: '', equivalent_term: '', priority: 1, active: true });
      queryClient.invalidateQueries({ queryKey: ['chat-synonyms-admin'] });
      queryClient.invalidateQueries({ queryKey: ['chat-synonyms'] });
    },
  });

  const deleteSynonym = useMutation({
    mutationFn: (id) => base44.entities.SearchSynonym.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-synonyms-admin'] });
      queryClient.invalidateQueries({ queryKey: ['chat-synonyms'] });
    },
  });

  const createRule = useMutation({
    mutationFn: (data) => base44.entities.RecommendationRule.create({
      trigger_term: data.trigger_term,
      recommended_tags: data.recommended_tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      priority: Number(data.priority || 1),
      active: data.active,
    }),
    onSuccess: () => {
      setRuleForm({ trigger_term: '', recommended_tags: '', priority: 1, active: true });
      queryClient.invalidateQueries({ queryKey: ['chat-rules-admin'] });
      queryClient.invalidateQueries({ queryKey: ['chat-recommendation-rules'] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (id) => base44.entities.RecommendationRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-rules-admin'] });
      queryClient.invalidateQueries({ queryKey: ['chat-recommendation-rules'] });
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
          ['יחס המרה לעגלה', `${conversionRate}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="h-5 w-5 text-blue-600" /> Chat Intelligence
        </h2>
        <div className="grid gap-4 lg:grid-cols-4">
          <InsightList title="חיפושים נפוצים" items={topSearches} />
          <InsightList title="חיפושים ללא תוצאה" items={missingSearches} />
          <InsightList title="מוצרים שנפתחו מהבוט" items={requestedProducts} />
          <InsightList title="נוספו לעגלה מהבוט" items={cartProducts} />
        </div>
      </section>

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
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_180px_auto]">
          <Input value={faqForm.question} onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))} placeholder="שאלה" />
          <Input value={faqForm.answer} onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))} placeholder="תשובה קצרה" />
          <Input value={faqForm.category} onChange={(event) => setFaqForm((current) => ({ ...current, category: event.target.value }))} placeholder="קטגוריה" />
          <Input
            value={(faqForm.keywords || []).join(', ')}
            onChange={(event) => setFaqForm((current) => ({ ...current, keywords: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))}
            placeholder="מילות מפתח"
          />
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
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Link2 className="h-5 w-5 text-blue-600" /> מילים נרדפות
          </h2>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_90px_auto]">
            <Input value={synonymForm.term} onChange={(event) => setSynonymForm((current) => ({ ...current, term: event.target.value }))} placeholder="מונח: ש״ס" />
            <Input value={synonymForm.equivalent_term} onChange={(event) => setSynonymForm((current) => ({ ...current, equivalent_term: event.target.value }))} placeholder="מקביל: גמרא" />
            <Input type="number" value={synonymForm.priority} onChange={(event) => setSynonymForm((current) => ({ ...current, priority: event.target.value }))} placeholder="עדיפות" />
            <Button onClick={() => createSynonym.mutate(synonymForm)} disabled={!synonymForm.term || !synonymForm.equivalent_term} className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="ml-2 h-4 w-4" /> הוסף
            </Button>
          </div>
          <AdminRows items={synonyms} onDelete={(id) => deleteSynonym.mutate(id)} render={(item) => `${item.term} → ${item.equivalent_term}`} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-blue-600" /> כללי המלצה
          </h2>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_90px_auto]">
            <Input value={ruleForm.trigger_term} onChange={(event) => setRuleForm((current) => ({ ...current, trigger_term: event.target.value }))} placeholder="חיפוש: ספר לחתן" />
            <Input value={ruleForm.recommended_tags} onChange={(event) => setRuleForm((current) => ({ ...current, recommended_tags: event.target.value }))} placeholder="תגיות: חתונה, שלום בית" />
            <Input type="number" value={ruleForm.priority} onChange={(event) => setRuleForm((current) => ({ ...current, priority: event.target.value }))} placeholder="עדיפות" />
            <Button onClick={() => createRule.mutate(ruleForm)} disabled={!ruleForm.trigger_term} className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="ml-2 h-4 w-4" /> הוסף
            </Button>
          </div>
          <AdminRows items={rules} onDelete={(id) => deleteRule.mutate(id)} render={(item) => `${item.trigger_term} → ${(item.recommended_tags || []).join(', ')}`} />
        </section>
      </div>

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
