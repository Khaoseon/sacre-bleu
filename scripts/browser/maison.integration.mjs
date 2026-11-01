import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5201';
const output = 'docs/design/maison/screenshots';
const themes = ['light', 'maison', 'maison-night'];
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5201', '--strictPort'],
  { stdio: 'pipe', windowsHide: true },
);
let browser;
const measurements = [];
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    assert(i < 80 && server.exitCode === null, 'Local server starts');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  await context.route('**/*', (r) =>
    new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir(output, { recursive: true });
  const open = async (theme, shared = false) => {
    await page.goto(origin + '/scripts/browser/polish-harness.html' + (shared ? '?shared' : ''));
    await page.evaluate((value) => localStorage.setItem('app-reserve.theme.v1', value), theme);
    await page.reload();
    await page.locator('.app-shell').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
    assert.equal(await page.locator('.storage-error').count(), 0);
  };
  const fits = async () => {
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'No document overflow',
    );
    const sheet = page.locator('dialog[open]');
    if (await sheet.count())
      assert(await sheet.evaluate((d) => d.scrollWidth <= d.clientWidth + 1), 'No sheet overflow');
  };
  const shot = async (name) => {
    await fits();
    await page.screenshot({ path: output + '/' + name + '.png' });
  };
  const nav = () =>
    page.locator((page.viewportSize().width <= 760 ? '.mobile-nav' : '.sidebar nav') + ' button');
  const dialog = page.locator('dialog[open]');
  const disabledPalette = async (locator) => {
    assert(await locator.isDisabled());
    assert(
      await locator.evaluate((el) => {
        const root = getComputedStyle(document.documentElement);
        const style = getComputedStyle(el);
        const probe = document.createElement('span');
        probe.style.color = root.getPropertyValue('--disabled-text').trim();
        probe.style.backgroundColor = root.getPropertyValue('--disabled-surface').trim();
        return (
          style.color === probe.style.color && style.backgroundColor === probe.style.backgroundColor
        );
      }),
      'Disabled controls use resolved disabled colours',
    );
  };
  for (const theme of themes) {
    for (const [width, height] of [
      [320, 568],
      [375, 812],
      [430, 932],
      [1100, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await open(theme);
      for (const [name, index] of [
        ['stock', 0],
        ['scanner', 1],
        ['shopping', 2],
      ]) {
        await nav().nth(index).click();
        await shot(`${theme}-${name}-${width}`);
      }
      await nav().nth(0).click();
      await page.getByRole('button', { name: 'Détails de Penne rigate', exact: true }).click();
      await shot(`${theme}-detail-${width}`);
      await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
      await page.getByRole('button', { name: 'Réglages', exact: true }).click();
      assert.equal(await dialog.locator('input[name=theme]').count(), 3);
      assert.equal(await dialog.locator(`input[value="${theme}"]`).isChecked(), true);
      await shot(`${theme}-preferences-${width}`);
      // All three choices work through the actual settings control.
      for (const next of themes) {
        await dialog.locator(`input[value="${next}"]`).check();
        assert.equal(await page.locator('html').getAttribute('data-theme'), next);
      }
      await dialog.locator(`input[value="${theme}"]`).check();
      await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
      // Computed palette contrasts, independently calculated in linear sRGB.
      if (width === 375) {
        const pairs = await page.evaluate(() => {
          const s = getComputedStyle(document.documentElement);
          const pairs = [
            ['text', 'canvas'],
            ['text', 'paper'],
            ['muted', 'canvas'],
            ['muted', 'paper'],
            ['green', 'selected-surface'],
            ['on-primary', 'green'],
            ['warning-text', 'warning-surface'],
            ['danger-text', 'danger-surface'],
            ['success-text', 'success-surface'],
            ['disabled-text', 'disabled-surface'],
            ['control-border', 'paper'],
            ['focus', 'canvas'],
          ];
          const luminance = (hex) => {
            const v = hex
              .replace('#', '')
              .match(/../g)
              .slice(0, 3)
              .map((x) => parseInt(x, 16) / 255)
              .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
            return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
          };
          return pairs.map(([a, b]) => {
            const x = luminance(s.getPropertyValue('--' + a).trim()),
              y = luminance(s.getPropertyValue('--' + b).trim());
            return {
              pair: a + '/' + b,
              ratio: (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05),
              minimum: ['control-border', 'focus'].includes(a) ? 3 : 4.5,
            };
          });
        });
        for (const p of pairs)
          assert(p.ratio >= p.minimum, `${theme}: ${p.pair} ${p.ratio.toFixed(2)}`);
        measurements.push({ theme, pairs });
        // Selection, checked state, keyboard alternative and empty search.
        await nav().nth(2).click();
        await page.locator('.shopping-check').first().click();
        await shot(`${theme}-completed-375`);
        await nav().nth(0).click();
        await page.locator('.search-input input').fill('introuvable');
        await shot(`${theme}-empty-375`);
      }
      // Read-only/offline warnings and disabled controls through the real store.
      await open(theme, true);
      await page.evaluate(() => window.polish.online(false));
      await page.getByText('Hors ligne · lecture seule', { exact: true }).waitFor();
      await disabledPalette(page.getByRole('button', { name: 'Ajouter un produit', exact: true }));
      await disabledPalette(page.locator('.page-pane').first().locator('.quantity-button').first());
      await shot(`${theme}-offline-${width}`);
    }
    // English names, form and preferences at the narrowest viewport.
    await page.setViewportSize({ width: 320, height: 568 });
    await open(theme);
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Langue' }).selectOption('en');
    await shot(`${theme}-preferences-en-320`);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Add a product', exact: true }).click();
    await shot(`${theme}-editor-en-320`);
    await page.evaluate(() => localStorage.removeItem('app-reserve.language.v1'));
    await page.goto(origin + '/scripts/browser/polish-harness.html?visual');
    await page.locator('.app-shell').waitFor();
    assert.equal(await page.locator('.storage-error').count(), 0);
    await page
      .getByRole('button', { name: /Détails de Penne rigate au blé complet/ })
      .scrollIntoViewIfNeeded();
    const quantity = page
      .locator('.product-row')
      .filter({ has: page.getByText(/Penne rigate au blé complet/) })
      .locator('.quantity');
    const countBox = await quantity.locator(':scope > span').boundingBox();
    const minusBox = await quantity.locator('button').first().boundingBox();
    const plusBox = await quantity.locator('button').last().boundingBox();
    await disabledPalette(quantity.locator('button').last());
    assert(
      countBox.x >= minusBox.x + minusBox.width && countBox.x + countBox.width <= plusBox.x,
      'Four digit quantity has its own space',
    );
    await shot(`${theme}-long-missing-320`);
    await page.locator('.display-switch button').click();
    await shot(`${theme}-compact-long-320`);
    await page.locator('.search-input input').focus();
    assert.equal(
      await page.locator('.search-input input').evaluate((el) => getComputedStyle(el).outlineStyle),
      'solid',
    );
    await shot(`${theme}-focus-320`);
    await page.goto(origin);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
    await shot(`${theme}-authentication-320`);
  }
  // Migration is explicit and stable across a subsequent OS change and reload.
  for (const [old, dark, expected] of [
    ['auto', true, 'maison-night'],
    ['auto', false, 'light'],
    ['dark', false, 'maison-night'],
    ['retro-petrol', false, 'maison-night'],
    ['retro-cream', true, 'light'],
    ['slate', true, 'light'],
  ]) {
    await page.evaluate((value) => localStorage.setItem('app-reserve.theme.v1', value), old);
    await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' });
    await page.goto(origin + '/scripts/browser/polish-harness.html');
    await page.locator('.app-shell').waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), expected);
    assert.equal(await page.evaluate(() => localStorage.getItem('app-reserve.theme.v1')), expected);
    await page.emulateMedia({ colorScheme: dark ? 'light' : 'dark' });
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), expected);
  }
  // A genuine OFF photo is replayed from the existing licensed local fixture.
  await context.route('https://images.openfoodfacts.org/images/products/5449000000996.jpg', (r) =>
    r.fulfill({
      path: 'explorations/7a/assets/reality/5449000000996.jpg',
      contentType: 'image/jpeg',
    }),
  );
  for (const theme of themes) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(origin + '/scripts/browser/core-mobile-harness.html');
    await page.evaluate((value) => localStorage.setItem('app-reserve.theme.v1', value), theme);
    await page.reload();
    await page.locator('.product-row img').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await shot(`${theme}-photo-375`);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    'docs/design/maison/contrasts.json',
    JSON.stringify(measurements, null, 2) + '\n',
  );
  // Contact sheet uses actual screenshots from above, not a reconstructed mockup.
  await page.setViewportSize({ width: 1200, height: 1060 });
  await page.setContent(
    `<html lang="fr"><style>body{margin:0;padding:28px;background:#f8f0df;color:#203d46;font:16px Georgia}h1{font-size:32px;margin:0 0 10px}main{display:flex;gap:20px}article{width:368px}img{width:100%;border:1px solid #8b8069;border-radius:12px}h2{font-size:22px}p{font:14px Arial}</style><h1>Maison Sacré bleu · Trois interprétations</h1><p>Captures Chrome · Stock, 375 × 812 · Phase A</p><main>${themes.map((t, i) => `<article><h2>${['Sauge clair', 'Maison Sacré bleu', 'Maison Nuit'][i]}</h2><img src="${origin}/${output}/${t}-stock-375.png"><p>${['Papier doux · bleu intemporel', 'Vanille · pétrole · safran', 'Encre profonde · lumière dorée'][i]}</p></article>`).join('')}</main></html>`,
  );
  await page.locator('img').evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
  await page.screenshot({ path: output + '/comparison.png', fullPage: true });
  console.log(
    'PASS Maison: 3 appearances; 320/375/430/1100; Stock/Scanner/Shopping/detail/preferences/offline; FR/EN; computed AA contrasts; photo fixture; comparative captures.',
  );
} finally {
  await browser?.close();
  server.kill();
}
