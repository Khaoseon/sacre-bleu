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
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (attempt >= 100 || server.exitCode !== null)
      throw new Error('Local i18n server failed to start');
    await new Promise((done) => setTimeout(done, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 320, height: 844 },
    locale: 'en-GB',
  });
  const external = [],
    errors = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      external.push(url.origin);
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(e.message));
  const lang = () => page.getByRole('combobox', { name: /^(Langue|Language)$/ });
  const fits = async () => {
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'No page overflow',
    );
    const dialog = page.locator('dialog[open]');
    if (await dialog.count())
      assert.equal(
        await dialog.evaluate((d) => d.scrollWidth <= d.clientWidth + 1),
        true,
        'No modal overflow',
      );
  };
  await page.goto(origin);
  assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await lang().focus();
  await lang().selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(
    await lang().evaluate((s) => s === document.activeElement),
    true,
    'Language selection preserves focus',
  );
  assert.equal(await page.title(), 'Sacré bleu · Your shared pantry');
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  await fits();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  await page.getByLabel('Email', { exact: true }).fill('fiction@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Fictitious1!Password');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await lang().selectOption('fr');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  assert.equal(
    await page.getByLabel('Email', { exact: true }).inputValue(),
    'fiction@example.test',
  );
  assert.equal(
    await page.getByLabel('Mot de passe', { exact: true }).inputValue(),
    'Fictitious1!Password',
  );
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await lang().selectOption('en');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Try the demo on this device', exact: true }).click();
  await page.getByRole('heading', { name: 'Your stock' }).waitFor();
  const before = await page.evaluate(() => localStorage.getItem('app-reserve.local.v1'));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await lang().selectOption('fr');
  await page.getByRole('heading', { name: 'Préférences', exact: true }).waitFor();
  await fits();
  await lang().selectOption('en');
  await page.getByRole('heading', { name: 'Preferences', exact: true }).waitFor();
  await fits();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Add a product', exact: true }).click();
  await page.getByLabel('Product name', { exact: true }).fill(' ');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Give the product a name.', { exact: true }).last().waitFor();
  // Optional fields are intentionally collapsed in the V1.1 progressive editor.
  await page.getByText('Product information', { exact: true }).click();
  await page.locator('[name="brand"]').fill('Ma marque');
  await page.locator('[name="category"]').selectOption('Légumineuses');
  await page.locator('[name="unit"]').selectOption('pièce');
  await page.evaluate(async () => {
    const i18n = await import('/src/i18n/index.ts');
    i18n.chooseLanguage('fr');
  });
  await page.getByText('Donnez un nom au produit.', { exact: true }).last().waitFor();
  assert.equal(await page.locator('[name="brand"]').inputValue(), 'Ma marque');
  assert.equal(await page.locator('[name="category"]').inputValue(), 'Légumineuses');
  assert.equal(await page.locator('[name="unit"]').inputValue(), 'pièce');
  await fits();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  // Switching language must retain the dirty draft until an explicit discard.
  await page.getByRole('button', { name: 'Abandonner les modifications' }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem('app-reserve.local.v1')),
    before,
    'Language changes never mutate inventory',
  );
  const nav = page.getByRole('navigation', { name: 'Navigation mobile' });
  await nav.getByRole('button', { name: 'À acheter' }).click();
  await page.getByLabel('Nom de l’article libre').fill('Ma saisie en cours');
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  await lang().selectOption('en');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await page.getByLabel('Free-text item name').inputValue(), 'Ma saisie en cours');
  await fits();
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('button', { name: 'Scanner' })
    .click();
  await page.getByRole('button', { name: 'Enable camera' }).waitFor();
  await fits();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await fits();
  await page.getByText('Demo data', { exact: true }).click();
  await page.getByRole('button', { name: 'Exit demo', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('app-reserve.language.v1')), 'en');
  await page.reload();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'app-reserve.language.v1') throw new DOMException('Denied', 'SecurityError');
      original.call(this, key, value);
    };
  });
  await lang().selectOption('fr');
  await page.getByRole('alert').filter({ hasText: 'Impossible de mémoriser la langue' }).waitFor();
  await fits();
  assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
  await context.close();
  const malformed = await browser.newContext();
  await malformed.addInitScript(() => localStorage.setItem('app-reserve.language.v1', 'invalid'));
  const invalidPage = await malformed.newPage();
  await invalidPage.goto(origin);
  await invalidPage.getByRole('button', { name: 'Paramètres', exact: true }).waitFor();
  assert.equal(await invalidPage.locator('html').getAttribute('lang'), 'fr');
  await malformed.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    'FR/EN unauthenticated/demo, immediate switching, focus/form/category preservation, validation, reload, storage failure, 320px layouts and zero external requests: passed.',
  );
} finally {
  await browser?.close();
  server.kill();
}
