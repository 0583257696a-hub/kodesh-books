import { listCategories, listProducts } from './catalogService.js';
import { stringValue } from './http.js';

const DEFAULT_SITE_URL = 'https://otzar-hakodesh.shop';

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/catalog', changefreq: 'daily', priority: '0.9' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/terms', changefreq: 'yearly', priority: '0.4' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
  { path: '/shipping-returns', changefreq: 'yearly', priority: '0.4' },
  { path: '/accessibility', changefreq: 'yearly', priority: '0.4' },
];

function normalizeBaseUrl(env = {}) {
  return (stringValue(env.SITE_URL) || DEFAULT_SITE_URL).replace(/\/+$/g, '');
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastmod(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function absoluteUrl(baseUrl, path) {
  if (path === '/') return `${baseUrl}/`;
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function sitemapEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(formatLastmod(lastmod))}</lastmod>` : '',
    changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : '',
    priority ? `    <priority>${escapeXml(priority)}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

async function dynamicRoutes(env, baseUrl) {
  if (!env?.DB) return [];

  try {
    const [categories, products] = await Promise.all([
      listCategories(env, { includeInactive: false }),
      listProducts(env, { limit: 1000, sort: 'newest' }),
    ]);

    const categoryRoutes = categories
      .filter((category) => category?.slug)
      .map((category) => ({
        loc: `${baseUrl}/catalog?category=${encodeURIComponent(category.slug)}`,
        lastmod: category.updated_at || category.created_at,
        changefreq: 'weekly',
        priority: '0.7',
      }));

    const productRoutes = products
      .filter((product) => product?.slug || product?.id)
      .map((product) => ({
        loc: `${baseUrl}/product/${encodeURIComponent(product.slug || product.id)}`,
        lastmod: product.updated_at || product.created_at,
        changefreq: product.in_stock ? 'weekly' : 'monthly',
        priority: product.in_stock ? '0.8' : '0.5',
      }));

    return [...categoryRoutes, ...productRoutes];
  } catch {
    return [];
  }
}

export async function buildSitemapXml(env = {}) {
  const baseUrl = normalizeBaseUrl(env);
  const staticRoutes = STATIC_ROUTES.map((route) => ({
    loc: absoluteUrl(baseUrl, route.path),
    lastmod: new Date().toISOString(),
    changefreq: route.changefreq,
    priority: route.priority,
  }));
  const routes = [...staticRoutes, ...await dynamicRoutes(env, baseUrl)];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map(sitemapEntry),
    '</urlset>',
    '',
  ].join('\n');
}

export async function sitemapResponse(env = {}) {
  const xml = await buildSitemapXml(env);

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

export async function handleSitemapRequest({ request, env }) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { allow: 'GET, HEAD' },
    });
  }

  const response = await sitemapResponse(env);
  if (request.method === 'HEAD') {
    return new Response(null, {
      status: response.status,
      headers: response.headers,
    });
  }

  return response;
}
