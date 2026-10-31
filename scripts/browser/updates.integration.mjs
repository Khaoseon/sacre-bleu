import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const require = createRequire(
  process.env.PLAYWRIGHT_PACKAGE ? resolve(process.env.PLAYWRIGHT_PACKAGE) : import.meta.url,
);
const { chromium } = require('playwright');
const revisions = ['a'.repeat(40), 'b'.repeat(40)];
const roots = [resolve('.tmp/update-build-a'), resolve('.tmp/update-build-b')];
for (let index = 0; index < roots.length; index++) {
  const child = spawn(
    process.execPath,
    [
      resolve('node_modules/vite/bin/vite.js'),
      'build',
      '--mode',
      'cloud',
      '--outDir',
      roots[index],
    ],
    {
      env: { ...process.env, CF_PAGES_COMMIT_SHA: revisions[index] },
      stdio: 'pipe',
      windowsHide: true,
    },
  );
  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk;
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  await new Promise((done, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? done() : reject(new Error(logs))));
  });
}
const headers = Object.fromEntries(
  (await readFile(resolve(roots[0], '_headers'), 'utf8'))
    .split(/\r?\n/)
    .filter((line) => /^\s+\S/.test(line))
    .map((line) => {
      const colon = line.indexOf(':');
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    }),
);
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
let current = 0;
let broken = false;
let requests = 0;
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/sw.js') requests++;
    if (broken && path === '/sw.js') {
      response.writeHead(503);
      response.end();
      return;
    }
    let file = resolve(roots[current], `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(roots[current] + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      if (!(await stat(file)).isFile()) throw new Error();
    } catch {
      file = resolve(roots[current], 'index.html');
    }
    response.writeHead(200, {
      ...headers,
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(500);
    response.end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const external = [];
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(new URL(route.request().url()).origin);
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  await page.getByText('Accès réservé aux comptes autorisés.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Créer un compte', exact: true }).count(), 0);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const banner = page.getByRole('complementary', { name: 'Mise à jour de l’application' });
  const settings = async (demo = false) => {
    await page.getByRole('button', { name: demo ? 'Réglages' : 'Paramètres', exact: true }).click();
    return page.locator('.update-controls');
  };
  let controls = await settings();
  assert.match(await page.locator('.app-version').innerText(), /aaaaaaaaaaaa/);
  await controls.getByRole('button', { name: 'Vérifier les mises à jour' }).click();
  await controls.getByText('Aucune nouvelle version disponible.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.locator('input[type="email"]').fill('exemple@example.invalid');
  current = 1;
  controls = await settings();
  await controls.getByRole('button', { name: 'Vérifier les mises à jour' }).click();
  await controls.getByText('Nouvelle version disponible.', { exact: true }).waitFor();
  await controls.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await controls
    .getByText('Terminez ou effacez la saisie du compte avant d’actualiser.', { exact: true })
    .waitFor();
  await page.getByLabel('Langue', { exact: true }).selectOption('en');
  await controls
    .getByText('Finish or clear the account form before updating.', { exact: true })
    .waitFor();
  await page.getByRole('complementary', { name: 'App update', exact: true }).waitFor();
  assert.equal(await page.locator('input[type="email"]').inputValue(), 'exemple@example.invalid');
  await page.getByLabel('Language', { exact: true }).selectOption('fr');
  assert.match(await page.locator('.app-version').innerText(), /aaaaaaaaaaaa/);
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  assert.equal(await page.locator('input[type="email"]').inputValue(), 'exemple@example.invalid');
  await page.locator('input[type="email"]').fill('');

  await banner.getByRole('button', { name: 'Plus tard', exact: true }).click();
  assert.equal(await banner.count(), 0);
  await page.getByRole('button', { name: 'Essayer la démonstration sur cet appareil' }).click();
  await page
    .getByRole('button', { name: /^Détails de / })
    .first()
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Modifier le produit', exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: 'Modifier le produit' });
  await editor.locator('input[name="name"]').fill('Brouillon fictif à conserver');
  assert.equal(
    await editor.locator('input[name="name"]').inputValue(),
    'Brouillon fictif à conserver',
  );
  await page.evaluate(() => new Promise((done) => setTimeout(done, 100)));
  assert.equal(
    await editor.locator('input[name="name"]').inputValue(),
    'Brouillon fictif à conserver',
  );
  await editor.getByRole('button', { name: 'Fermer', exact: true }).click();
  // The V1.1 editor requires an explicit decision before losing a dirty draft.
  await editor.getByRole('button', { name: 'Abandonner les modifications' }).click();
  controls = await settings(true);
  await page.getByText('Données de démonstration', { exact: true }).click();
  await page.getByText(/La recherche Open Food Facts est désactivée/).waitFor();
  assert.equal(await page.getByText(/Open Food Facts viendra plus tard/).count(), 0);
  await controls.getByRole('button', { name: 'Vérifier les mises à jour' }).click();
  await controls.getByText('Nouvelle version disponible.', { exact: true }).waitFor();

  await context.setOffline(true);
  await controls.getByRole('button', { name: 'Vérifier les mises à jour' }).click();
  await controls
    .getByText('Connexion Internet nécessaire pour vérifier les mises à jour.', { exact: true })
    .waitFor();
  await controls.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await controls
    .getByText('Rétablissez la connexion Internet avant d’actualiser.', { exact: true })
    .waitFor();
  await context.setOffline(false);
  broken = true;
  await controls.getByRole('button', { name: 'Vérifier les mises à jour' }).click();
  await controls
    .getByText('Vérification impossible. Vérifiez votre connexion puis réessayez.', { exact: true })
    .waitFor();
  broken = false;
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();

  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: /^À acheter/ })
    .click();
  await page.locator('.shopping-name input').fill('Article fictif non enregistré');
  await banner.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await banner
    .getByText('Terminez ou effacez la saisie dans À acheter avant d’actualiser.', { exact: true })
    .waitFor();
  assert.equal(
    await page.locator('.shopping-name input').inputValue(),
    'Article fictif non enregistré',
  );
  await page.locator('.shopping-name input').fill('');
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Scanner', exact: true })
    .click();
  await banner.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await banner
    .getByText('Revenez à Stock ou À acheter avant d’actualiser.', { exact: true })
    .waitFor();
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: 'Stock', exact: true })
    .click();

  await page.evaluate(() => {
    sessionStorage.setItem('app-reserve.pending.v1:test-only', 'fictif');
  });
  await banner.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await banner
    .getByText('Terminez ou vérifiez la demande en attente avant d’actualiser.', { exact: true })
    .waitFor();
  await page.evaluate(() => {
    sessionStorage.removeItem('app-reserve.pending.v1:test-only');
  });
  const other = await context.newPage();
  await other.goto(origin);
  await other.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
  await other.locator('input[type="email"]').fill('autre@example.invalid');
  await banner.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await banner
    .getByText('Fermez les autres fenêtres de Sacré bleu, puis touchez Actualiser à nouveau.', {
      exact: true,
    })
    .waitFor();
  assert.equal(await other.locator('input[type="email"]').inputValue(), 'autre@example.invalid');
  await other.close();

  await page.evaluate(() => {
    localStorage.setItem('test-preserved', 'fictif');
    sessionStorage.setItem('test-preserved', 'fictif');
  });
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  await mkdir('.tmp', { recursive: true });
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await banner.evaluate((element) => element.scrollWidth <= element.clientWidth));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.tmp/app-update-banner.png' });
  await banner.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await page.waitForURL(origin + '/');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
  controls = await settings();
  assert.match(await page.locator('.app-version').innerText(), /bbbbbbbbbbbb/);
  assert.deepEqual(
    await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })),
    storage,
  );
  await controls.getByRole('button', { name: 'Vérifier les mises à jour' }).click();
  await controls.getByText('Aucune nouvelle version disponible.', { exact: true }).waitFor();
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        transition: 'A → B after explicit click',
        deferred: true,
        draftProtected: true,
        pendingProtected: true,
        otherWindowProtected: true,
        offlineAndServerError: true,
        storagePreserved: true,
        swRequests: requests,
        externalRequests: external.length,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
