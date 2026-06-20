export async function onRequestGet({ params, env }) {
  if (!env?.PRODUCT_IMAGES) {
    return new Response('Missing PRODUCT_IMAGES R2 binding', { status: 500 });
  }

  const key = params.key;
  const object = await env.PRODUCT_IMAGES.get(key);

  if (!object) {
    return new Response('Image not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', headers.get('cache-control') || 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}

