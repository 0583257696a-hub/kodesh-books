import { listCategories, listProducts } from './catalogService.js';
import { listOrders } from './orderService.js';
import { disableAdminAccessForEmail, syncCustomerAdminAccess } from './customerAuthService.js';
import { nowIso, numberValue, parseJson, stringValue } from './http.js';

const ENTITY_CONFIGS = {
  User: {
    table: 'customers',
    fields: ['base44_user_id', 'email', 'full_name', 'phone', 'role', 'city', 'shipping_address', 'last_activity_at'],
    order: 'created_at DESC',
  },
  SiteSettings: {
    table: 'site_settings',
    fields: ['base44_id', 'key', 'value', 'label', 'value_type', 'is_public'],
    booleans: ['is_public'],
    defaults: { value_type: 'string', is_public: 1 },
    order: 'key ASC',
  },
  Coupon: {
    table: 'coupons',
    fields: ['base44_id', 'code', 'discount_percent', 'expiry_date', 'max_uses', 'used_count', 'is_active', 'description'],
    booleans: ['is_active'],
    numbers: ['discount_percent', 'max_uses', 'used_count'],
    order: 'created_at DESC',
  },
  StoreCategory: {
    table: 'categories',
    fields: ['base44_id', 'name', 'slug', 'description', 'image_url', 'r2_key', 'icon', 'display_order', 'show_in_home', 'show_in_nav', 'active'],
    booleans: ['show_in_home', 'show_in_nav', 'active'],
    numbers: ['display_order'],
    order: 'display_order ASC, name ASC',
  },
  AnalyticsEvent: {
    table: 'analytics_events',
    fields: ['base44_id', 'event_type', 'product_id', 'product_name', 'customer_id', 'customer_email', 'value', 'metadata_json', 'description'],
    json: { metadata: 'metadata_json' },
    numbers: ['value'],
    order: 'created_at DESC',
  },
  ImportHistory: {
    table: 'imports',
    fields: ['base44_id', 'file_name', 'import_type', 'categories_imported_json', 'products_created', 'products_updated', 'products_skipped', 'errors_json', 'user_email', 'description'],
    aliases: { action: 'import_type' },
    json: { categories_imported: 'categories_imported_json', errors: 'errors_json' },
    numbers: ['products_created', 'products_updated', 'products_skipped'],
    defaults: { import_type: 'bulk_products' },
    order: 'created_at DESC',
  },
  Testimonial: {
    table: 'testimonials',
    fields: ['name', 'content', 'rating', 'is_active'],
    booleans: ['is_active'],
    numbers: ['rating'],
    order: 'created_at DESC',
  },
  ChatFAQ: {
    table: 'chat_faqs',
    fields: ['question', 'answer', 'category', 'keywords_json', 'is_active'],
    json: { keywords: 'keywords_json' },
    booleans: ['is_active'],
    order: 'created_at DESC',
  },
  ChatSession: {
    table: 'chat_sessions',
    fields: ['visitor_id', 'started_at', 'searches_count'],
    numbers: ['searches_count'],
    order: 'created_at DESC',
  },
  ChatMessage: {
    table: 'chat_messages',
    fields: ['session_id', 'visitor_id', 'role', 'message', 'intent', 'matched_products_json'],
    json: { matched_products: 'matched_products_json' },
    order: 'created_at DESC',
  },
  ChatLead: {
    table: 'chat_leads',
    fields: ['name', 'phone', 'email', 'message', 'session_id', 'visitor_id', 'status', 'source', 'registration_date', 'last_activity_at', 'cart_value', 'products_in_cart_json', 'notes'],
    aliases: { full_name: 'name', last_activity: 'last_activity_at' },
    json: { products_in_cart: 'products_in_cart_json' },
    numbers: ['cart_value'],
    order: 'created_at DESC',
  },
  Lead: {
    table: 'chat_leads',
    fields: ['name', 'phone', 'email', 'message', 'session_id', 'visitor_id', 'status', 'source', 'registration_date', 'last_activity_at', 'cart_value', 'products_in_cart_json', 'notes'],
    aliases: { full_name: 'name', last_activity: 'last_activity_at' },
    json: { products_in_cart: 'products_in_cart_json' },
    numbers: ['cart_value'],
    order: 'created_at DESC',
  },
  SearchSynonym: {
    table: 'search_synonyms',
    fields: ['term', 'equivalent_term', 'priority', 'active'],
    booleans: ['active'],
    numbers: ['priority'],
    order: 'priority DESC, created_at DESC',
  },
  RecommendationRule: {
    table: 'recommendation_rules',
    fields: ['trigger_term', 'recommended_tags_json', 'priority', 'active'],
    json: { recommended_tags: 'recommended_tags_json' },
    booleans: ['active'],
    numbers: ['priority'],
    order: 'priority DESC, created_at DESC',
  },
  SearchAnalytics: {
    table: 'search_analytics',
    fields: ['search_term', 'normalized_term', 'visitor_id', 'session_id', 'results_count', 'found_results', 'clicked_product_id', 'added_to_cart_product_id'],
    booleans: ['found_results'],
    numbers: ['results_count'],
    order: 'created_at DESC',
  },
  MissingSearch: {
    table: 'missing_searches',
    fields: ['search_term', 'normalized_term', 'count', 'last_seen_at'],
    numbers: ['count'],
    order: 'created_at DESC',
  },
  BusinessIncome: {
    table: 'business_income',
    fields: ['date', 'category', 'customer', 'amount', 'payment_method', 'notes'],
    numbers: ['amount'],
    order: 'created_at DESC',
  },
  BusinessExpense: {
    table: 'business_expenses',
    fields: ['date', 'category', 'supplier', 'amount', 'notes'],
    numbers: ['amount'],
    order: 'created_at DESC',
  },
  EmailNotification: {
    table: 'notifications',
    fields: ['type', 'channel', 'recipient', 'title', 'message', 'status', 'related_type', 'related_id', 'email_log_id', 'metadata_json'],
    json: { metadata: 'metadata_json' },
    order: 'created_at DESC',
  },
};

