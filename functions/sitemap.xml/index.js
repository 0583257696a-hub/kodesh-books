import { sitemapResponse } from '../_services/sitemapService.js';

export async function onRequestGet({ env }) {
  return sitemapResponse(env);
}
