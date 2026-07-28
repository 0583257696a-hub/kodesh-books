import { getProductBySlug, listCategories } from './catalogService.js';
import { stringValue } from './http.js';

const SITE_URL = 'https://otzar-hakodesh.shop';
const CACHE_TTL_SECONDS = 300;

// Paths with no unique indexable content -- must agree with src/hooks/useNoIndex.js
// (client) exactly, or the server-rendered tag and the post-hydration client tag
// would fight each other.
const NOINDEX_EXACT = new Set(['/cart', '/checkout', '/login', '/register', '/forgot-password', '/reset-password', '/admin-login', '/403']);
const NOINDEX_PREFIXES = ['/secret-admin', '/admin'];

const STATIC_ROUTE_META = {
  '/': null, // index.html's own static defaults already cover the homepage well
  '/catalog': {
    title: 'קטלוג ספרי קודש | אוצר הקדושה',
    description: 'הקטלוג המלא של אוצר הקדושה - ספרי קודש, גמרות ומשניות, הלכה, חסידות וקבלה, סידורים, מחזורים ותשמישי קדושה.',
  },
  '/contact': {
    title: 'צור קשר | אוצר הקדושה',
    description: 'יצירת קשר עם אוצר הקדושה - טלפון, וואטסאפ, אימייל וטופס פנייה.',
  },
  '/terms': { title: 'תקנון ותנאי שימוש | אוצר הקדושה', description: 'תקנון ותנאי השימוש באתר אוצר הקדושה.' },
  '/privacy': { title: 'מדיניות פרטיות | אוצר הקדושה', description: 'מדיניות הפרטיות של אתר אוצר הקדושה.' },
  '/shipping-returns': { title: 'משלוחים והחזרות | אוצר הקדושה', description: 'מדיניות המשלוחים וההחזרות של אוצר הקדושה.' },
  '/accessibility': { title: 'הצהרת נגישות | אוצר הקדושה', description: 'הצהרת הנגישות של אתר אוצר הקדושה.' },
};

function isNoIndexPath(pathname) {
  if (NOINDEX_EXACT.has(pathname)) return true;
  return NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function withCache(cacheKey, loader, waitUntil) {
  const cache = caches.default;
  const request = new Request(new URL(cacheKey, SITE_URL), { method: 'GET' });

  const cached = await cache.match(request);
  if (cached) return cached.json();

  const data = await loader();

  const response = new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${CACHE_TTL_SECONDS}` },
  });
  // Fire-and-forget: don't make the page wait on the cache write.
  const write = cache.put(request, response);
  if (waitUntil) waitUntil(write); else await write;

  return data;
}

async function resolveProduct(env, idOrSlug, waitUntil) {
  return withCache(`/__meta-cache/product/${encodeURIComponent(idOrSlug)}`, () => getProductBySlug(env, idOrSlug), waitUntil);
}

async function resolveCategory(env, slug, waitUntil) {
  const categories = await withCache('/__meta-cache/categories', () => listCategories(env, { includeInactive: false }), waitUntil);
  return categories.find((category) => category.slug === slug) || null;
}

function toPlainSummary(text, maxLength) {
  const plain = stringValue(text)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
}

// Resolves a request path against the same data the sitemap uses. Returns
// { status: 200, meta } for anything real, or { status: 404, meta } for a
// path that doesn't correspond to an existing static route or product.
export async function resolvePageMeta(env, url, waitUntil) {
  const pathname = url.pathname;
  const robots = isNoIndexPath(pathname) ? 'noindex, nofollow' : 'index, follow';

  if (pathname === '/product' || pathname.startsWith('/product/')) {
    const idOrSlug = pathname.replace(/^\/product\/?/, '');
    if (!idOrSlug) return { status: 404, meta: { robots } };

    const product = await resolveProduct(env, idOrSlug, waitUntil);
    if (!product) return { status: 404, meta: { robots } };

    const canonical = `${SITE_URL}/product/${product.slug || product.id}`;
    const description = toPlainSummary(
      product.description || `${product.name}${product.author ? ` מאת ${product.author}` : ''} - לרכישה באוצר הקדושה.`,
      160
    );

    return {
      status: 200,
      meta: {
        robots,
        title: `${product.name} | אוצר הקדושה`,
        description,
        canonical,
        ogType: 'product',
        ogImage: product.image_url || null,
      },
    };
  }

  if (pathname === '/catalog') {
    const categorySlug = stringValue(url.searchParams.get('category'));
    const isSale = url.searchParams.get('sale') === 'true';

    if (isSale) {
      return {
        status: 200,
        meta: {
          robots,
          title: 'מבצעים חמים | אוצר הקדושה',
          description: 'כל המבצעים והמחירים המיוחדים על ספרי קודש, סידורים, מחזורים ותשמישי קדושה באוצר הקדושה.',
          canonical: `${SITE_URL}/catalog?sale=true`,
          ogType: 'website',
        },
      };
    }

    if (categorySlug) {
      const category = await resolveCategory(env, categorySlug, waitUntil);
      if (category) {
        return {
          status: 200,
          meta: {
            robots,
            title: `${category.name} | אוצר הקדושה`,
            description: category.description || `מבחר ${category.name} באוצר הקדושה - עשרות ספרים וכלי קודש איכותיים.`,
            canonical: `${SITE_URL}/catalog?category=${category.slug}`,
            ogType: 'website',
          },
        };
      }
      // Unknown category slug in the query string isn't a 404 -- /catalog itself is
      // still a perfectly valid page, it'll just render with no matching results.
    }

    return { status: 200, meta: { robots, ...STATIC_ROUTE_META['/catalog'], canonical: `${SITE_URL}/catalog`, ogType: 'website' } };
  }

  if (pathname in STATIC_ROUTE_META || NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || NOINDEX_EXACT.has(pathname)) {
    const staticMeta = STATIC_ROUTE_META[pathname];
    return {
      status: 200,
      meta: staticMeta ? { robots, ...staticMeta, canonical: `${SITE_URL}${pathname}`, ogType: 'website' } : { robots },
    };
  }

  return { status: 404, meta: { robots: 'noindex, nofollow' } };
}