const PRODUCT_FIELDS = [
  'base44_id', 'name', 'slug', 'description', 'long_description', 'author', 'rabbi', 'publisher',
  'sku', 'barcode', 'category_id', 'category_slug', 'sub_category', 'additional_categories_json',
  'price', 'sale_price', 'cost_price', 'stock_quantity', 'weight', 'language', 'image_url',
  'gallery_urls_json', 'tags_json', 'seo_title', 'meta_description', 'imported_at',
  'is_new', 'is_on_sale', 'is_featured', 'in_stock', 'free_shipping',
];

function boolToDb(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

function boolFromDb(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toEntity(row = {}) {
  const next = { ...row };
  next.created_date = row.created_at || row.created_date;
  next.updated_date = row.updated_at || row.updated_date;
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith('_json')) {
      next[key.slice(0, -5)] = parseJson(value, []);
    }
  }
  for (const key of ['is_active', 'active', 'show_in_home', 'show_in_nav', 'is_public', 'found_results', 'is_new', 'is_on_sale', 'is_featured', 'in_stock', 'free_shipping']) {
    if (key in next) next[key] = boolFromDb(next[key]);
  }
  if (next.name && !next.full_name) next.full_name = next.name;
  if (next.last_activity_at && !next.last_activity) next.last_activity = next.last_activity_at;
  return next;
}

function orderSql(sort, fallback) {
  const value = stringValue(sort);
  if (!value) return fallback;
  const direction = value.startsWith('-') ? 'DESC' : 'ASC';
  const key = value.replace(/^-/, '');
  const column = key === 'created_date' ? 'created_at' : key === 'updated_date' ? 'updated_at' : key;
  if (!/^[a-zA-Z0-9_]+$/.test(column)) return fallback;
  return `${column} ${direction}`;
}

