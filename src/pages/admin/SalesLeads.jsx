import React, { useMemo, useState } from 'react';
import { appApi } from '@/api/internalClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { format, isAfter, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { Mail, MessageCircle, Phone, Search, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildAbandonedCarts, buildLeads, currency, LEAD_STATUSES, PIPELINE_COLUMNS, safeDate } from '@/lib/businessCenterData';
import { getLocalAnalyticsEvents } from '@/lib/ecommerceTracking';

const q = async (entity, fallback = []) => {
  try {
    return await appApi.entities[entity].list('-created_date', 500);
  } catch {
    return fallback;
  }
};

const pipelineStatus = {
  'New Visitor': 'New Lead',
  Registered: 'Registered',
  'Added Product To Cart': 'Cart Created',
  'Checkout Started': 'Checkout Started',
  'Payment Pending': 'Waiting For Payment',
  'Payment Completed': 'Completed',
  'Closed Sale': 'Completed',
  Contacted: 'Waiting For Payment',
  'Abandoned Cart': 'Lost',
};

const badgeColor = {
  'New Visitor': 'bg-slate-100 text-slate-700',
  Registered: 'bg-blue-50 text-blue-700',
  'Added Product To Cart': 'bg-indigo-50 text-indigo-700',
  'Checkout Started': 'bg-cyan-50 text-cyan-700',
  'Payment Pending': 'bg-amber-50 text-amber-700',
  'Payment Completed': 'bg-emerald-50 text-emerald-700',
  'Abandoned Cart': 'bg-rose-50 text-rose-700',
  Contacted: 'bg-violet-50 text-violet-700',
  'Closed Sale': 'bg-green-50 text-green-700',
};

const statusLabel = {
  'New Visitor': 'מבקר חדש',
  Registered: 'נרשם',
  'Added Product To Cart': 'הוסיף לעגלה',
  'Checkout Started': 'התחיל תשלום',
  'Payment Pending': 'ממתין לתשלום',
  'Payment Completed': 'תשלום הושלם',
  'Abandoned Cart': 'עגלה נטושה',
  Contacted: 'נוצר קשר',
  'Closed Sale': 'מכירה נסגרה',
};

const pipelineLabel = {
  'New Lead': 'ליד חדש',
  Registered: 'נרשם',
  'Cart Created': 'נוצרה עגלה',
  'Checkout Started': 'התחיל תשלום',
  'Waiting For Payment': 'ממתין לתשלום',
  Completed: 'הושלם',
  Lost: 'אבד',
};

function LeadActions({ lead }) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="icon" variant="outline" className="h-8 w-8 border-slate-200 text-slate-600">
        <a href={`tel:${lead.phone}`} aria-label="התקשר ללקוח"><Phone className="h-4 w-4" /></a>
      </Button>
      <Button asChild size="icon" variant="outline" className="h-8 w-8 border-slate-200 text-emerald-600">
        <a href={`https://wa.me/${lead.phone?.replace(/\D/g, '') || ''}`} target="_blank" rel="noreferrer" aria-label="שלח וואטסאפ"><MessageCircle className="h-4 w-4" /></a>
      </Button>
      <Button asChild size="icon" variant="outline" className="h-8 w-8 border-slate-200 text-blue-600">
        <a href={`mailto:${lead.email}`} aria-label="שלח אימייל"><Mail className="h-4 w-4" /></a>
      </Button>
    </div>
  );
}

