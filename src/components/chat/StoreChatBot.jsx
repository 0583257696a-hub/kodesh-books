import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, BookOpen, MessageCircle, Send, ShoppingCart, UserRound, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { buildWhatsappUrl, useSiteSettings } from '@/hooks/useSiteSettings';
import { CATEGORY_MAP } from '@/lib/categories';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = ['חפש ספר', 'רבי מכר', 'מבצעים', 'ספרי ילדים', 'סידורים ומחזורים', 'דבר עם נציג'];
const HALACHA_PATTERNS = ['מה הדין', 'מה ההלכה', 'מותר', 'אסור', 'פסק הלכה', 'שאלה הלכתית'];
const SYNONYMS = {
  'שס': ['גמרא', 'גמרות', 'תלמוד'],
  'ש"ס': ['גמרא', 'גמרות', 'תלמוד'],
  'חומש': ['תורה', 'מקראות גדולות'],
  'רב עובדיה': ['עובדיה יוסף', 'חזון עובדיה', 'יביע אומר'],
  'ילדים': ['נוער', 'ילד', 'ילדה'],
};

function getVisitorId() {
  const key = 'otzar_chat_visitor';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(key, next);
  return next;
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[״"]/g, '').trim();
}

function expandTerms(text) {
  const base = normalize(text).split(/\s+/).filter(Boolean);
  const extra = Object.entries(SYNONYMS).flatMap(([key, values]) => (
    normalize(text).includes(normalize(key)) ? values.flatMap((value) => normalize(value).split(/\s+/)) : []
  ));
  return [...new Set([...base, ...extra])].filter((term) => term.length > 1);
}

function productText(product) {
  return normalize([
    product.name,
    product.author,
    product.rabbi,
    product.publisher,
    product.description,
    product.long_description,
    CATEGORY_MAP[product.category],
    product.category,
    product.sub_category,
  ].filter(Boolean).join(' '));
}

function findProducts(products, message) {
  const terms = expandTerms(message);
  const saleMode = normalize(message).includes('מבצע');
  const kidsMode = normalize(message).includes('ילד') || normalize(message).includes('נוער');
  const bestMode = normalize(message).includes('רבי מכר') || normalize(message).includes('מומלץ');

  return products
    .filter((product) => product.in_stock !== false)
    .map((product) => {
      const haystack = productText(product);
      let score = terms.reduce((total, term) => total + (haystack.includes(term) ? 3 : 0), 0);
      if (saleMode && product.is_on_sale) score += 8;
      if (bestMode && product.is_featured) score += 8;
      if (kidsMode && (product.category === 'kids' || haystack.includes('ילדים') || haystack.includes('נוער'))) score += 8;
      if (normalize(product.name).includes(normalize(message))) score += 12;
      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.product);
}

function findFAQ(faqs, message) {
  const terms = expandTerms(message);
  return faqs
    .filter((faq) => faq.is_active !== false)
    .map((faq) => {
      const text = normalize(`${faq.question} ${faq.answer} ${faq.category || ''}`);
      const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
      return { faq, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.faq;
}

export default function StoreChatBot() {
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { settings } = useSiteSettings();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState({ name: '', phone: '', message: '' });
  const visitorId = useMemo(getVisitorId, []);

  const openingText = settings.ai_chat_opening || 'שלום וברכה. אני ספרן אוצר הקדושה. אשמח לעזור לך למצוא ספרים, מתנות יהודיות או לענות על שאלות על החנות. מה אתה מחפש היום?';
  const chatWhatsapp = settings.ai_chat_whatsapp || settings.whatsapp;
  const [messages, setMessages] = useState([{ role: 'assistant', text: openingText, products: [] }]);
  const enabled = settings.ai_chat_enabled !== 'false';

  const { data: products = [] } = useQuery({
    queryKey: ['chat-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 1000),
    enabled,
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ['chat-faq'],
    queryFn: () => base44.entities.ChatFAQ.list('-created_date', 200),
    enabled: enabled && !!base44.entities.ChatFAQ,
  });

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    if (!base44.entities.ChatSession?.create) return null;
    const created = await base44.entities.ChatSession.create({
      visitor_id: visitorId,
      started_at: new Date().toISOString(),
      searches_count: 0,
    });
    setSessionId(created.id);
    return created.id;
  };

  const saveMessage = async (role, text, intent = 'general', matchedProducts = []) => {
    try {
      const sid = await ensureSession();
      if (!base44.entities.ChatMessage?.create) return;
      await base44.entities.ChatMessage.create({
        session_id: sid,
        visitor_id: visitorId,
        role,
        message: text,
        intent,
        matched_products: matchedProducts.map((product) => product.id),
        created_at: new Date().toISOString(),
      });
    } catch {}
  };

  const buildAnswer = (text) => {
    const lower = normalize(text);
    if (HALACHA_PATTERNS.some((pattern) => lower.includes(pattern))) {
      const productsFound = findProducts(products, text);
      return {
        intent: 'halacha_referral',
        text: 'אינני מספק פסיקה הלכתית. אשמח להמליץ על ספרים בנושא כדי שתוכל ללמוד או להתייעץ עם רב מוסמך.',
        products: productsFound,
      };
    }

    if (lower.includes('נציג') || lower.includes('וואטסאפ') || lower.includes('ווצאפ')) {
      return {
        intent: 'agent',
        text: 'בשמחה. אפשר לדבר עם נציג בוואטסאפ, או להשאיר פרטים ואנחנו נחזור אליך.',
        products: [],
      };
    }

    const faq = findFAQ(faqs, text);
    const productsFound = findProducts(products, text);
    if (productsFound.length) {
      return {
        intent: 'product_search',
        text: `מצאתי ${productsFound.length} ספרים שיכולים להתאים. אפשר לפתוח מוצר או להוסיף אותו לעגלה.`,
        products: productsFound,
      };
    }
    if (faq) {
      return { intent: 'faq', text: faq.answer, products: [] };
    }
    return {
      intent: 'no_results',
      text: 'לא מצאתי התאמה מדויקת בקטלוג. אפשר לנסח שוב, או להשאיר פרטים ונחזור אליך עם המלצה אישית.',
      products: [],
    };
  };

  const sendMessage = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: trimmed, products: [] }]);
    await saveMessage('user', trimmed);
    const answer = buildAnswer(trimmed);
    setMessages((current) => [...current, { role: 'assistant', text: answer.text, products: answer.products, intent: answer.intent }]);
    await saveMessage('assistant', answer.text, answer.intent, answer.products);
    if (answer.intent === 'no_results') setLeadOpen(true);
  };

  const saveLead = async () => {
    if (!lead.phone.trim()) return;
    try {
      const sid = await ensureSession();
      await base44.entities.ChatLead.create({
        ...lead,
        session_id: sid,
        visitor_id: visitorId,
        created_at: new Date().toISOString(),
      });
      setMessages((current) => [...current, { role: 'assistant', text: 'הפרטים נשמרו. נציג יחזור אליך בהקדם.', products: [] }]);
      setLead({ name: '', phone: '', message: '' });
      setLeadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['chat-leads-admin'] });
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'שמירת הפרטים נכשלה. אפשר לפנות אלינו ישירות בוואטסאפ.', products: [] }]);
    }
  };

  if (!enabled) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 font-body" dir="rtl">
      {open && (
        <section className="mb-3 flex h-[min(680px,calc(100vh-120px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-cream shadow-2xl">
          <header className="flex items-center gap-3 bg-walnut px-4 py-3 text-cream">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-walnut">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-base font-bold">ספרן אוצר הקדושה</h2>
              <p className="text-xs text-cream/70">עזרה בחיפוש ספרים והזמנות</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="סגור צ׳אט">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => action === 'דבר עם נציג' ? setLeadOpen(true) : sendMessage(action)}
                  className="rounded-full border border-gold/30 bg-white px-3 py-1.5 text-xs text-walnut shadow-sm hover:border-gold"
                >
                  {action}
                </button>
              ))}
            </div>

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn('flex gap-2', message.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm', message.role === 'user' ? 'bg-walnut text-cream' : 'bg-white text-walnut')}>
                  <p>{message.text}</p>
                  {message.intent === 'agent' && (
                    <a href={buildWhatsappUrl(chatWhatsapp, 'שלום, אשמח לדבר עם נציג מאתר אוצר הקדושה')} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-walnut">
                      מעבר לוואטסאפ
                    </a>
                  )}
                  {message.products?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.products.map((product) => (
                        <div key={product.id} className="rounded-xl border border-gold/20 bg-cream/80 p-2">
                          <div className="flex gap-2">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-16 w-12 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-white">
                                <BookOpen className="h-5 w-5 text-gold" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-bold">{product.name}</p>
                              <p className="text-xs text-walnut/60">{product.author || product.publisher || CATEGORY_MAP[product.category]}</p>
                              <p className="mt-1 font-bold text-gold">₪{product.sale_price || product.price}</p>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Button asChild variant="outline" className="h-8 border-gold/30 bg-white text-xs text-walnut">
                              <Link to={`/product/${product.id}`}>צפה במוצר</Link>
                            </Button>
                            <Button onClick={() => addItem(product)} className="h-8 bg-gold text-xs text-walnut hover:bg-gold/90">
                              <ShoppingCart className="ml-1 h-3.5 w-3.5" /> הוסף
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {leadOpen && (
              <div className="rounded-2xl border border-gold/30 bg-white p-3 shadow-sm">
                <p className="mb-2 text-sm font-bold text-walnut">נחזור אליך עם המלצה</p>
                <div className="space-y-2">
                  <Input value={lead.name} onChange={(event) => setLead((current) => ({ ...current, name: event.target.value }))} placeholder="שם" />
                  <Input value={lead.phone} onChange={(event) => setLead((current) => ({ ...current, phone: event.target.value }))} placeholder="טלפון" />
                  <Textarea value={lead.message} onChange={(event) => setLead((current) => ({ ...current, message: event.target.value }))} placeholder="מה אתה מחפש?" rows={2} />
                  <Button onClick={saveLead} className="h-9 w-full bg-gold text-walnut hover:bg-gold/90">שליחת פרטים</Button>
                </div>
              </div>
            )}
          </div>

          <form className="border-t border-gold/20 bg-white p-3" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <div className="flex gap-2">
              <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="כתוב מה אתה מחפש..." className="h-10" />
              <Button type="submit" className="h-10 w-10 bg-walnut p-0 text-cream hover:bg-walnut/90" aria-label="שליחה">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-walnut text-gold shadow-xl ring-2 ring-gold/30 transition hover:scale-105"
        aria-label="פתח צ׳אט ספרן"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