function normalizePayload(config, payload = {}) {
  const data = { ...(config.defaults || {}), ...payload };
  if (config.aliases) {
    for (const [from, to] of Object.entries(config.aliases)) {
      if (data[from] !== undefined && data[to] === undefined) data[to] = data[from];
    }
  }
  if (config.json) {
    for (const [from, to] of Object.entries(config.json)) {
      if (data[from] !== undefined) data[to] = JSON.stringify(data[from] || []);
    }
  }

  const values = {};
  for (const field of config.fields) {
    if (data[field] === undefined) continue;
    if (config.booleans?.includes(field)) values[field] = boolToDb(data[field]);
    else if (config.numbers?.includes(field)) values[field] = numberValue(data[field]);
    else values[field] = data[field] ?? '';
  }
  return values;
}

function productPayload(payload = {}) {
  const category = stringValue(payload.category || payload.category_slug || payload.category_id);
  const slug = stringValue(payload.slug) || crypto.randomUUID();
  return {
    base44_id: stringValue(payload.base44_id) || null,
    name: stringValue(payload.name),
    slug,
    description: payload.description || '',
    long_description: payload.long_description || '',
    author: payload.author || '',
    rabbi: payload.rabbi || '',
    publisher: payload.publisher || '',
    sku: payload.sku || '',
    barcode: payload.barcode || '',
    category_id: category,
    category_slug: category,
    sub_category: payload.sub_category || '',
    additional_categories_json: JSON.stringify(payload.additional_categories || []),
    price: numberValue(payload.price),
    sale_price: payload.sale_price ? numberValue(payload.sale_price) : null,
    cost_price: payload.cost_price ? numberValue(payload.cost_price) : null,
    stock_quantity: numberValue(payload.stock_quantity),
    weight: payload.weight ? numberValue(payload.weight) : null,
    language: payload.language || '',
    image_url: payload.image_url || '',
    gallery_urls_json: JSON.stringify(payload.gallery_urls || []),
    tags_json: JSON.stringify(payload.tags || []),
    seo_title: payload.seo_title || '',
    meta_description: payload.meta_description || '',
    imported_at: payload.imported_at || nowIso(),
    is_new: boolToDb(payload.is_new),
    is_on_sale: boolToDb(payload.is_on_sale),
    is_featured: boolToDb(payload.is_featured),
    in_stock: payload.in_stock === false ? 0 : 1,
    free_shipping: boolToDb(payload.free_shipping),
  };
}

async function listGeneric(env, entityName, params = {}) {
  const config = ENTITY_CONFIGS[entityName];
  if (!config) throw new Error(`Unsupported entity: ${entityName}`);
  const limit = Math.min(Math.max(numberValue(params.limit, 500), 1), 10000);
  const filters = params.filters || {};
  const clauses = [];
  const binds = [];

  for (const [key, value] of Object.entries(filters)) {
    const column = config.aliases?.[key] || key;
    if (!config.fields.includes(column) && column !== 'id') continue;
    clauses.push(`${column} = ?`);
    binds.push(value);
  }

  const rows = await env.DB.prepare(`
    SELECT *
    FROM ${config.table}
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY ${orderSql(params.sort, config.order)}
    LIMIT ?
  `).bind(...binds, limit).all();

  return (rows.results || []).map(toEntity);
}

async function createGeneric(env, entityName, payload = {}) {
  const config = ENTITY_CONFIGS[entityName];
  if (!config) throw new Error(`Unsupported entity: ${entityName}`);
  const id = payload.id || (entityName === 'StoreCategory' && payload.slug) || crypto.randomUUID();
  const now = nowIso();
  const values = normalizePayload(config, payload);
  const columns = ['id', ...Object.keys(values), 'created_at', 'updated_at'];
  const binds = [id, ...Object.values(values), payload.created_at || now, payload.updated_at || now];
  const placeholders = columns.map(() => '?').join(', ');

  await env.DB.prepare(`
    INSERT INTO ${config.table} (${columns.join(', ')})
    VALUES (${placeholders})
  `).bind(...binds).run();

  return getGenericById(env, entityName, id);
}

async function updateGeneric(env, entityName, id, payload = {}) {
  const config = ENTITY_CONFIGS[entityName];
  if (!config) throw new Error(`Unsupported entity: ${entityName}`);
  const values = normalizePayload(config, payload);
  values.updated_at = nowIso();
  const columns = Object.keys(values);
  if (!columns.length) return getGenericById(env, entityName, id);

  await env.DB.prepare(`
    UPDATE ${config.table}
    SET ${columns.map((column) => `${column} = ?`).join(', ')}
    WHERE id = ?
  `).bind(...Object.values(values), id).run();

  return getGenericById(env, entityName, id);
}

