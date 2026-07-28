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

  return new Response(rewritten.body, {
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    headers: rewritten.headers,
  });
}
