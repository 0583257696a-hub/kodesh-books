import { handleSitemapRequest } from './_services/sitemapService.js';

export async function onRequest(context) {
  return handleSitemapRequest(context);
}
