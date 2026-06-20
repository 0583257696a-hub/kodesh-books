import { numberValue, parseJson, stringValue } from './http.js';

function boolValue(value) {
  return value === true || value === 1 || value === '1';
}

function normalizeImageRow(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    image_key: row.image_key,
    image_url: row.image_url,
    alt_text: row.alt_text || '',
    sort_order: numberValue(row.sort_order, 100),
    image_role: row.image_role || 'gallery',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeProductRow(row, imageRows = []) {
  const images = imageRows.map(normalizeImageRow);
  const storedGallery = parseJson(row.gallery_urls_json, []);
  const mainImage = images.find((image) => image.image_role === 'main')?.image_url || row.image_url || storedGallery[0] || '';
  const galleryUrls = uniqueValues([...images.map((image) => image.image_url), ...storedGallery]);

  return {
    id: row.id,
    base44_id: row.base44_id || '',
    slug: row.slug || row.id,
    name: row.name,
    description: row.description || '',
    long_description: row.long_description || '',
    author: row.author || '',
    rabbi: row.rabbi || '',
    publisher: row.publisher || '',
    sku: row.sku || '',
    barcode: row.barcode || '',
    category_id: row.category_id || '',
    category: row.category_slug || row.category_id || '',
    category_slug: row.category_slug || '',
    sub_category: row.sub_category || '',
    additional_categories: parseJson(row.additional_categories_json, []),
    price: numberValue(row.price),
    sale_price: row.sale_price === null || row.sale_price === undefined ? null : numberValue(row.sale_price),
    cost_price: row.cost_price === null || row.cost_price === undefined ? null : numberValue(row.cost_price),
    stock_quantity: numberValue(row.stock_quantity),
    weight: row.weight === null || row.weight === undefined ? null : numberValue(row.weight),
    language: row.language || '',
    image_url: mainImage,
    gallery_urls: galleryUrls,
    images,
    tags: parseJson(row.tags_json, []),
    seo_title: row.seo_title || '',
    meta_description: row.meta_description || '',
    imported_at: row.imported_at || '',
    is_new: boolValue(row.is_new),
    is_on_sale: boolValue(row.is_on_sale),
    is_featured: boolValue(row.is_featured),
    in_stock: boolValue(row.in_stock),
    created_date: row.created_at,
    updated_date: row.updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeCategoryRow(row) {
  return {
    id: row.slug || row.id,
    record_id: row.id,
    base44_id: row.base44_id || '',
    name: row.name,
    slug: row.slug || row.id,
    description: row.description || '',
    image_url: row.image_url || '',
    r2_key: row.r2_key || '',
    icon: row.icon || 'FolderOpen',
    display_order: numberValue(row.display_order, 100),
    show_in_home: row.show_in_home !== 0,
    show_in_nav: row.show_in_nav !== 0,
    active: row.active !== 0,
    created_date: row.created_at,
    updated_date: row.updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getImagesByProductId(env, productIds) {
  const ids = uniqueValues(productIds).slice(0, 1000);
  if (!ids.length) return new Map();

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await env.DB.prepare(`
    SELECT *
    FROM product_images
    WHERE product_id IN (${placeholders})
    ORDER BY product_id ASC,
             CASE image_role WHEN 'main' THEN 0 ELSE 1 END ASC,
             sort_order ASC,
             created_at ASC
  `).bind(...ids).all();

  return (rows.results || []).reduce((acc, row) => {
    const current = acc.get(row.product_id) || [];
    current.push(row);
    acc.set(row.product_id, current);
    return acc;
  }, new Map());
}

function buildProductFilters(filters = {}) {
  const clauses = [];
  const binds = [];
  const category = stringValue(filters.category);
  const query = stringValue(filters.q || filters.search);

  if (category) {
    clauses.push('(category_slug = ? OR category_id = ?)');
    binds.push(category, category);
  }

  if (query) {
    const like = `%${query}%`;
    clauses.push(`(
      name LIKE ? OR
      author LIKE ? OR
      rabbi LIKE ? OR
      publisher LIKE ? OR
      sku LIKE ? OR
      barcode LIKE ? OR
      sub_category LIKE ? OR
      category_slug LIKE ? OR
      description LIKE ? OR
      long_description LIKE ? OR
      tags_json LIKE ?
    )`);
    binds.push(like, like, like, like, like, like, like, like, like, like, like);
  }

  if (filters.featured === true || filters.featured === 'true') {
    clauses.push('is_featured = 1');
  }

  if (filters.sale === true || filters.sale === 'true') {
    clauses.push('is_on_sale = 1');
  }

  if (filters.inStock === true || filters.in_stock === true || filters.inStock === 'true' || filters.in_stock === 'true') {
    clauses.push('in_stock = 1');
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    binds,
  };
}

function orderSql(sort = 'newest') {
  switch (sort) {
    case 'price_low':
      return 'ORDER BY COALESCE(sale_price, price) ASC, created_at DESC';
    case 'price_high':
      return 'ORDER BY COALESCE(sale_price, price) DESC, created_at DESC';
    case 'featured':
      return 'ORDER BY is_featured DESC, created_at DESC';
    default:
      return 'ORDER BY created_at DESC';
  }
}

export async function listProducts(env, filters = {}) {
  const limit = Math.min(Math.max(numberValue(filters.limit, 500), 1), 1000);
  const { whereSql, binds } = buildProductFilters(filters);
  const rows = await env.DB.prepare(`
    SELECT *
    FROM products
    ${whereSql}
    ${orderSql(filters.sort)}
    LIMIT ?
  `).bind(...binds, limit).all();

  const products = rows.results || [];
  const imagesByProductId = await getImagesByProductId(env, products.map((product) => product.id));
  return products.map((product) => normalizeProductRow(product, imagesByProductId.get(product.id) || []));
}

export async function getProductBySlug(env, slugOrId) {
  const key = stringValue(slugOrId);
  if (!key) return null;

  const row = await env.DB.prepare(`
    SELECT *
    FROM products
    WHERE slug = ? OR id = ? OR base44_id = ?
    LIMIT 1
  `).bind(key, key, key).first();

  if (!row) return null;
  const imagesByProductId = await getImagesByProductId(env, [row.id]);
  return normalizeProductRow(row, imagesByProductId.get(row.id) || []);
}

export async function listCategories(env, filters = {}) {
  const includeInactive = filters.includeInactive === true || filters.includeInactive === 'true';
  const rows = await env.DB.prepare(`
    SELECT *
    FROM categories
    ${includeInactive ? '' : 'WHERE active = 1'}
    ORDER BY display_order ASC, name ASC
  `).all();

  return (rows.results || []).map(normalizeCategoryRow);
}
