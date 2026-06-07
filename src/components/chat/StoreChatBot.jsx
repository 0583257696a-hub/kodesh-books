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
import { useStoreCategories } from '@/hooks/useStoreCategories';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = ['חפש ספר', 'רבי מכר', 'מבצעים', 'ספרי ילדים', 'סידורים ומחזורים', 'דבר עם נציג'];
const HALACHA_PATTERNS = ['מה הדין', 'מה ההלכה', 'מותר', 'אסור', 'פסק הלכה', 'שאלה הלכתית'];
const CONTACT_PATTERNS = [
  'נציג',
  'וואטסאפ',
  'ווצאפ',
  'תחזרו',
  'תחזור',
  'חזרו אלי',
  'חזור אלי',
  'שיחזרו אלי',
  'שיחזור אלי',
  'חזרה אלי',
  'שיחזרו',
  'צרו קשר',
  'תתקשרו',
  'תתקשר',
  'התקשרו',
  'התקשר',
  'דברו איתי',
  'דבר איתי',
  'בקשת חזרה',
];
const SYNONYMS = {
  'שס': ['גמרא', 'גמרות', 'תלמוד'],
  'ש"ס': ['גמרא', 'גמרות', 'תלמוד'],
  'חומש': ['תורה', 'מקראות גדולות'],
  'רב עובדיה': ['עובדיה יוסף', 'חזון עובדיה', 'יביע אומר'],
  'ילדים': ['נוער', 'ילד', 'ילדה'],
  'מתנה': ['מתנות', 'מתנות יהודיות'],
  'ספר לחתן': ['חתונה', 'שלום בית', 'הדרכת חתנים'],
  'ספר לילד': ['ילדים', 'נוער'],
};
const SEARCH_CACHE = new Map();
const FINAL_LETTERS = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

function getVisitorId() {
  const key = 'otzar_chat_visitor';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(key, next);
  return next;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[״"׳']/g, '')
    .replace(/[.,!?;:()[\]{}\-_/\\|]/g, ' ')
    .replace(/[ךםןףץ]/g, (letter) => FINAL_LETTERS[letter] || letter)
    .replace(/\s+/g, ' ')
    .trim();
}

function singularVariants(term) {
  const variants = [term];
  if (term.endsWith('ים')) variants.push(term.slice(0, -2));
  if (term.endsWith('ות')) variants.push(term.slice(0, -2));
  if (term.endsWith('י') && term.length > 3) variants.push(term.slice(0, -1));
  return variants;
}

function editDistance(a, b) {
  if (!a || !b) return Math.max(a.length, b.length);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev + 1, row[j] + 1, row[j - 1] + 1);
      prev = temp;
    }
  }
  return row[b.length];
}

function expandTerms(text, dynamicSynonyms = []) {
  const base = normalize(text).split(/\s+/).filter(Boolean);
  const staticExtra = Object.entries(SYNONYMS).flatMap(([key, values]) => (
    normalize(text).includes(normalize(key)) ? values.flatMap((value) => normalize(value).split(/\s+/)) : []
  ));
  const dynamicExtra = dynamicSynonyms
    .filter((item) => item.active !== false && normalize(text).includes(normalize(item.term)))
    .sort((a, b) => Number(b.priority || 1) - Number(a.priority || 1))
    .flatMap((item) => normalize(item.equivalent_term).split(/\s+/));
  return [...new Set([...base, ...staticExtra, ...dynamicExtra].flatMap(singularVariants))].filter((term) => term.length > 1);
}

function productText(product, categoryMap = CATEGORY_MAP) {
  return normalize([
    product.name,
    product.author,
    product.rabbi,
    product.publisher,
    product.description,
    product.long_description,
    ...(product.tags || []),
    ...(product.additional_categories || []),
    categoryMap[product.category],
    product.category,
    product.sub_category,
  ].filter(Boolean).join(' '));
}

function isContactIntent(text) {
  const lower = normalize(text);
  return CONTACT_PATTERNS.some((pattern) => lower.includes(normalize(pattern)));
}

function scoreText(haystack, terms) {
  const words = haystack.split(/\s+/).filter(Boolean);
  return terms.reduce((total, term) => {
    if (haystack.includes(term)) return total + 5;
    if (words.some((word) => word.startsWith(term))) return total + 4;
    if (words.some((word) => term.startsWith(word) && word.length > 2)) return total + 2;
    if (term.length >= 5 && words.some((word) => Math.abs(word.length - term.length) <= 1 && editDistance(word, term) <= 1)) return total + 1;
    return total;
  }, 0);
}

