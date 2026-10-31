import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(
  process.env.PLAYWRIGHT_PACKAGE ? resolve(process.env.PLAYWRIGHT_PACKAGE) : import.meta.url,
);
const { chromium } = require('playwright');
const origin = 'http://127.0.0.1:5189';
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5189',
    '--strictPort',
  ],
  { stdio: 'pipe', windowsHide: true },
);
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(`${origin}/scripts/browser/off-harness.html`)).ok) break;
    } catch {}
    if (attempt >= 50 || server.exitCode !== null)
      throw new Error('Local test server did not start');
    await new Promise((done) => setTimeout(done, 100));
  }
  browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const external = [];
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(new URL(route.request().url()).origin);
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.testTracks = [];
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      window.testTracks.push(...stream.getTracks());
      return stream;
    };
  });
  // Existing harness: fictitious catalogue and provider, no Root/Supabase client.
  await page.goto(`${origin}/scripts/browser/off-harness.html`);
  const nav = page.getByRole('navigation', { name: 'Navigation mobile' });
  const selected = () => nav.locator('[aria-current="page"] > span').innerText();
  const snapshot = await page.evaluate(() => localStorage.getItem('app-reserve.local.v1'));
  const cdp = await context.newCDPSession(page);
  async function swipe(x, endX, y = 250, endY = y, cancel = false) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let step = 1; step <= 6; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + ((endX - x) * step) / 6, y: y + ((endY - y) * step) / 6, id: 1 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
  }
  assert.equal(await selected(), 'Stock');
  await swipe(10, 160); // No wrap before Stock.
  assert.equal(await selected(), 'Stock');
  await swipe(380, 220); // The 24px system edge is reserved, even for a long gesture.
  assert.equal(await selected(), 'Stock');
  await swipe(220, 200); // Too short in the content area.
  assert.equal(await selected(), 'Stock');
  await swipe(380, 355); // Too short.
  assert.equal(await selected(), 'Stock');
  await swipe(320, 150, 250, 250, true);
  assert.equal(await selected(), 'Stock');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 320, y: 250, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 320, y: 250, id: 1 },
      { x: 340, y: 310, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await selected(), 'Stock');

  // A horizontal list at the edge must keep its native scrolling.
  await page.locator('#main-content').evaluate((main) => {
    const strip = document.createElement('div');
    strip.id = 'test-horizontal-list';
    strip.style.cssText =
      'position:fixed;left:0;top:220px;width:100%;height:60px;overflow-x:auto;z-index:5';
    const content = document.createElement('div');
    content.style.cssText = 'width:1400px;height:60px;background:var(--paper)';
    strip.append(content);
    main.append(strip);
  });
  await swipe(330, 170);
  await page.waitForFunction(() => document.querySelector('#test-horizontal-list').scrollLeft > 0);
  assert.equal(await selected(), 'Stock');
  await page.locator('#test-horizontal-list').evaluate((element) => element.remove());
  await swipe(320, 140, 360);
  await nav
    .getByRole('button', { name: 'Scanner', exact: true })
    .and(page.locator('[aria-current="page"]'))
    .waitFor();
  assert.equal(await selected(), 'Scanner');

  await page.getByRole('button', { name: 'Activer la caméra', exact: true }).click();
  await page.waitForFunction(() => window.testTracks.some((track) => track.readyState === 'live'));
  // Camera recognition intentionally blocks content swipes. The explicit tab remains usable
  // and must stop all camera tracks on page exit.
  await nav.getByRole('button', { name: /^À acheter/ }).click();
  await nav
    .getByRole('button', { name: /^À acheter/ })
    .and(page.locator('[aria-current="page"]'))
    .waitFor();
  await page.waitForFunction(() =>
    window.testTracks.every((track) => track.readyState === 'ended'),
  );
  assert.equal(await selected(), 'À acheter');
  await swipe(380, 220); // System-edge gestures cannot change pages.
  assert.equal(await selected(), 'À acheter');
  await nav.getByRole('button', { name: 'Scanner', exact: true }).click();
  assert.equal(await selected(), 'Scanner');
  await nav.getByRole('button', { name: 'Stock', exact: true }).click();
  assert.equal(await selected(), 'Stock');

  // A vertical gesture still scrolls the document, without navigating.
  const stockPane = page.locator('.page-pane').first();
  await stockPane.evaluate((pane) => {
    const spacer = document.createElement('div');
    spacer.id = 'test-scroll-space';
    spacer.style.height = '1600px';
    pane.append(spacer);
    pane.scrollTop = 0;
  });
  // Validate per-pane scrolling independently of Chrome's touch hit-testing target.
  await stockPane.evaluate((pane) => (pane.scrollTop = 120));
  await page.waitForFunction(() => document.querySelector('.page-pane').scrollTop > 0);
  await swipe(200, 200, 600, 250);
  assert.equal(await selected(), 'Stock');
  await page.locator('#test-scroll-space').evaluate((element) => element.remove());
  await stockPane.evaluate((pane) => (pane.scrollTop = 0));
  await page.waitForFunction(() => document.querySelector('.page-pane').scrollTop === 0);

  // Form controls line up despite optional hints; an edge gesture cannot close the editor.
  await page.getByRole('button', { name: 'Détails de Mon produit personnel', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Mon produit personnel' })
    .getByRole('button', { name: 'Modifier le produit', exact: true })
    .click();
  const form = page.getByRole('dialog', { name: 'Modifier le produit' });
  await form.waitFor();
  await form.getByText('Informations produit', { exact: true }).click();
  await mkdir('.tmp', { recursive: true });
  const measurements = [];
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    }, theme);
    for (const width of [320, 390, 760, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      const rows = await form.locator('.field-row').evaluateAll((elements) =>
        elements.map((row) =>
          [...row.querySelectorAll('label > input, label > select')].map((control) => {
            const rect = control.getBoundingClientRect();
            const css = getComputedStyle(control);
            return {
              name: control.name,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
              fontSize: css.fontSize,
              lineHeight: css.lineHeight,
              minHeight: css.minHeight,
              padding: css.padding,
              appearance: css.appearance,
            };
          }),
        ),
      );
      for (const row of rows) {
        assert.equal(row.length, 2);
        assert.ok(Math.abs(row[0].top - row[1].top) <= 1, JSON.stringify({ theme, width, row }));
        assert.ok(
          Math.abs(row[0].bottom - row[1].bottom) <= 1,
          JSON.stringify({ theme, width, row }),
        );
        assert.ok(
          Math.abs(row[0].width - row[1].width) <= 1,
          JSON.stringify({ theme, width, row }),
        );
        assert.ok(
          Math.abs(row[0].height - row[1].height) <= 1,
          JSON.stringify({ theme, width, row }),
        );
        assert.ok(
          row.every((control) => control.height >= 44),
          JSON.stringify({ theme, width, row }),
        );
      }
      assert.ok(await form.evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth));
      // Private photo input now displays its accepted formats instead of an optional hint.
      assert.equal(await form.locator('label > span').filter({ hasText: 'facultatif' }).count(), 3);
      assert.equal(
        await form.getByText('JPG, PNG ou WebP · 20 Mo max.', { exact: true }).count(),
        1,
      );
      for (const name of ['name', 'brand', 'category', 'size', 'unit', 'quantity', 'barcode'])
        assert.ok(
          await form
            .locator(`[name="${name}"]`)
            .evaluate((control) => control.labels[0].textContent.trim().length > 0),
        );
      measurements.push({ theme, width, rows });
      await page.screenshot({ path: `.tmp/product-form-${theme}-${width}.png` });
    }
  }
  await writeFile('.tmp/product-form-metrics.json', JSON.stringify(measurements, null, 2));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await page.screenshot({ path: '.tmp/product-form-aligned-dark.png' });
  await swipe(320, 140, 360);
  assert.equal(await selected(), 'Stock');
  await form.locator('input[name="name"]').fill('Brouillon fictif');
  await swipe(320, 140, 360);
  assert.equal(await form.locator('input[name="name"]').inputValue(), 'Brouillon fictif');
  await form.getByRole('button', { name: 'Fermer', exact: true }).click();
  await form.getByRole('button', { name: 'Abandonner les modifications' }).click();

  await page.setViewportSize({ width: 1024, height: 844 });
  await swipe(1014, 850); // Desktop keeps its ordinary controls.
  assert.equal(await page.locator('.sidebar [aria-current="page"]').innerText(), 'Stock');
  await page.setViewportSize({ width: 390, height: 844 });
  await nav.getByRole('button', { name: 'Scanner', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await selected(), 'Scanner');
  assert.equal(await page.evaluate(() => localStorage.getItem('app-reserve.local.v1')), snapshot);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(
    'Content swipe, system-edge/cancel/scroll/modal guards, camera stop, keyboard and form alignment: passed. No stock or external request.',
  );
} finally {
  await browser?.close();
  server.kill();
}