function LeadTable({ leads, onStatusChange, onNoteChange }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[1050px] text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {['לקוח', 'פרטי קשר', 'תאריך הרשמה', 'פעילות אחרונה', 'שווי עגלה', 'ספרים בעגלה', 'סטטוס', 'הערות', 'פעולות'].map((head) => (
              <th key={head} className="px-4 py-3 text-right font-semibold">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
              <td className="px-4 py-4">
                <p className="font-semibold text-slate-950">{lead.full_name}</p>
                <p className="text-xs text-slate-500">{lead.source === 'user' ? 'לקוח רשום' : lead.source === 'order' ? 'מתוך הזמנה' : 'ליד'}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-slate-700">{lead.email}</p>
                <p className="text-xs text-slate-500">{lead.phone || 'אין טלפון'}</p>
              </td>
              <td className="px-4 py-4 text-slate-600">{format(safeDate(lead.registration_date), 'dd/MM/yyyy')}</td>
              <td className="px-4 py-4 text-slate-600">{format(safeDate(lead.last_activity), 'dd/MM/yyyy HH:mm')}</td>
              <td className="px-4 py-4 font-semibold text-slate-950">{currency(lead.cart_value)}</td>
              <td className="px-4 py-4 text-slate-600">{lead.products_in_cart?.join(', ') || 'None'}</td>
              <td className="px-4 py-4">
                <Select value={lead.status} onValueChange={(value) => onStatusChange(lead.id, value)}>
                  <SelectTrigger className={`h-9 min-w-44 border-0 text-xs font-semibold ${badgeColor[lead.status] || badgeColor.Registered}`}>
                    <SelectValue>{statusLabel[lead.status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusLabel[status]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-4">
                <Textarea
                  defaultValue={lead.notes || ''}
                  onBlur={(event) => onNoteChange(lead.id, event.target.value)}
                  placeholder="הוסף הערה"
                  className="min-h-9 w-48 resize-none border-slate-200 text-xs"
                />
              </td>
              <td className="px-4 py-4"><LeadActions lead={lead} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pipeline({ leads, onMove }) {
  const grouped = PIPELINE_COLUMNS.reduce((acc, column) => ({ ...acc, [column]: [] }), {});
  leads.forEach((lead) => grouped[pipelineStatus[lead.status] || 'New Lead'].push(lead));

  return (
    <DragDropContext onDragEnd={(result) => {
      if (!result.destination) return;
      const lead = leads.find((item) => item.id === result.draggableId);
      const destination = result.destination.droppableId;
      const status = Object.entries(pipelineStatus).find(([, column]) => column === destination)?.[0] || 'Contacted';
      if (lead) onMove(lead.id, status);
    }}>
      <div className="grid min-w-[1100px] grid-cols-7 gap-3">
        {PIPELINE_COLUMNS.map((column) => (
          <Droppable key={column} droppableId={column}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">{pipelineLabel[column]}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{grouped[column].length}</span>
                </div>
                <div className="space-y-2">
                  {grouped[column].map((lead, index) => (
                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                        >
                          <p className="truncate text-sm font-semibold text-slate-950">{lead.full_name}</p>
                          <p className="truncate text-xs text-slate-500">{lead.email}</p>
                          <p className="mt-2 text-sm font-semibold text-blue-700">{currency(lead.cart_value)}</p>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}

export default function SalesLeads() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('week');
  const [overrides, setOverrides] = useState({});
  const [notes, setNotes] = useState({});

  const { data = {} } = useQuery({
    queryKey: ['sales-leads-center'],
    queryFn: async () => ({
      users: await q('User'),
      orders: await q('Order'),
      products: await q('Product'),
      leads: await q('Lead'),
      events: [...await q('AnalyticsEvent'), ...getLocalAnalyticsEvents()],
    }),
  });

  const leads = useMemo(() => buildLeads(data).map((lead) => ({
    ...lead,
    status: overrides[lead.id] || lead.status,
    notes: notes[lead.id] ?? lead.notes,
  })), [data, notes, overrides]);

  const filteredLeads = leads.filter((lead) => {
    const haystack = `${lead.full_name} ${lead.email} ${lead.phone}`.toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  });

  const abandoned = buildAbandonedCarts(filteredLeads).filter((lead) => {
    const date = safeDate(lead.last_activity);
    if (range === 'today') return isAfter(date, startOfDay(new Date()));
    if (range === 'month') return isAfter(date, startOfMonth(new Date()));
    return isAfter(date, startOfWeek(new Date()));
  });

  const saveLeadM = useMutation({
    mutationFn: async ({ lead, patch }) => {
      const payload = {
        id: lead.id,
        name: lead.full_name,
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        status: patch.status ?? lead.status,
        notes: patch.notes ?? lead.notes ?? '',
        source: lead.source || 'lead',
        registration_date: lead.registration_date,
        last_activity_at: lead.last_activity,
        cart_value: lead.cart_value || 0,
        products_in_cart: lead.products_in_cart || [],
      };
      const updated = await appApi.entities.Lead.update(lead.id, payload);
      if (updated?.id) return updated;
      return appApi.entities.Lead.create(payload);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sales-leads-center'] }),
  });

  const persistLead = (id, patch) => {
    const lead = leads.find((item) => item.id === id);
    if (lead) saveLeadM.mutate({ lead, patch });
  };

  const updateStatus = (id, status) => {
    setOverrides((current) => ({ ...current, [id]: status }));
    persistLead(id, { status });
  };

  const updateNote = (id, note) => {
    setNotes((current) => ({ ...current, [id]: note }));
    persistLead(id, { notes: note });
  };

  return (
    <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">לקוחות ומכירות</h1>
          <p className="mt-1 text-sm text-slate-500">מעקב מלא אחרי מסע הלקוח: הרשמה, עגלה, תשלום, עגלות נטושות ויצירת קשר.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-blue-800"><p className="text-xs">לידים פתוחים</p><p className="text-2xl font-bold">{filteredLeads.length}</p></div>
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-rose-800"><p className="text-xs">עגלות נטושות</p><p className="text-2xl font-bold">{abandoned.length}</p></div>
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800"><p className="text-xs">מכירות שנסגרו</p><p className="text-2xl font-bold">{filteredLeads.filter((lead) => lead.status === 'Closed Sale').length}</p></div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש לקוחות" className="border-slate-200 pl-9" />
        </div>
      </div>

      <Tabs defaultValue="leads">
        <TabsList className="mb-5 bg-slate-100">
          <TabsTrigger value="leads">ניהול לידים</TabsTrigger>
          <TabsTrigger value="abandoned">עגלות נטושות</TabsTrigger>
          <TabsTrigger value="pipeline">משפך מכירות</TabsTrigger>
        </TabsList>
        <TabsContent value="leads">
          <LeadTable leads={filteredLeads} onStatusChange={updateStatus} onNoteChange={updateNote} />
        </TabsContent>
        <TabsContent value="abandoned">
          <div className="mb-4 flex gap-2">
            {[['today', 'היום'], ['week', 'השבוע'], ['month', 'החודש']].map(([value, label]) => (
              <Button key={value} variant={range === value ? 'default' : 'outline'} onClick={() => setRange(value)} className={range === value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border-slate-200'}>
                {label}
              </Button>
            ))}
          </div>
          <LeadTable leads={abandoned} onStatusChange={updateStatus} onNoteChange={updateNote} />
        </TabsContent>
        <TabsContent value="pipeline">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
            <Pipeline leads={filteredLeads} onMove={updateStatus} />
          </div>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <UserRoundCheck className="mb-2 h-5 w-5" />
            מוכן להרחבות עתידיות: וואטסאפ, קמפיינים במייל, SMS, שערי תשלום ומערכות הנהלת חשבונות יוכלו להתחבר לשינויי סטטוס של לקוחות.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
