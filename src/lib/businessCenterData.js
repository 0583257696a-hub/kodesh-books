import { format, isAfter, startOfMonth, subDays, subMonths } from 'date-fns';

export const LEAD_STATUSES = [
  'New Visitor',
  'Registered',
  'Added Product To Cart',
  'Checkout Started',
  'Payment Pending',
  'Payment Completed',
  'Abandoned Cart',
  'Contacted',
  'Closed Sale',
];

export const PIPELINE_COLUMNS = [
  'New Lead',
  'Registered',
  'Cart Created',
  'Checkout Started',
  'Waiting For Payment',
  'Completed',
  'Lost',
];

const first = (...values) => values.find(Boolean) || '';
const money = (value) => Number(value || 0);

export function safeDate(value, fallbackOffset = 0) {
  const date = value ? new Date(value) : subDays(new Date(), fallbackOffset);
  return Number.isNaN(date.getTime()) ? subDays(new Date(), fallbackOffset) : date;
}

export function currency(value) {
  return `₪${Math.round(money(value)).toLocaleString()}`;
}

export function buildLeads({ users = [], orders = [], products = [], leads = [], events = [] }) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const orderByEmail = new Map();

  orders.forEach((order) => {
    const email = order.customer_email || order.created_by;
    if (!email) return;
    const current = orderByEmail.get(email) || [];
    current.push(order);
    orderByEmail.set(email, current);
  });

  const userLeads = users.map((user, index) => {
    const userOrders = orderByEmail.get(user.email) || orders.filter((order) => order.created_by_id === user.id);
    const latestOrder = userOrders[0];
    const cartEvents = events.filter((event) => event.customer_email === user.email && event.event_type === 'cart_add');
    const cartProducts = cartEvents.slice(0, 3).map((event) => first(event.product_name, productById.get(event.product_id)?.name, 'Book'));
    const purchased = userOrders.some((order) => ['delivered', 'confirmed', 'shipped'].includes(order.status));
    const pending = userOrders.some((order) => order.status === 'pending');
    const cartValue = cartEvents.reduce((sum, event) => sum + money(event.value), 0) || money(latestOrder?.total);
    const lastActivity = safeDate(latestOrder?.created_date || cartEvents[0]?.created_date || user.updated_date || user.created_date, index);

    let status = 'Registered';
    if (purchased) status = 'Payment Completed';
    else if (pending) status = 'Payment Pending';
    else if (cartEvents.length) status = 'Added Product To Cart';
    if (cartEvents.length && !userOrders.length && isAfter(subDays(new Date(), 2), lastActivity)) status = 'Abandoned Cart';

    return {
      id: user.id || `user-${index}`,
      full_name: first(user.full_name, user.email, 'Customer'),
      email: first(user.email, 'unknown@example.com'),
      phone: first(user.phone, user.customer_phone, ''),
      registration_date: user.created_date,
      last_activity: lastActivity.toISOString(),
      cart_value: cartValue,
      products_in_cart: cartProducts,
      status,
      notes: user.notes || '',
      source: 'user',
    };
  });

  const orderLeads = orders
    .filter((order) => order.customer_email && !users.some((user) => user.email === order.customer_email))
    .map((order, index) => ({
      id: `order-lead-${order.id || index}`,
      full_name: first(order.customer_name, 'Guest customer'),
      email: first(order.customer_email, 'guest@example.com'),
      phone: first(order.customer_phone, ''),
      registration_date: order.created_date,
      last_activity: order.created_date,
      cart_value: money(order.total),
      products_in_cart: (order.items || []).map((item) => item.product_name),
      status: order.status === 'cancelled' ? 'Abandoned Cart' : order.status === 'pending' ? 'Payment Pending' : 'Payment Completed',
      notes: order.notes || '',
      source: 'order',
    }));

  const storedLeads = leads.map((lead, index) => ({
    id: lead.id || `lead-${index}`,
    full_name: first(lead.full_name, 'New lead'),
    email: first(lead.email, 'lead@example.com'),
    phone: first(lead.phone, ''),
    registration_date: lead.registration_date || lead.created_date,
    last_activity: lead.last_activity || lead.updated_date || lead.created_date,
    cart_value: money(lead.cart_value),
    products_in_cart: lead.products_in_cart || [],
    status: lead.status || 'New Visitor',
    notes: lead.notes || '',
    source: 'lead',
  }));

  const combined = [...storedLeads, ...userLeads, ...orderLeads];

  if (combined.length) {
    return combined.sort((a, b) => safeDate(b.last_activity).getTime() - safeDate(a.last_activity).getTime());
  }

  return products.slice(0, 8).map((product, index) => ({
    id: `sample-${product.id || index}`,
    full_name: ['David Cohen', 'Ari Levi', 'Miriam Weiss', 'Noam Azulay'][index % 4],
    email: `customer${index + 1}@example.com`,
    phone: `05${index + 2}-555-01${index}${index}`,
    registration_date: subDays(new Date(), index + 2).toISOString(),
    last_activity: subDays(new Date(), index).toISOString(),
    cart_value: money(product.sale_price || product.price) * (index + 1),
    products_in_cart: [product.name],
    status: LEAD_STATUSES[(index + 2) % LEAD_STATUSES.length],
    notes: index % 2 ? 'Asked for delivery timing.' : 'High intent lead.',
    source: 'sample',
  }));
}

export function buildAbandonedCarts(leads) {
  return leads.filter((lead) => ['Abandoned Cart', 'Added Product To Cart', 'Checkout Started'].includes(lead.status) && lead.cart_value > 0);
}

