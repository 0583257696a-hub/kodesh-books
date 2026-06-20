import {
  assertAdminUploadRequest,
  collectImageFiles,
  imageKeyFromUrl,
  jsonResponse,
  removeProductImage,
  requireUploadBindings,
  saveProductImage,
} from '../../../_services/uploadService.js';
import { requireAdmin } from '../../../_services/adminAuthService.js';

export async function onRequestPost({ request, env }) {
  try {
    requireUploadBindings(env);

    if (!assertAdminUploadRequest(request)) {
      return jsonResponse({ error: 'Unauthorized upload request' }, { status: 401 });
    }
    await requireAdmin(request, env);

    const formData = await request.formData();
    const action = String(formData.get('action') || 'upload');

    if (action === 'remove') {
      const imageKey = String(formData.get('image_key') || '') || imageKeyFromUrl(String(formData.get('image_url') || ''));
      const removed = await removeProductImage({
        env,
        imageId: String(formData.get('image_id') || ''),
        imageKey,
      });

      return jsonResponse({ ok: true, removed });
    }

    const replaceImageKey = String(formData.get('replace_image_key') || '') || imageKeyFromUrl(String(formData.get('replace_image_url') || ''));
    const replaceImageId = String(formData.get('replace_image_id') || '');

    if (action === 'replace' && (replaceImageId || replaceImageKey)) {
      await removeProductImage({ env, imageId: replaceImageId, imageKey: replaceImageKey });
    }

    const files = collectImageFiles(formData);
    if (!files.length) {
      return jsonResponse({ error: 'No image files provided' }, { status: 400 });
    }

    const productId = String(formData.get('product_id') || '').trim();
    const imageRole = String(formData.get('image_role') || 'gallery') === 'main' ? 'main' : 'gallery';
    const altText = String(formData.get('alt_text') || '').trim();
    const initialSortOrder = Number(formData.get('sort_order') || 100);
    const images = [];

    for (let index = 0; index < files.length; index += 1) {
      images.push(await saveProductImage({
        env,
        requestUrl: request.url,
        file: files[index],
        productId,
        imageRole: index === 0 ? imageRole : 'gallery',
        altText,
        sortOrder: (Number.isFinite(initialSortOrder) ? initialSortOrder : 100) + index,
      }));
    }

    return jsonResponse({ ok: true, images });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Product image upload failed' }, { status: error.status || 500 });
  }
}
