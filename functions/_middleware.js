import { resolvePageMeta } from './_services/pageMetaService.js';

// Only intercept HTML document navigations. Every other request (JS/CSS
// bundles, images, fonts, robots.txt, sitemap.xml, /api/*) must reach the
// user with zero extra work here -- checked via the same signals browsers
// actually send, so nothing downstream (ASSETS binding, other function
// routes) changes behavior at all.
function isDocumentRequest(request) {
  const dest = request.headers.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

async function hashHex(input) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  const { request, env, next, waitUntil } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  if (!isDocumentRequest(request)) return next();

  const url = new URL(request.url);

  // Static asset paths are also excluded at the routing layer (wrangler.jsonc
  // run_worker_first), but this file guards the same thing defensively --
  // a document-shaped request for a real static file should never happen,
  // but if it did, don't let this handler shadow it.
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname) && url.pathname !== '/index.html') {
    return next();
  }

  const shellResponse = await env.ASSETS.fetch(new URL('/index.html', url));
  if (!shellResponse.ok) return shellResponse;

  const { status, meta } = await resolvePageMeta(env, url, waitUntil);

  // ETag folds in the underlying asset's own (deploy-versioned) ETag plus a
  // hash of this page's resolved meta, so it changes on every deploy AND
  // whenever this specific page's title/price/description actually changes --
  // lets Google (and browsers) revalidate with a cheap 304 instead of
  // re-downloading the page on every recrawl.
  const shellEtag = (shellResponse.headers.get('etag') || '').replace(/"/g, '');
  const metaFingerprint = (await hashHex(`${status}|${JSON.stringify(meta)}`)).slice(0, 16);
  const etag = `"${shellEtag}-${metaFingerprint}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { etag, 'cache-control': 'public, max-age=0, must-revalidate' } });
  }

  const rewriter = new HTMLRewriter()
    .on('meta[name="robots"]', { element: (el) => el.setAttribute('content', meta.robots) });

  if (meta.title) {
    rewriter.on('title', { element: (el) => el.setInnerContent(meta.title) });
    rewriter.on('meta[property="og:title"]', { element: (el) => el.setAttribute('content', meta.title) });
    rewriter.on('meta[name="twitter:title"]', { element: (el) => el.setAttribute('content', meta.title) });
  }
  if (meta.description) {
    rewriter.on('meta[name="description"]', { element: (el) => el.setAttribute('content', meta.description) });
    rewriter.on('meta[property="og:description"]', { element: (el) => el.setAttribute('content', meta.description) });
    rewriter.on('meta[name="twitter:description"]', { element: (el) => el.setAttribute('content', meta.description) });
  }
  if (meta.canonical) {
    rewriter.on('link[rel="canonical"]', { element: (el) => el.setAttribute('href', meta.canonical) });
    rewriter.on('meta[property="og:url"]', { element: (el) => el.setAttribute('content', meta.canonical) });
  }
  if (meta.ogType) {
    rewriter.on('meta[property="og:type"]', { element: (el) => el.setAttribute('content', meta.ogType) });
  }
  if (meta.ogImage) {
    rewriter.on('meta[property="og:image"]', { element: (el) => el.setAttribute('content', meta.ogImage) });
    rewriter.on('meta[name="twitter:image"]', { element: (el) => el.setAttribute('content', meta.ogImage) });
  }

  const rewritten = rewriter.transform(shellResponse);
  const headers = new Headers(rewritten.headers);
  headers.set('etag', etag);

  return new Response(rewritten.body, {
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    headers,
  });
}
