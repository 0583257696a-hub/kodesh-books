const PRODUCT_IMAGE_UPLOAD_ENDPOINT = '/api/admin/uploads/product-image';
const IMAGE_ROUTE_PREFIX = '/api/images/';

async function readJsonResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || 'Image upload failed');
  }

  return data;
}

export function imageKeyFromImageUrl(value) {
  if (!value) return '';

  try {
    const url = new URL(value, window.location.origin);
    if (url.pathname.startsWith(IMAGE_ROUTE_PREFIX)) {
      return decodeURIComponent(url.pathname.slice(IMAGE_ROUTE_PREFIX.length));
    }
  } catch {
    return '';
  }

  return '';
}

export async function uploadProductImages(files, options = {}) {
  const imageFiles = Array.from(files || []).filter(Boolean);
  if (!imageFiles.length) return [];

  const formData = new FormData();
  imageFiles.forEach((file) => formData.append('files', file));

  if (options.productId) formData.set('product_id', options.productId);
  if (options.imageRole) formData.set('image_role', options.imageRole);
  if (options.altText) formData.set('alt_text', options.altText);
  if (options.sortOrder !== undefined) formData.set('sort_order', String(options.sortOrder));
  if (options.replaceImageKey) {
    formData.set('action', 'replace');
    formData.set('replace_image_key', options.replaceImageKey);
  }
  if (options.replaceImageUrl) {
    formData.set('action', 'replace');
    formData.set('replace_image_url', options.replaceImageUrl);
  }

  const response = await fetch(PRODUCT_IMAGE_UPLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const data = await readJsonResponse(response);
  return data.images || [];
}

export async function removeProductImage({ imageId, imageKey, imageUrl } = {}) {
  const key = imageKey || imageKeyFromImageUrl(imageUrl);
  if (!imageId && !key) {
    return { skipped: true };
  }

  const formData = new FormData();
  formData.set('action', 'remove');
  if (imageId) formData.set('image_id', imageId);
  if (key) formData.set('image_key', key);

  const response = await fetch(PRODUCT_IMAGE_UPLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  return readJsonResponse(response);
}