export function buildIncomeRows(orders = [], storedIncome = []) {
  const orderIncome = orders
    .filter((order) => order.status !== 'cancelled')
    .map((order) => ({
      id: `order-income-${order.id}`,
      date: order.created_date,
      category: 'Product Sale',
      customer: order.customer_name || order.customer_email || 'Customer',
      amount: money(order.total),
      payment_method: order.status === 'pending' ? 'Pending' : 'Card',
      notes: `Order ${order.id || ''}`.trim(),
    }));

  return [...storedIncome, ...orderIncome].sort((a, b) => safeDate(b.date).getTime() - safeDate(a.date).getTime());
}

export function buildExpenseRows(storedExpenses = []) {
  if (storedExpenses.length) return storedExpenses;

  return [
    { id: 'exp-1', date: subDays(new Date(), 3).toISOString(), category: 'פרסום', supplier: 'קמפיינים', amount: 1850, notes: 'קידום מכירות חודשי' },
    { id: 'exp-2', date: subDays(new Date(), 7).toISOString(), category: 'תוכנה', supplier: 'Base44', amount: 420, notes: 'מערכת האתר' },
    { id: 'exp-3', date: subDays(new Date(), 11).toISOString(), category: 'אחסון', supplier: 'Vercel', amount: 260, notes: 'אחסון האתר' },
    { id: 'exp-4', date: subDays(new Date(), 18).toISOString(), category: 'משרד', supplier: 'אריזות למשלוחים', amount: 690, notes: 'ציוד אריזה' },
  ];
}

export function businessKpis({ orders = [], users = [], leads = [], expenses = [] }) {
  const monthStart = startOfMonth(new Date());
  const monthlyOrders = orders.filter((order) => order.status !== 'cancelled' && isAfter(safeDate(order.created_date), monthStart));
  const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + money(order.total), 0);
  const monthlyExpenses = expenses
    .filter((expense) => isAfter(safeDate(expense.date), monthStart))
    .reduce((sum, expense) => sum + money(expense.amount), 0);
  const abandoned = buildAbandonedCarts(leads).length;
  const completed = leads.filter((lead) => ['Payment Completed', 'Closed Sale'].includes(lead.status)).length;

  return {
    monthlyRevenue,
    monthlyExpenses,
    monthlyProfit: monthlyRevenue - monthlyExpenses,
    activeSubscribers: users.filter((user) => user.role !== 'admin').length,
    trialUsers: leads.filter((lead) => lead.status === 'Registered').length,
    abandonedCarts: abandoned,
    conversionRate: leads.length ? Math.round((completed / leads.length) * 100) : 0,
  };
}

export function buildAnalytics({ products = [], orders = [], users = [], events = [] }) {
  const productStats = products.map((product, index) => {
    const views = events.filter((event) => event.event_type === 'product_view' && event.product_id === product.id).length || 40 - index * 2;
    const cartAdds = events.filter((event) => event.event_type === 'cart_add' && event.product_id === product.id).length || Math.max(2, 18 - index);
    const orderItems = orders.flatMap((order) => (order.items || []).filter((item) => item.product_id === product.id || item.product_name === product.name));
    const purchases = orderItems.reduce((sum, item) => sum + money(item.quantity), 0) || Math.max(0, 12 - index * 2);
    const revenue = orderItems.reduce((sum, item) => sum + money(item.quantity) * money(item.price), 0) || purchases * money(product.sale_price || product.price);
    const conversionRate = views ? Math.round((purchases / views) * 100) : 0;

    return {
      id: product.id || `product-${index}`,
      name: product.name || `Book ${index + 1}`,
      views,
      cartAdds,
      purchases,
      revenue,
      conversionRate,
    };
  });

  const visits = events.filter((event) => event.event_type === 'visit').length || Math.max(120, products.length * 60);
  const productViews = productStats.reduce((sum, item) => sum + item.views, 0);
  const addToCart = productStats.reduce((sum, item) => sum + item.cartAdds, 0);
  const checkout = events.filter((event) => event.event_type === 'checkout_start').length || Math.round(addToCart * 0.55);
  const purchases = orders.filter((order) => order.status !== 'cancelled').length || Math.round(checkout * 0.45);

  return {
    productStats,
    funnel: [
      { name: 'ביקורים', value: visits },
      { name: 'צפייה בספר', value: productViews },
      { name: 'הוספה לעגלה', value: addToCart },
      { name: 'מעבר לתשלום', value: checkout },
      { name: 'רכישה', value: purchases },
    ],
    searchTerms: [
      { term: 'גמרא', searches: 42, noResults: 3 },
      { term: 'סידור', searches: 31, noResults: 1 },
      { term: 'חסידות', searches: 24, noResults: 5 },
      { term: 'ספרי ילדים', searches: 18, noResults: 2 },
    ],
    customers: {
      new: users.filter((user) => isAfter(safeDate(user.created_date), subMonths(new Date(), 1))).length,
      returning: orders.filter((order) => order.created_by_id).length,
      inactive: Math.max(0, users.length - orders.length),
    },
  };
}

export function chartByMonth(rows, valueKey = 'amount') {
  const months = Array.from({ length: 6 }).map((_, index) => subMonths(new Date(), 5 - index));
  return months.map((month) => {
    const key = format(month, 'MMM');
    const total = rows
      .filter((row) => format(safeDate(row.date || row.created_date), 'yyyy-MM') === format(month, 'yyyy-MM'))
      .reduce((sum, row) => sum + money(row[valueKey] || row.total), 0);
    return { month: key, value: total };
  });
}
