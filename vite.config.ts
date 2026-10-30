import { defineConfig, loadEnv } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { instanceHeaders } from './src/backend/headers.ts';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execFileSync } from 'node:child_process';
import packageJson from './package.json' with { type: 'json' };
import { backendEnvironmentError } from './src/backend/config.ts';

const requestedDisplay = 'fullscreen' as const;
function buildRevision(): string {
  const cloudCommit = process.env.CF_PAGES_COMMIT_SHA;
  if (cloudCommit && /^[a-f0-9]{40}$/i.test(cloudCommit)) return cloudCommit.slice(0, 12);
  try {
    const revision = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const changed = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return `${revision}${changed ? '-local' : ''}`;
  } catch {
    return 'local';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const error = backendEnvironmentError(mode, env);
  if (error) throw new Error(error);
  return {
    define: {
      __APP_BUILD_INFO__: JSON.stringify({
        version: packageJson.version,
        revision: buildRevision(),
        builtAt: new Date().toISOString(),
        requestedDisplay,
      }),
    },
    build: { outDir: mode === 'cloud' ? 'dist-cloud' : 'dist' },
    plugins: [
      react(),
      {
        name: 'instance-headers',
        writeBundle(output) {
          writeFileSync(
            resolve(output.dir!, '_headers'),
            instanceHeaders(readFileSync('public/_headers', 'utf8'), mode, env),
          );
        },
      },
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.png', 'logo.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Sacré bleu',
          short_name: 'Sacré bleu',
          lang: 'fr',
          description: 'Votre réserve alimentaire, simplement.',
          theme_color: '#284f40',
          background_color: '#f7f8f4',
          display: requestedDisplay,
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          clientsClaim: true,
          importScripts: ['/update-worker.js'],
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
