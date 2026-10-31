import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5192';
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5192',
    '--strictPort',
  ],
  { stdio: 'pipe', windowsHide: true },
);
let browser;
let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk;
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk;
});
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (attempt >= 50 || server.exitCode !== null)
      throw new Error(`Local server did not start: ${serverOutput}`);
    await new Promise((done) => setTimeout(done, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
  page.on('pageerror', (error) => console.error(error.message));
  await page.route(`${origin}/__foundations`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="fr"><head><link rel="stylesheet" href="/src/style.css"></head>
      <body><p id="legacy">Sacré bleu</p><div id="legacy-media"></div><section class="sb-foundation sb-surface">
      <h1 class="sb-title">Épicerie · Œufs</h1><button class="sb-button">Ajouter</button>
      <button class="sb-button" data-variant="secondary">Fermer</button>
      <div id="media" style="width:120px"></div></section>
      <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script><script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import { ProductMedia } from '/src/ui/ProductMedia.tsx';
      import { ProductImage } from '/src/components.tsx';
      ReactDOM.createRoot(document.getElementById('legacy-media')).render(React.createElement(ProductImage, {
        product: { id: 'fixture', name: 'Produit', quantity: 0, category: 'Autres' }
      }));
      const root = ReactDOM.createRoot(document.getElementById('media'));
      window.showMedia = (src, alt = '') => root.render(React.createElement(ProductMedia, {
        src, alt, fallback: React.createElement('svg', {'aria-hidden': true, width: 28, height: 28})
      }));
      window.showMedia();
      </script></body></html>`,
    }),
  );
  await page.goto(`${origin}/__foundations`);
  await page.waitForFunction(() => typeof window.showMedia === 'function');
  const inspect = () =>
    page.evaluate(() => {
      const button = document.querySelector('.sb-button');
      const styles = getComputedStyle(button);
      return {
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
        font: styles.fontFamily,
        legacyFont: getComputedStyle(document.querySelector('#legacy')).fontFamily,
        brand: styles.backgroundColor,
        duration: styles.transitionDuration,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
  const initial = await inspect();
  assert(initial.width >= 44 && initial.height >= 44);
  assert(initial.font.includes('Manrope'));
  assert(!initial.legacyFont.includes('Manrope'));
  assert.equal(initial.brand, 'rgb(35, 63, 140)');
  assert.equal(initial.overflow, false);
  const legacyMedia = await page.locator('#legacy-media .product-image').evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    height: el.getBoundingClientRect().height,
    category: el.classList.contains('image-4'),
  }));
  assert.deepEqual(legacyMedia, { width: 36, height: 44, category: true });
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px Manrope', 'Épicerie Œufs'),
      document.fonts.load('600 16px Manrope', 'Ajouter'),
      document.fonts.load('400 28px Fraunces', 'Sacré bleu'),
    ]);
    if (![...document.fonts].every((face) => face.status === 'loaded'))
      throw Error('Font load failed');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert((await inspect()).duration.split(', ').every((duration) => duration === '0s'));
  for (const theme of ['light', 'dark', 'slate', 'retro-cream', 'retro-petrol']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const themed = await inspect();
    assert.equal(themed.overflow, false);
    assert(themed.height >= 44);
    if (theme !== 'light') assert.notEqual(themed.brand, initial.brand);
  }
  await page.keyboard.press('Tab');
  assert.equal(
    await page
      .locator('.sb-button')
      .first()
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    'solid',
  );

  // Missing, broken, new and retried sources share the same frame, without stale error state.
  assert.equal(await page.locator('#media img').count(), 0);
  await page.route(`${origin}/fixture.svg`, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="75" height="200"><rect width="75" height="200" fill="red"/></svg>',
    }),
  );
  await page.route(`${origin}/broken.svg`, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: 'broken' }),
  );
  const show = (src, alt = '') =>
    page.evaluate(([url, text]) => window.showMedia(url, text), [src, alt]);
  await show('/broken.svg', 'Produit');
  await page.locator('#media [role="img"][aria-label="Produit"]').waitFor();
  await show('/fixture.svg');
  await page.waitForFunction(() => document.querySelector('#media img')?.naturalHeight === 200);
  const image = await page.locator('#media img').evaluate((el) => ({
    fit: getComputedStyle(el).objectFit,
    alt: el.alt,
    referrer: el.referrerPolicy,
  }));
  assert.deepEqual(image, { fit: 'contain', alt: '', referrer: 'no-referrer' });
  await page.unroute(`${origin}/broken.svg`);
  await page.route(`${origin}/broken.svg`, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"/>',
    }),
  );
  await show('/broken.svg');
  await page.waitForFunction(() => document.querySelector('#media img')?.naturalWidth === 50);
  console.log(
    'Foundations: themes, fonts, touch/focus, reduced motion and media fallbacks passed.',
  );
} finally {
  await browser?.close();
  server.kill();
}
