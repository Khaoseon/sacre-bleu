import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5197';
const evidence = resolve('docs/design/phase7a/screenshots');
let server, browser;
try {
  let available = false;
  try {
    available = (await fetch(origin)).ok;
  } catch {}
  if (!available)
    server = spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', '--config', 'explorations/7a/vite.config.ts'],
      { stdio: 'pipe', windowsHide: true },
    );
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (i > 60 || server?.exitCode != null) throw new Error('7A server unavailable');
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir(evidence, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const external = [],
    errors = [];
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin);
  await page.locator('.product-card').first().waitFor();
  const nav = page.getByRole('navigation');
  const selected = () => nav.locator('[aria-current]').innerText();
  const cdp = await context.newCDPSession(page);
  async function swipe(x, endX, y, endY, cancel = false) {
    y ??= await page.locator('h1').evaluate((el) => {
      const box = el.getBoundingClientRect();
      return box.y + box.height / 2;
    });
    endY ??= y;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let i = 1; i <= 8; i++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + ((endX - x) * i) / 8, y: y + ((endY - y) * i) / 8, id: 1 }],
      });
    await cdp.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
  }
  async function screenshot(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    });
    await page.screenshot({
      path: resolve(evidence, name),
      fullPage: false,
      animations: 'disabled',
    });
  }
  async function settings(state) {
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await page.getByLabel('Simuler un état').selectOption(state);
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
  for (const width of [320, 375, 430, 900]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 375 ? 812 : 932 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `No overflow at ${width}`,
    );
    await screenshot(`inventory-${width}.png`);
    if (width <= 430) {
      await swipe(width * 0.65, width * 0.2);
      assert.match(await selected(), /Scanner/, `Content swipe at ${width}`);
      await swipe(width * 0.2, width * 0.65);
      assert.match(await selected(), /Stock/, `Reverse swipe at ${width}`);
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await swipe(245, 90);
  assert.match(await selected(), /Scanner/, 'Content swipe moves forward');
  await swipe(90, 245);
  assert.match(await selected(), /Stock/, 'Content swipe moves backward');
  await swipe(245, 218);
  assert.match(await selected(), /Stock/, 'Short drag cancels');
  await swipe(245, 90, undefined, undefined, true);
  assert.match(await selected(), /Stock/, 'Cancelled touch stays');
  await swipe(245, 90, 150, 310);
  assert.match(await selected(), /Stock/, 'Vertical intent does not navigate');
  await page.evaluate(() => scrollTo(0, 0));
  await swipe(10, 170);
  assert.match(await selected(), /Stock/, 'System edge stays');
  const image = await page.locator('[data-product="pasta"] .image-hit').boundingBox();
  await swipe(image.x + image.width * 0.8, image.x + image.width * 0.2, image.y + 30);
  assert.match(await selected(), /Stock/, 'Interactive image stays');
  const pasta = page.locator('[data-product="pasta"]');
  const before = await pasta.locator('output').innerText();
  await pasta.getByRole('button', { name: 'Ajouter Rigatoni', exact: true }).click();
  assert.equal(
    await pasta.locator('output').innerText(),
    before,
    'Count stays during pending confirmation',
  );
  await page.getByText('Enregistré dans la simulation.', { exact: true }).waitFor();
  assert.equal(await pasta.locator('output').innerText(), String(Number(before) + 1));
  await settings('failure');
  await pasta.getByRole('button', { name: 'Ajouter Rigatoni', exact: true }).click();
  await page.getByText('Échec simulé. Aucun changement appliqué.', { exact: true }).waitFor();
  assert.equal(
    await pasta.locator('output').innerText(),
    String(Number(before) + 1),
    'Failed write leaves count',
  );
  await settings('offline');
  assert.equal(
    await pasta.getByRole('button', { name: 'Ajouter Rigatoni', exact: true }).isDisabled(),
    true,
  );
  await screenshot('offline-375.png');
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await page.getByRole('button', { name: 'Détails Rigatoni', exact: true }).click();
  await screenshot('detail-375.png');
  await page.getByRole('button', { name: 'Modifier le produit', exact: true }).click();
  await page.getByLabel('Nom du produit', { exact: true }).fill('Rigatoni test');
  await screenshot('editor-375.png');
  await page
    .getByLabel('Choisir une photo', { exact: true })
    .setInputFiles(resolve('public/favicon.png'));
  await page.getByRole('button', { name: 'Revenir au visuel proposé', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Revenir au visuel proposé', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await pasta.getByRole('button', { name: 'Rigatoni test', exact: true }).count(), 1);
  await nav.getByRole('button', { name: 'Scanner', exact: true }).click();
  await screenshot('scanner-375.png');
  await page.getByRole('button', { name: 'Démarrer la simulation', exact: true }).click();
  await swipe(245, 90);
  assert.match(await selected(), /Scanner/, 'Active scanner blocks page swipe');
  await page.getByRole('button', { name: 'Simuler une lecture', exact: true }).click();
  await page.getByText('Lecture confirmée', { exact: true }).waitFor();
  await page
    .getByText('Enregistré dans la simulation.', { exact: true })
    .waitFor({ state: 'hidden' });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await screenshot('scan-result-375.png');
  await page.getByRole('button', { name: 'Annuler le dernier scan', exact: true }).click();
  await page.getByText('Lecture confirmée', { exact: true }).waitFor({ state: 'hidden' });
  await nav.getByRole('button', { name: 'À acheter', exact: true }).click();
  await page.getByRole('button', { name: 'Dans le panier · Pain au levain', exact: true }).click();
  await page.getByRole('button', { name: 'À prendre · Pain au levain', exact: true }).waitFor();
  await page
    .getByRole('textbox', { name: 'Ajouter à la liste', exact: true })
    .fill('Café de démonstration');
  await page.getByRole('button', { name: 'Ajouter à la liste', exact: true }).click();
  await page.getByText('Café de démonstration', { exact: true }).waitFor();
  await page
    .getByText('Enregistré dans la simulation.', { exact: true })
    .waitFor({ state: 'hidden' });
  await screenshot('shopping-375.png');
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByLabel('Langue', { exact: true }).selectOption('en');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.match(await page.locator('h1').innerText(), /shopping list/);
  assert.equal(
    await page.getByText('Café de démonstration', { exact: true }).count(),
    1,
    'User content is not translated',
  );
  await screenshot('shopping-en-375.png');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Language', { exact: true }).selectOption('fr');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await nav.getByRole('button', { name: 'Stock', exact: true }).click();
  await settings('empty');
  await screenshot('empty-375.png');
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByRole('button', { name: 'Retrouver les exemples', exact: true }).click();
  await page.getByLabel('Rechercher un produit', { exact: true }).fill('huile');
  assert.equal(await page.locator('.product-card').count(), 1, 'Search filters products');
  await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).click();
  // Newly added products/scans keep the V1 zero-stock and compensation contract.
  await nav.getByRole('button', { name: 'Scanner', exact: true }).click();
  await page.getByRole('button', { name: 'Saisir un code-barres', exact: true }).click();
  await page.getByLabel('Code-barres', { exact: true }).fill('1234567890123');
  await page.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByLabel('Nom du produit', { exact: true }).fill('Produit fictif');
  await page.getByLabel('Quantité en stock', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Lecture confirmée', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Annuler le dernier scan', exact: true }).click();
  await page.getByText('Lecture confirmée', { exact: true }).waitFor({ state: 'hidden' });
  await nav.getByRole('button', { name: 'Stock', exact: true }).click();
  const created = page
    .locator('.product-card')
    .filter({ has: page.getByRole('button', { name: 'Produit fictif', exact: true }) });
  assert.equal(
    await created.locator('output').innerText(),
    '0',
    'Unknown positive scan undo preserves product at zero',
  );
  await created.getByRole('button', { name: 'Détails Produit fictif', exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  assert.equal(
    await page.getByRole('dialog').getByText('Produit fictif', { exact: true }).count(),
    1,
    'Deletion requires confirmation',
  );
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  assert.equal(await created.count(), 1, 'Cancel preserves product');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page.locator('.page-content').evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s',
  );
  await nav.getByRole('button', { name: 'Scanner', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.match(await selected(), /Scanner/, 'Keyboard direct navigation works');
  assert.deepEqual(external, [], 'No external requests');
  assert.deepEqual(errors, [], 'No runtime errors');
  assert.equal(await page.evaluate(() => localStorage.length), 0, 'No persistent storage touched');
  assert.equal(await page.evaluate(() => sessionStorage.length), 0, 'No account journal touched');
  assert.deepEqual(
    await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((v) => v.map((r) => r.scope)),
    ),
    [],
    'No service worker',
  );
  await context.close();
  // Isolation evidence is checked after the normal build.
  const files = await readdir(resolve('dist/assets'));
  for (const file of files.filter((f) => /\.(js|css)$/.test(f))) {
    const content = await readFile(resolve('dist/assets', file), 'utf8');
    assert.equal(
      /Atelier 7A|7A studio|prototype-ribbon|Maison Bleue/.test(content),
      false,
      `Production excludes 7A: ${file}`,
    );
  }
  assert.equal(
    files.some((f) => /pasta|chickpea|tomato|oil/.test(f)),
    false,
    'Production excludes sample assets',
  );
  console.log(
    '7A browser checks passed: 320/375/430/900 px, content/vertical/short/cancel/edge/control/camera gestures, confirmed/failure/offline writes, editor/photo, scan/undo, shopping, search, FR/EN, keyboard, reduced motion, no remote requests/storage/SW, production isolation.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