function scoreField(value, terms, weight) {
  const text = normalize(value);
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  return terms.reduce((total, term) => {
    if (!term) return total;
    if (text === term) return total + weight * 3;
    if (text.includes(term)) return total + weight * 2;
    if (words.some((word) => word.startsWith(term))) return total + weight * 1.6;
    if (term.length >= 5 && words.some((word) => Math.abs(word.length - term.length) <= 1 && editDistance(word, term) <= 1)) {
      return total + weight * 0.5;
    }
    return total;
  }, 0);
}

function scoreProduct(product, terms, categoryMap = CATEGORY_MAP) {
  return (
    scoreField(product.name, terms, 10) +
    scoreField(product.author, terms, 7) +
    scoreField(product.rabbi, terms, 7) +
    scoreField(product.publisher, terms, 5) +
    scoreField(categoryMap[product.category], terms, 8) +
    scoreField(product.category, terms, 5) +
    scoreField(product.sub_category, terms, 7) +
    scoreField((product.tags || []).join(' '), terms, 8) +
    scoreField((product.additional_categories || []).join(' '), terms, 6) +
    scoreField(product.description, terms, 2) +
    scoreField(product.long_description, terms, 1)
  );
}

function findProducts(products, message, dynamicSynonyms = [], rules = [], categoryMap = CATEGORY_MAP) {
  const cacheKey = `${normalize(message)}|${products.length}|${dynamicSynonyms.length}|${rules.length}`;
  if (SEARCH_CACHE.has(cacheKey)) return SEARCH_CACHE.get(cacheKey);
  const terms = expandTerms(message, dynamicSynonyms);
  if (terms.length === 0) return [];
  const saleMode = normalize(message).includes('מבצע');
  const kidsMode = normalize(message).includes('ילד') || normalize(message).includes('נוער');
  const bestMode = normalize(message).includes('רבי מכר') || normalize(message).includes('מומלץ');
  const ruleTags = rules
    .filter((rule) => rule.active !== false && normalize(message).includes(normalize(rule.trigger_term)))
    .sort((a, b) => Number(b.priority || 1) - Number(a.priority || 1))
    .flatMap((rule) => rule.recommended_tags || []);

  const results = products
    .filter((product) => product.in_stock !== false)
    .map((product) => {
      const haystack = productText(product, categoryMap);
      let score = scoreProduct(product, terms, categoryMap);
      const tags = (product.tags || []).map(normalize);
      score += ruleTags.reduce((total, tag) => total + (tags.includes(normalize(tag)) || haystack.includes(normalize(tag)) ? 8 : 0), 0);
      if (saleMode && product.is_on_sale) score += 8;
      if (bestMode && product.is_featured) score += 8;
      if (kidsMode && (product.category === 'kids' || haystack.includes('ילדים') || haystack.includes('נוער'))) score += 8;
      if (normalize(message).includes('חתן') && (haystack.includes('חתונה') || haystack.includes('שלום בית'))) score += 8;
      if (normalize(product.name).includes(normalize(message))) score += 12;
      return { product, score };
    })
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.product);
  SEARCH_CACHE.set(cacheKey, results);
  if (SEARCH_CACHE.size > 50) SEARCH_CACHE.delete(SEARCH_CACHE.keys().next().value);
  return results;
}

