import { requireAdmin } from '../../../_services/adminAuthService.js';
import {
  assertAdminUploadRequest,
  buildImageUrl,
  collectImageFiles,
  imageKeyFromUrl,
  jsonResponse,
  requireUploadBindings,
  validateImageFile,
} from '../../../_services/uploadService.js';

function sanitize(value, fallback = 'category') {
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

function buildCategoryImageKey({ file, categorySlug }) {
  const ext = extensionFor(file);
  const categoryPart = sanitize(categorySlug, 'new-category');
  const namePart = sanitize(String(file.name || '').replace(/\.[^.]+$/, ''), 'image');
  return `categories_${categoryPart}_${Date.now()}_${crypto.randomUUID()}_${namePart}.${ext}`;
}

async function deleteExistingImage(env, formData) {
  const imageKey = String(formData.get('replace_image_key') || '').trim()
    || imageKeyFromUrl(String(formData.get('replace_image_url') || ''));

  if (!imageKey) return;
  await env.PRODUCT_IMAGES.delete(imageKey);
}

export async function onRequestPost({ request, env }) {
  try {
    requireUploadBindings(env);

    if (!assertAdminUploadRequest(request)) {
      return jsonResponse({ error: 'Unauthorized upload request' }, { status: 401 });
    }

    await requireAdmin(request, env);

    const formData = await request.formData();
    const files = collectImageFiles(formData);
    if (!files.length) {
      return jsonResponse({ error: 'No image files provided' }, { status: 400 });
    }

    await deleteExistingImage(env, formData);

    const file = files[0];
    validateImageFile(file);

    const categorySlug = String(formData.get('category_slug') || formData.get('category_id') || '').trim();
    const altText = String(formData.get('alt_text') || '').trim();
    const imageKey = buildCategoryImageKey({ file, categorySlug });
    const imageUrl = buildImageUrl({ env, key: imageKey, requestUrl: request.url });

    await env.PRODUCT_IMAGES.put(imageKey, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        category_slug: categorySlug,
        original_name: file.name || '',
        alt_text: altText,
      },
    });

    return jsonResponse({
      ok: true,
      image: {
        image_key: imageKey,
        image_url: imageUrl,
        alt_text: altText,
        file_name: file.name || '',
        content_type: file.type || '',
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Category image upload failed' }, { status: error.status || 500 });
  }
}
