import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.json',
      includeAssets: ['images/otzar-logo-transparent.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'אוצר הקדושה | ספרי קודש לבית היהודי',
        short_name: 'אוצר הקדושה',
        description: 'אוצר הקדושה - חנות ספרי קודש, גמרות ומשניות, הלכה, חסידות וקבלה, ספרי ילדים ונוער ומוצרים לבית היהודי.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#1F1008',
        background_color: '#FCFAF5',
        lang: 'he',
        dir: 'rtl',
        categories: ['shopping', 'books', 'lifestyle'],
        icons: [
          ...ICON_SIZES.map((size) => ({
            src: `/icons/icon-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: 'image/png',
            purpose: 'any',
          })),
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // StaleWhileRevalidate, not CacheFirst: serves the cached copy
            // instantly but always re-fetches in the background and updates
            // the cache for next time. CacheFirst would lock in a corrupt/
            // truncated response (from a transient network blip, say) for
            // the full 30-day expiration with no way to self-heal.
            urlPattern: ({ request, url }) => request.destination === 'image' || url.pathname.startsWith('/assets/static/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ]
});