function findFAQ(faqs, message, dynamicSynonyms = []) {
  const terms = expandTerms(message, dynamicSynonyms);
  return faqs
    .filter((faq) => faq.is_active !== false)
    .map((faq) => {
      const text = normalize(`${faq.question} ${faq.answer} ${faq.category || ''} ${(faq.keywords || []).join(' ')}`);
      const score = scoreText(text, terms);
      return { faq, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.faq;
}

export default function StoreChatBot() {
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { settings } = useSiteSettings();
  const { categoryMap } = useStoreCategories();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [lastSearchId, setLastSearchId] = useState(null);
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

  const { data: synonyms = [] } = useQuery({
    queryKey: ['chat-synonyms'],
    queryFn: () => base44.entities.SearchSynonym.list('-priority', 500),
    enabled: enabled && !!base44.entities.SearchSynonym,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['chat-recommendation-rules'],
    queryFn: () => base44.entities.RecommendationRule.list('-priority', 200),
    enabled: enabled && !!base44.entities.RecommendationRule,
  });

  const suggestions = useMemo(() => {
    const q = normalize(input);
    if (q.length < 2) return [];
    return products
      .filter((product) => product.in_stock !== false)
      .map((product) => product.name)
      .filter((name) => normalize(name).includes(q) || normalize(name).split(/\s+/).some((word) => word.startsWith(q)))
      .slice(0, 5);
  }, [input, products]);

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

  const saveSearchAnalytics = async (term, results, session) => {
    try {
      if (!base44.entities.SearchAnalytics?.create) return null;
      const created = await base44.entities.SearchAnalytics.create({
        search_term: term,
        normalized_term: normalize(term),
        visitor_id: visitorId,
        session_id: session,
        results_count: results.length,
        found_results: results.length > 0,
        created_at: new Date().toISOString(),
      });
      if (results.length === 0 && base44.entities.MissingSearch?.create) {
        await base44.entities.MissingSearch.create({
          search_term: term,
          normalized_term: normalize(term),
          count: 1,
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        });
      }
      return created?.id || null;
    } catch {
      return null;
    }
  };

  const trackProductAction = async (field, product) => {
    try {
      if (lastSearchId && base44.entities.SearchAnalytics?.update) {
        await base44.entities.SearchAnalytics.update(lastSearchId, { [field]: product.id });
      } else if (base44.entities.SearchAnalytics?.create) {
        const sid = await ensureSession();
        await base44.entities.SearchAnalytics.create({
          search_term: field === 'clicked_product_id' ? 'product_click' : 'bot_add_to_cart',
          normalized_term: field,
          visitor_id: visitorId,
          session_id: sid,
          results_count: 1,
          found_results: true,
          [field]: product.id,
          created_at: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['search-analytics-admin'] });
    } catch {}
  };

  const handleProductOpen = (product) => {
    trackProductAction('clicked_product_id', product);
    setOpen(false);
  };

  const buildAnswer = (text) => {
    const lower = normalize(text);
    if (isContactIntent(text)) {
      return {
        intent: 'agent',
        text: 'בשמחה. השאר פרטים ונציג יחזור אליך בהקדם, או עבור ישירות לוואטסאפ.',
        products: [],
      };
    }

    if (HALACHA_PATTERNS.some((pattern) => lower.includes(pattern))) {
      const productsFound = findProducts(products, text, synonyms, rules, categoryMap);
      return {
        intent: 'halacha_referral',
        text: 'אינני מספק פסיקה הלכתית. אשמח להמליץ על ספרים בנושא כדי שתוכל ללמוד או להתייעץ עם רב מוסמך.',
        products: productsFound,
      };
    }

    const faq = findFAQ(faqs, text, synonyms);
    const productsFound = findProducts(products, text, synonyms, rules, categoryMap);
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
    const sid = await ensureSession();
    await saveMessage('user', trimmed);
    const answer = buildAnswer(trimmed);
    const searchId = answer.intent === 'agent' ? null : await saveSearchAnalytics(trimmed, answer.products || [], sid);
    setLastSearchId(searchId);
    setMessages((current) => [...current, { role: 'assistant', text: answer.text, products: answer.products, intent: answer.intent }]);
    await saveMessage('assistant', answer.text, answer.intent, answer.products);
    if (answer.intent === 'agent') setLeadOpen(true);
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
                            <Link
                              to={`/product/${product.id}`}
                              onClick={() => handleProductOpen(product)}
                              className="block h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white"
                              aria-label={`פתח את ${product.name}`}
                            >
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center">
                                  <BookOpen className="h-5 w-5 text-gold" />
                                </span>
                              )}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/product/${product.id}`}
                                onClick={() => handleProductOpen(product)}
                                className="line-clamp-2 text-sm font-bold transition hover:text-gold"
                              >
                                {product.name}
                              </Link>
                              <p className="text-xs text-walnut/60">{product.author || product.publisher || CATEGORY_MAP[product.category]}</p>
                              <p className="mt-1 font-bold text-gold">₪{product.sale_price || product.price}</p>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Button asChild variant="outline" className="h-8 border-gold/30 bg-white text-xs text-walnut">
                              <Link to={`/product/${product.id}`} onClick={() => handleProductOpen(product)}>צפה במוצר</Link>
                            </Button>
                            <Button onClick={() => { addItem(product); trackProductAction('added_to_cart_product_id', product); }} className="h-8 bg-gold text-xs text-walnut hover:bg-gold/90">
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
            {suggestions.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full bg-cream px-2.5 py-1 text-xs text-walnut hover:bg-gold/20"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
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
