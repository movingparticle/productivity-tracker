import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // If building in GitHub Actions, use repo subpath; otherwise use root
  base: process.env.GITHUB_ACTIONS ? '/productivity-tracker/' : '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // usamos nuestro propio public/manifest.json
      workbox: {
        // Solo cachear assets con hash — el HTML siempre desde red
        globPatterns: ['**/*.{js,css,svg,woff2}'],
        runtimeCaching: [
          {
            // index.html siempre desde red (NetworkFirst) para que los deploys se vean inmediatamente
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-pages',
              networkTimeoutSeconds: 3,
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
});
