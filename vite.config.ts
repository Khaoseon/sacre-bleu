import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { backendEnvironmentError } from './src/backend/config.ts';

export default defineConfig(({ mode }) => {
  const error = backendEnvironmentError(mode, loadEnv(mode, process.cwd(), 'VITE_'));
  if (error) throw new Error(error);
  return {
    build: { outDir: mode === 'cloud' ? 'dist-cloud' : 'dist' },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Réserve — Garde-manger',
          short_name: 'Réserve',
          lang: 'fr',
          description: 'Votre réserve alimentaire, simplement.',
          theme_color: '#284f40',
          background_color: '#f7f8f4',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          globIgnores: ['**/decoder-*.js'],
          runtimeCaching: [
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\/assets\/decoder-[\w-]+\.js$/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-reserve-scanner-v1',
                expiration: { maxEntries: 2 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
          navigateFallback: '/index.html',
        },
      }),
    ],
  };
});
