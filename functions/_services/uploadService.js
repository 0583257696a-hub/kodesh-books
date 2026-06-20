const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

export function requireUploadBindings(env) {
  if (!env?.PRODUCT_IMAGES) {
    throw new Error('Missing PRODUCT_IMAGES R2 binding');
  }
  if (!env?.DB) {
    throw new Error('Missing DB D1 binding');
  }
}

export function assertAdminUploadRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  const requestedWith = request.headers.get('x-requested-with');

  if (origin && origin !== url.origin) {
    return false;
  }

  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return false;
  }

  return requestedWith === 'XMLHttpRequest';
}

export function collectImageFiles(formData) {
  const values = [
    ...formData.getAll('file'),
    ...formData.getAll('files'),
    ...formData.getAll('images'),
  ];

  return values.filter((value) => value && typeof value === 'object' && typeof value.arrayBuffer === 'function');
}

export function validateImageFile(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || 'unknown'}`);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image is too large: ${file.name}`);
  }
}

export function imageKeyFromUrl(value) {
  if (!value) return '';

  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.pathname.startsWith('/api/images/')) {
      return decodeURIComponent(url.pathname.slice('/api/images/'.length));
    }
  } catch {
    return '';
  }

  return '';
}

function sanitize(value, fallback = 'item') {
  const safe = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return safe || fallback;
}

function extensionFor(file) {
  const fromName = String(file.name || '').match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName;

  const fromType = file.type?.split('/')?.[1]?.toLowerCase();
  if (fromType) return fromType === 'jpeg' ? 'jpg' : fromType;

  return 'jpg';
}

export function buildImageKey({ file, productId, imageRole }) {
  const ext = extensionFor(file);
  const productPart = sanitize(productId, 'unassigned-product');
  const rolePart = sanitize(imageRole, 'gallery');
  const namePart = sanitize(String(file.name || '').replace(/\.[^.]+$/, ''), 'image');
  const randomPart = crypto.randomUUID();

  return `products_${productPart}_${rolePart}_${Date.now()}_${randomPart}_${namePart}.${ext}`;
}

export function buildImageUrl({ env, key, requestUrl }) {
  const publicBaseUrl = (env.R2_PUBLIC_BASE_URL || env.PUBLIC_IMAGE_BASE_URL || '').replace(/\/+$/, '');
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${encodeURIComponent(key)}`;
  }

  const url = new URL(requestUrl);
  return `${url.origin}/api/images/${encodeURIComponent(key)}`;
}

export async function removeProductImage({ env, imageId, imageKey }) {
  const key = imageKey || '';

  if (key) {
    await env.PRODUCT_IMAGES.delete(key);
  }

  if (imageId) {
    await env.DB.prepare('DELETE FROM product_images WHERE id = ?').bind(imageId).run();
  } else if (key) {
    await env.DB.prepare('DELETE FROM product_images WHERE image_key = ?').bind(key).run();
  }

  return { image_id: imageId || null, image_key: key || null, removed: Boolean(imageId || key) };
}

export async function saveProductImage({ env, requestUrl, file, productId, imageRole, altText, sortOrder }) {
  validateImageFile(file);

  const id = crypto.randomUUID();
  const imageKey = buildImageKey({ file, productId, imageRole });
  const imageUrl = buildImageUrl({ env, key: imageKey, requestUrl });
  const now = new Date().toISOString();

  await env.PRODUCT_IMAGES.put(imageKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      product_id: productId || '',
      image_role: imageRole,
      original_name: file.name || '',
    },
  });

  if (productId && imageRole === 'main') {
    await env.DB.prepare(
      "UPDATE product_images SET image_role = 'gallery', updated_at = ? WHERE product_id = ? AND image_role = 'main'"
    ).bind(now, productId).run();
  }

  await env.DB.prepare(`
    INSERT INTO product_images (
      id,
      product_id,
      image_key,
      image_url,
      alt_text,
      sort_order,
      file_name,
      content_type,
      image_role,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    productId || null,
    imageKey,
    imageUrl,
    altText || '',
    Number.isFinite(sortOrder) ? sortOrder : 100,
    file.name || '',
    file.type || '',
    imageRole,
    now,
    now
  ).run();

  return {
    id,
    product_id: productId || null,
    image_key: imageKey,
    image_url: imageUrl,
    alt_text: altText || '',
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 100,
    file_name: file.name || '',
    content_type: file.type || '',
    image_role: imageRole,
  };
}