async function deleteGeneric(env, entityName, id) {
  const config = ENTITY_CONFIGS[entityName];
  if (!config) throw new Error(`Unsupported entity: ${entityName}`);
  await env.DB.prepare(`DELETE FROM ${config.table} WHERE id = ?`).bind(id).run();
  return { id, deleted: true };
}

async function getGenericById(env, entityName, id) {
  const config = ENTITY_CONFIGS[entityName];
  const row = await env.DB.prepare(`SELECT * FROM ${config.table} WHERE id = ? LIMIT 1`).bind(id).first();
  return row ? toEntity(row) : null;
}

async function createProduct(env, payload) {
  const id = payload.id || crypto.randomUUID();
  const values = productPayload(payload);
  const now = nowIso();
  const columns = ['id', ...PRODUCT_FIELDS, 'created_at', 'updated_at'];
  await env.DB.prepare(`
    INSERT INTO products (${columns.join(', ')})
    VALUES (${columns.map(() => '?').join(', ')})
  `).bind(id, ...PRODUCT_FIELDS.map((field) => values[field]), payload.created_at || now, payload.updated_at || now).run();
  return (await listProducts(env, { limit: 10000 })).find((product) => product.id === id) || { id, ...payload };
}

async function updateProduct(env, id, payload) {
  const values = productPayload(payload);
  values.updated_at = nowIso();
  const columns = Object.keys(values).filter((field) => PRODUCT_FIELDS.includes(field) || field === 'updated_at');
  await env.DB.prepare(`
    UPDATE products
    SET ${columns.map((column) => `${column} = ?`).join(', ')}
    WHERE id = ? OR base44_id = ?
  `).bind(...columns.map((column) => values[column]), id, id).run();
  return (await listProducts(env, { limit: 10000 })).find((product) => product.id === id || product.base44_id === id) || null;
}

export async function listEntity(env, entityName, params = {}) {
  if (entityName === 'Product') return listProducts(env, { ...params, limit: params.limit || 10000 });
  if (entityName === 'StoreCategory') return listCategories(env, { includeInactive: true });
  if (entityName === 'Order') return listOrders(env, numberValue(params.limit, 500));
  return listGeneric(env, entityName, params);
}

export async function filterEntity(env, entityName, filters = {}, params = {}) {
  return listEntity(env, entityName, { ...params, filters });
}

export async function createEntity(env, entityName, payload = {}) {
  if (entityName === 'Product') return createProduct(env, payload);
  const item = await createGeneric(env, entityName, payload);
  if (entityName === 'User') {
    await syncCustomerAdminAccess(env, item);
  }
  return item;
}

export async function updateEntity(env, entityName, id, payload = {}) {
  if (entityName === 'Product') return updateProduct(env, id, payload);
  if (entityName === 'Order') {
    const allowed = ['status', 'payment_status', 'payment_method', 'payment_reference', 'notes', 'internal_notes'];
    const values = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
    values.updated_at = nowIso();
    const columns = Object.keys(values);
    await env.DB.prepare(`UPDATE orders SET ${columns.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`)
      .bind(...Object.values(values), id)
      .run();
    return (await listOrders(env, 10000)).find((order) => order.id === id) || null;
  }
  const item = await updateGeneric(env, entityName, id, payload);
  if (entityName === 'User') {
    await syncCustomerAdminAccess(env, item);
  }
  return item;
}

export async function deleteEntity(env, entityName, id) {
  if (entityName === 'Product') {
    await env.DB.prepare('DELETE FROM products WHERE id = ? OR base44_id = ?').bind(id, id).run();
    return { id, deleted: true };
  }
  if (entityName === 'User') {
    const user = await getGenericById(env, entityName, id);
    await deleteGeneric(env, entityName, id);
    if (user?.email) await disableAdminAccessForEmail(env, user.email);
    return { id, deleted: true };
  }
  return deleteGeneric(env, entityName, id);
}
