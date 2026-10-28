import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const require = createRequire(
  process.env.PLAYWRIGHT_PACKAGE ? resolve(process.env.PLAYWRIGHT_PACKAGE) : import.meta.url,
);
const { chromium } = require('playwright');
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5188',
    '--strictPort',
  ],
  { stdio: 'pipe', windowsHide: true },
);
try {
  for (let i = 0; ; i++) {
    try {
      const response = await fetch('http://127.0.0.1:5188/scripts/browser/off-harness.html');
      if (response.ok) break;
    } catch {}
    if (i > 50 || server.exitCode !== null) throw new Error('Local test server did not start');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://images.openfoodfacts.org/**', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  try {
    await page.goto('http://127.0.0.1:5188/scripts/browser/off-harness.html');
    await page.getByRole('button', { name: 'Scanner', exact: true }).click();
    await page.locator('summary').filter({ hasText: 'Saisir un code-barres' }).click();
    const scan = async (code) => {
      await page.locator('#barcode').fill(code);
      await page.getByRole('button', { name: 'Valider', exact: true }).click();
    };
    const state = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('app-reserve.local.v1')));
    await scan('4006381333931');
    await page.waitForFunction(
      () => JSON.parse(localStorage.getItem('app-reserve.local.v1')).products[0].quantity === 3,
    );
    assert.equal((await state()).shopping[0].quantity, 4);
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    await page.getByRole('button', { name: 'Annuler la dernière opération', exact: true }).click();
    assert.equal((await state()).products[0].quantity, 2);
    assert.equal((await state()).shopping[0].quantity, 5);
    await scan('3017620422003');
    await page.getByRole('status').filter({ hasText: 'Recherche du produit…' }).waitFor();
    await page.evaluate(() => window.finishLookup());
    await page.locator('input[name="name"]').waitFor();
    assert.equal(await page.locator('input[name="name"]').inputValue(), 'Nom proposé');
    assert.equal(await page.locator('input[name="brand"]').inputValue(), 'Marque proposée');
    assert.equal(await page.locator('input[name="size"]').inputValue(), '750');
    assert.equal(await page.locator('input[name="quantity"]').inputValue(), '1');
    await page.locator('input[name="name"]').fill('Nom corrigé');
    await page.locator('input[name="brand"]').fill('Ma marque');
    await page.locator('input[name="size"]').fill('500');
    await page.locator('input[name="quantity"]').fill('3');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.waitForFunction(
      () => JSON.parse(localStorage.getItem('app-reserve.local.v1')).products.length === 2,
    );
    let saved = (await state()).products.find((p) => p.barcode === '3017620422003');
    assert.equal(saved.name, 'Nom corrigé');
    assert.equal(saved.brand, 'Ma marque');
    assert.equal(saved.size, 500);
    assert.equal(saved.quantity, 3);
    assert.equal(saved.external.barcode, '3017620422003');
    await page.getByRole('button', { name: 'Scanner à nouveau', exact: true }).click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('app-reserve.local.v1')).products.find(
          (p) => p.barcode === '3017620422003',
        ).quantity === 4,
    );
    assert.equal(await page.evaluate(() => window.calls.length), 1);
    await scan('00001234');
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.evaluate(() => window.finishLookup());
    await page.waitForTimeout(100);
    assert.equal(await page.locator('dialog').count(), 0);
    await scan('00005678');
    await page.evaluate(() => window.finishLookup('missing'));
    await page.locator('input[name="name"]').waitFor();
    assert.equal(await page.locator('input[name="name"]').inputValue(), '');
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
    await scan('00009876');
    await page.getByRole('button', { name: 'Saisir manuellement', exact: true }).click();
    await page.locator('input[name="name"]').fill('Saisie pendant panne');
    await page.evaluate(() => window.finishLookup());
    assert.equal(await page.locator('input[name="name"]').inputValue(), 'Saisie pendant panne');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );

    assert.deepEqual(errors, []);
    console.log(
      'PASS browser: catalogue priority; linked shopping and undo; editable OFF prefill; next scan without OFF; late response ignored; missing/manual fallback; 390/320px.',
    );
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
