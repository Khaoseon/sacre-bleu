import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
const origin = 'http://127.0.0.1:5194';
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5194',
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
    if (n > 50 || server.exitCode !== null) throw Error('Local server failed');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const page = await browser.newPage({
    viewport: { width: 320, height: 568 },
    permissions: ['camera'],
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/src/scanner/decoder.ts')
      return route.fulfill({
        contentType: 'application/javascript',
        body: 'export function createDecoder(){return {read(){window.fixtureReads=(window.fixtureReads||0)+1;return window.fixtureBarcode||null},dispose(){}}}',
      });
    return route.continue();
  });
  await page.goto(origin + '/scripts/browser/core-mobile-harness.html');
  const nav = page.locator('.mobile-nav');
  const shopping = page.locator('.page-pane').nth(2);
  const scanner = page.locator('.page-pane').nth(1);
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('app-reserve.local.v1')));
  const fits = async () =>
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const row = (name) =>
    shopping
      .locator('.shopping-row')
      .filter({ has: page.locator('.shopping-item-name strong', { hasText: name }) });
  await nav.getByRole('button', { name: 'À acheter' }).click();
  const entry = shopping.getByRole('textbox', { name: 'Rechercher ou ajouter un article' });
  await entry.fill('barilla');
  await shopping.getByRole('button', { name: /Penne rigate.*Associer ce produit/ }).click();
  await entry.fill('8076802085738');
  await shopping.getByRole('button', { name: /Penne rigate.*Ajouter un exemplaire/ }).click();
  assert.equal((await state()).shopping.filter((i) => i.productId === 'pates').length, 1);
  assert.equal((await state()).shopping.find((i) => i.productId === 'pates').quantity, 2);
  await entry.fill('Penne rigate');
  await shopping.getByRole('button', { name: 'Ajouter comme article libre', exact: true }).click();
  assert.equal((await state()).shopping.filter((i) => i.name === 'Penne rigate').length, 2);
  const linked = shopping
    .locator('.shopping-row')
    .filter({ has: page.getByText('Barilla · 500 g', { exact: true }) });
  await linked.getByRole('button', { name: 'Cocher Penne rigate', exact: true }).click();
  assert.equal((await state()).shopping.find((i) => i.productId === 'pates').quantity, 2);
  await linked.getByRole('button', { name: 'Décocher Penne rigate', exact: true }).click();
  await linked.locator('summary').click();
  await linked.getByRole('button', { name: 'Ajouter un Penne rigate', exact: true }).click();
  assert.equal((await state()).shopping.find((i) => i.productId === 'pates').quantity, 3);
  await linked.getByRole('button', { name: 'Retirer un Penne rigate', exact: true }).click();
  // Persistence failure must not check a row or erase the input draft.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => (Storage.prototype.setItem = original);
    Storage.prototype.setItem = function (k, v) {
      if (k === 'app-reserve.local.v1') throw Error('test write failure');
      return original.call(this, k, v);
    };
  });
  await linked.getByRole('button', { name: 'Cocher Penne rigate', exact: true }).click();
  assert.equal((await state()).shopping.find((i) => i.productId === 'pates').checked, false);
  await entry.fill('Échec conservé');
  await shopping.getByRole('button', { name: 'Ajouter comme article libre', exact: true }).click();
  assert.equal(await entry.inputValue(), 'Échec conservé');
  await page.evaluate(() => window.restoreStorage());
  await entry.fill('');
  await linked.getByRole('button', { name: 'Cocher Penne rigate', exact: true }).click();
  await shopping.getByRole('button', { name: /Effacer les articles cochés/ }).click();
  assert.equal((await state()).shopping.filter((i) => i.productId === 'pates').length, 0);
  await row('Éponges').locator('summary').click();
  await row('Éponges').getByRole('button', { name: 'Supprimer Éponges des courses' }).click();
  await shopping.getByRole('button', { name: 'À réapprovisionner', exact: true }).click();
  const dialog = page.locator('dialog[open]');
  assert(
    await dialog
      .getByText('Aucune quantité suggérée sans minimum défini.', { exact: true })
      .isVisible(),
  );
  const rice = dialog.locator('.replenishment-row').filter({ hasText: 'Riz basmati' });
  await rice.getByRole('button', { name: 'Ajouter 1', exact: true }).click();
  assert(await rice.getByRole('button', { name: 'Déjà dans les courses' }).isDisabled());
  assert.equal((await state()).shopping.filter((i) => i.productId === 'riz').length, 1);
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await fits();
  await entry.fill('Coca-Cola');
  await shopping.getByRole('button', { name: /Coca-Cola Original.*Associer ce produit/ }).click();
  await nav.getByRole('button', { name: 'Scanner', exact: true }).click();
  await scanner.getByRole('button', { name: 'Activer la caméra', exact: true }).click();
  await page.waitForFunction(() => window.fixtureReads > 0);
  await page.evaluate(() => {
    window.keptVideo = document.querySelector('video');
    window.keptTrack = window.keptVideo.srcObject.getVideoTracks()[0];
    window.fixtureBarcode = '8076802085738';
  });
  await scanner.locator('.last-product h2').getByText('Penne rigate', { exact: true }).waitFor();
  assert.equal((await state()).products.find((p) => p.id === 'pates').quantity, 4);
  await scanner.getByRole('button', { name: 'Augmenter la quantité du dernier scan' }).click();
  assert.equal((await state()).products.find((p) => p.id === 'pates').quantity, 5);
  assert.equal(
    await scanner.locator('.sr-only[role=status]').textContent(),
    'Penne rigate · +1 · emballage ajouté · 4 en stock',
  );
  await scanner.getByRole('button', { name: 'Annuler la dernière opération' }).click();
  assert.equal((await state()).products.find((p) => p.id === 'pates').quantity, 3);
  await scanner.getByRole('button', { name: 'Scanner à nouveau', exact: true }).click();
  assert.equal((await state()).products.find((p) => p.id === 'pates').quantity, 4);
  assert(
    await page.evaluate(
      () =>
        document.querySelector('video') === window.keptVideo &&
        window.keptTrack.readyState === 'live',
    ),
  );
  // Continue resumes recognition without treating a held code as withdrawal.
  await scanner.getByRole('button', { name: 'Continuer à scanner' }).click();
  const reads = await page.evaluate(() => window.fixtureReads);
  await page.waitForFunction((n) => window.fixtureReads > n + 6, reads);
  assert.equal((await state()).products.find((p) => p.id === 'pates').quantity, 4);
  await page.evaluate(() => (window.fixtureBarcode = '5449000000996'));
  await scanner
    .locator('.last-product h2')
    .getByText('Coca-Cola Original', { exact: true })
    .waitFor();
  assert.equal((await state()).products.find((p) => p.id === 'off-cola').quantity, 3);
  assert.equal((await state()).shopping.find((i) => i.productId === 'off-cola').quantity, 0);
  assert.equal((await state()).shopping.find((i) => i.productId === 'off-cola').checked, true);
  await fits();
  // Ready/confirmed/repeat/manual remain reachable above the bottom navigation.
  const manual = await scanner.locator('.manual-code summary').boundingBox();
  const bottom = await nav.boundingBox();
  assert(
    manual.y + manual.height <= bottom.y,
    `Manual entry below navigation: ${JSON.stringify({ manual, bottom })}`,
  );
  await scanner.getByRole('button', { name: 'Retirer', exact: true }).click();
  await scanner.getByRole('button', { name: 'Scanner à nouveau', exact: true }).click();
  assert.equal((await state()).products.find((p) => p.id === 'off-cola').quantity, 2);
  assert.equal((await state()).shopping.find((i) => i.productId === 'off-cola').checked, true);
  assert.equal(await scanner.locator('.scan-correction > strong').textContent(), '−1');
  await scanner.locator('.manual-code summary').click();
  await scanner.locator('#barcode').fill('1234567890128');
  await scanner.getByRole('button', { name: 'Valider', exact: true }).click();
  await dialog.locator('[name=name]').fill('Inconnu retrait');
  await dialog.locator('[name=quantity]').fill('2');
  await dialog.getByRole('button', { name: 'Créer sans retrait', exact: true }).click();
  assert.equal((await state()).products.find((p) => p.name === 'Inconnu retrait').quantity, 2);
  assert.equal(await scanner.locator('.scan-correction').count(), 0);
  await nav.getByRole('button', { name: 'Stock', exact: true }).click();
  assert.equal(await page.evaluate(() => window.keptTrack.readyState), 'ended');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark', 'slate', 'retro-cream', 'retro-petrol']) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    await nav.getByRole('button', { name: 'À acheter' }).click();
    await fits();
  }
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  await page.getByRole('combobox', { name: 'Langue' }).selectOption('en');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await shopping.getByRole('textbox', { name: 'Search or add an item' }).fill('draft');
  await fits();
  // Permission failures retain manual entry and never create a stock movement.
  const denied = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await denied.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );
  await denied.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('fixture denial', 'NotAllowedError');
    };
  });
  await denied.goto(origin + '/scripts/browser/core-mobile-harness.html');
  await denied.locator('.mobile-nav').getByRole('button', { name: 'Scanner', exact: true }).click();
  await denied.getByRole('button', { name: 'Activer la caméra', exact: true }).click();
  await denied
    .locator('.camera-error')
    .getByText(/Caméra refusée/)
    .waitFor();
  await denied.locator('.manual-code summary').click();
  assert(await denied.locator('#barcode').isVisible());
  await denied.close();
  assert.deepEqual(errors, []);
  console.log(
    'PASS shopping/scanner: explicit links and free text, accumulation, check/quantities/delete/clear, failed persistence, replenishment, real camera lifecycle with synthetic decoder, held/continue/repeat, absolute correction/undo, linked-shopping reduction, explicit Remove and unknown fallback, 320px controls, EN/themes/reduced motion. No physical optics or hosted services.',
  );
} finally {
  await browser?.close();
  server.kill();
}
