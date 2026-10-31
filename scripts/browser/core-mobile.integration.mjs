import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5193';
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5193',
    '--strictPort',
  ],
  { stdio: 'pipe', windowsHide: true },
);
let browser;
try {
  for (let n = 0; ; n++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (n > 50) throw new Error('Local server did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );
  await page.route('https://images.openfoodfacts.org/images/products/5449000000996.jpg', (route) =>
    route.fulfill({
      path: resolve('explorations/7a/assets/reality/5449000000996.jpg'),
      contentType: 'image/jpeg',
    }),
  );
  await page.goto(origin + '/scripts/browser/core-mobile-harness.html');
  const stock = page.locator('.page-pane').nth(0);
  const nav = page.locator('.mobile-nav');
  await stock.getByRole('heading', { name: 'Votre stock.' }).waitFor();
  const fits = async () =>
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await fits();
  await mkdir('docs/design/phase7ba', { recursive: true });
  await stock.locator('.product-row img').first().waitFor();
  await page.screenshot({ path: 'docs/design/phase7ba/stock-375.png' });
  await stock.getByRole('button', { name: 'Détails de Coca-Cola Original' }).click();
  await page.locator('dialog[open]').getByText('Source et crédits', { exact: true }).click();
  assert.equal(
    await page.locator('dialog[open]').getByRole('link', { name: 'CC BY-SA 3.0' }).count(),
    1,
  );
  await page.screenshot({ path: 'docs/design/phase7ba/detail-375.png' });
  await page.locator('dialog[open]').getByRole('button', { name: 'Fermer', exact: true }).click();
  assert.equal(await stock.locator('.inventory-shelf').count(), 1);
  await stock.getByRole('button', { name: 'Vue compacte' }).click();
  assert.equal(await stock.locator('.inventory-compact').count(), 1);
  await stock.getByRole('button', { name: 'Vue photographique' }).click();
  await stock.getByRole('textbox', { name: 'Rechercher un produit' }).fill('barilla');
  assert.equal(await stock.locator('.product-row').count(), 1);
  await stock.getByRole('button', { name: 'Détails de Penne rigate' }).click();
  let dialog = page.locator('dialog[open]');
  assert.equal(await dialog.locator('h2').evaluate((e) => e === document.activeElement), true);
  await dialog.getByRole('button', { name: 'Ajouter un Penne rigate', exact: true }).click();
  assert.equal(await dialog.locator('.quantity > span').textContent(), '4');
  await dialog.getByRole('button', { name: 'Ajouter aux courses' }).click();
  await dialog.getByRole('button', { name: 'Modifier le produit' }).click();
  dialog = page.locator('dialog[open]');
  assert.equal(await dialog.locator('[name=quantity]').getAttribute('readonly'), '');
  await dialog.locator('[name=name]').fill('Penne brouillon');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Continuer la saisie' }).click();
  assert.equal(await dialog.locator('[name=name]').inputValue(), 'Penne brouillon');
  await dialog.getByText('Informations produit', { exact: true }).click();
  await dialog.locator('[name=brand]').fill('Marque test');
  await page.setViewportSize({ width: 375, height: 460 });
  await dialog.locator('[name=brand]').focus();
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.locator('dialog[open]').waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 375, height: 812 });
  await stock.getByRole('textbox', { name: 'Rechercher un produit' }).fill('');
  assert.equal(await stock.getByRole('button', { name: 'Détails de Penne brouillon' }).count(), 1);
  // A failed local write retains the current draft and confirmed stock.
  await stock.getByRole('button', { name: 'Ajouter un produit', exact: true }).click();
  dialog = page.locator('dialog[open]');
  await dialog.locator('[name=name]').fill('Échec conservé');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => (Storage.prototype.setItem = original);
    Storage.prototype.setItem = function (k, v) {
      if (k === 'app-reserve.local.v1') throw new Error('test write failure');
      return original.call(this, k, v);
    };
  });
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  assert.equal(await dialog.locator('[name=name]').inputValue(), 'Échec conservé');
  await page.evaluate(() => window.restoreStorage());
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await dialog.getByRole('button', { name: 'Abandonner les modifications' }).click();
  await stock.evaluate((e) => (e.scrollTop = 180));
  const scroll = await stock.evaluate((e) => e.scrollTop);
  await nav.getByRole('button', { name: 'À acheter' }).click();
  await nav.getByRole('button', { name: 'Stock', exact: true }).click();
  assert.equal(await stock.evaluate((e) => e.scrollTop), scroll);
  const swipe = async (selector, x, dx, dy = 0) =>
    page.locator(selector).evaluate(
      (el, { x, dx, dy }) => {
        const emit = (type, xx, yy, end = false) =>
          el.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: end
                ? []
                : [new Touch({ identifier: 1, target: el, clientX: xx, clientY: yy })],
              changedTouches: [new Touch({ identifier: 1, target: el, clientX: xx, clientY: yy })],
            }),
          );
        emit('touchstart', x, 200);
        emit('touchmove', x + dx, 200 + dy);
        emit('touchend', x + dx, 200 + dy, true);
      },
      { x, dx, dy },
    );
  await swipe('.page-pane:first-child', 5, -120);
  assert.equal(await nav.locator('[aria-current=page]').textContent(), 'Stock');
  await swipe('.page-pane:first-child', 220, -120, 150);
  assert.equal(await nav.locator('[aria-current=page]').textContent(), 'Stock');
  await swipe('.page-pane:first-child', 220, -120);
  await nav
    .getByRole('button', { name: 'Scanner' })
    .and(page.locator('[aria-current=page]'))
    .waitFor();
  assert.equal(await page.locator('.page-pane').nth(0).getAttribute('inert'), '');
  await nav.getByRole('button', { name: 'Stock', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page.locator('.page-track').evaluate((e) => getComputedStyle(e).transitionDuration),
    '0s',
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await stock.evaluate((e) => (e.scrollTop = 0));
  await fits();
  assert.equal(
    await stock
      .locator('.product-row')
      .first()
      .locator('.quantity-button')
      .first()
      .evaluate((e) => e.getBoundingClientRect().width >= 44),
    true,
  );
  for (const row of await stock
    .locator('.product-row')
    .all()
    .then((rows) => rows.slice(0, 2))) {
    assert(
      await row
        .locator('.quantity')
        .evaluate(
          (e) =>
            e.getBoundingClientRect().bottom <=
            document.querySelector('.mobile-nav').getBoundingClientRect().top,
        ),
      'Two full shelf controls fit at 320x568',
    );
  }
  await page.screenshot({ path: 'docs/design/phase7ba/stock-320.png' });
  await page.evaluate(async () => {
    const i = await import('/src/i18n/index.ts');
    i.chooseLanguage('en');
  });
  await stock.getByRole('button', { name: 'Compact view' }).waitFor();
  await fits();
  for (const theme of ['light', 'dark', 'slate', 'retro-cream', 'retro-petrol']) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    await fits();
  }
  assert.deepEqual(errors, []);
  console.log(
    'Core mobile: shelf/compact, search, detail, confirmed quantity/shopping, progressive edit, draft guard, failed write, keyboard height, scroll, gestures, inert, reduced motion, 320px, FR/EN, themes passed.',
  );
} finally {
  await browser?.close();
  server.kill();
}
