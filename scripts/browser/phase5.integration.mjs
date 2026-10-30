import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import pg from 'pg';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const cli = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
const status = JSON.parse(
  execFileSync(
    process.execPath,
    [resolve('node_modules/supabase', cli.bin.supabase), 'status', '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const api = new URL(status.API_URL);
if (api.hostname !== '127.0.0.1') throw new Error('Local-only fixtures');
const port = Number(
  readFileSync('supabase/config.toml', 'utf8').match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1],
);
const admin = new pg.Client({
  host: '127.0.0.1',
  port,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});
const key = status.PUBLISHABLE_KEY;
const users = [];
async function request(path, body, token) {
  const response = await fetch(new URL(path, api), {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Local fixture API ${path} returned ${response.status}`);
  return response.json();
}
async function account(name) {
  const email = `${randomUUID()}@example.test`,
    password = `Aa1!${randomBytes(24).toString('base64url')}`;
  const signup = await request('/auth/v1/signup', { email, password });
  const id = (signup.user ?? signup).id;
  users.push(id);
  await admin.query('update auth.users set email_confirmed_at=now() where id=$1', [id]);
  const session = await request('/auth/v1/token?grant_type=password', { email, password });
  const reserve = await request(
    '/rest/v1/rpc/create_reserve',
    { p_request_id: randomUUID(), p_name: name },
    session.access_token,
  );
  return { id, email, password, token: session.access_token, reserve: reserve.reserve_id };
}
async function mutate(user, action, payload) {
  return request(
    '/rest/v1/rpc/mutate_reserve',
    {
      p_request_id: randomUUID(),
      p_reserve_id: user.reserve,
      p_action: action,
      p_payload: payload,
    },
    user.token,
  );
}
const root = resolve('dist');
const headers = Object.fromEntries(
  (await readFile('public/_headers', 'utf8'))
    .split(/\r?\n/)
    .filter((l) => /^\s+\S/.test(l))
    .map((l) => {
      const i = l.indexOf(':');
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace('__SUPABASE_ORIGIN__', api.origin),
      ];
    }),
);
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let bytes;
    try {
      bytes = await readFile(file);
    } catch {
      file = resolve(root, 'index.html');
      bytes = await readFile(file);
    }
    res.writeHead(200, {
      ...headers,
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(bytes);
  } catch {
    res.writeHead(500);
    res.end();
  }
});
let browser;
await admin.connect();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  const owner = await account('Réserve fictive phase 5'),
    other = await account('Autre compte fictif');
  const product = (
    await mutate(owner, 'create_product', {
      name: 'Riz fictif',
      barcode: '00123456',
      initial_quantity: 0,
      minimum: 2,
    })
  ).product_id;
  await mutate(owner, 'add_shopping', { product_id: product, quantity: 3 });
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const external = [],
    errors = [];
  let dropRestore = false,
    restoreCalls = 0;
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (![origin, api.origin].includes(url.origin)) {
      external.push(url.origin);
      await route.abort();
      return;
    }
    if (url.pathname === '/rest/v1/rpc/restore_reserve') {
      restoreCalls++;
      if (dropRestore) {
        dropRestore = false;
        await route.fetch();
        await route.abort();
        return;
      }
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', (e) => errors.push(e.message));
  async function login(user) {
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await page.getByRole('heading', { name: 'Votre stock' }).waitFor();
  }
  async function settings() {
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    await page.getByText('Compte et réserve', { exact: true }).click();
  }
  async function closeSettings() {
    await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
  async function snapshot() {
    return request(
      '/rest/v1/rpc/get_reserve_snapshot',
      { p_reserve_id: owner.reserve },
      owner.token,
    );
  }
  await page.goto(origin);
  await login(owner);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() =>
    Object.keys(localStorage).some(
      (k) => k.startsWith('app-reserve.private.v1:') && !k.endsWith(':owner'),
    ),
  );
  await settings();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter la réserve JSON', exact: true }).click();
  const download = await downloadPromise;
  const original = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.deepEqual(Object.keys(original), [
    'format',
    'version',
    'exportedAt',
    'products',
    'shopping',
  ]);
  assert.equal(original.products[0].quantity, 0);
  assert.equal(original.products[0].barcode, '00123456');
  const input = page.getByLabel('Préparer une restauration JSON');
  await input.setInputFiles({
    name: 'corrompu.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await page
    .getByRole('alert')
    .filter({ hasText: /JSON|Sauvegarde/ })
    .waitFor();
  assert.equal(restoreCalls, 0);
  const backup = structuredClone(original);
  backup.products[0].quantity = 4;
  backup.shopping[0].quantity = 2;
  async function choose(b = backup) {
    await input.setInputFiles({
      name: 'restauration.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(b)),
    });
    await page.getByRole('heading', { name: 'Aperçu de remplacement' }).waitFor();
  }
  const before = await snapshot();
  await choose();
  assert.deepEqual(await snapshot(), before);
  await mkdir('.tmp/phase5', { recursive: true });
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      'No overflow in restoration preview',
    );
    assert.equal(
      await page
        .locator('dialog[open]')
        .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth + 1),
      true,
      'No horizontal overflow inside the dialog',
    );
    if (width === 320) {
      await page.locator('.restore-preview').scrollIntoViewIfNeeded();
      await page.screenshot({ path: '.tmp/phase5/apercu-320.png', fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const restoreButton = page.getByRole('button', { name: 'Remplacer et restaurer la réserve' });
  assert.equal(await restoreButton.isDisabled(), true);
  const recovery = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger la sauvegarde avant remplacement' }).click();
  await recovery;
  assert.equal(await restoreButton.isDisabled(), true);
  await page.getByRole('checkbox', { name: /J’ai conservé/ }).check();
  dropRestore = true;
  await restoreButton.click();
  await page
    .getByText(
      'Résultat à vérifier : utilisez Reprendre la demande, sans lancer un nouvel import.',
      { exact: true },
    )
    .waitFor();
  const afterLost = await snapshot();
  assert.equal(afterLost.products[0].quantity, 4);
  assert.equal(afterLost.shopping[0].quantity, 2);
  const normalizeBackup = (b) => ({
    products: b.products.map(({ id, ...p }) => p),
    shopping: b.shopping.map(({ id, product_id, ...s }) => ({
      ...s,
      product: product_id ? b.products.find((p) => p.id === product_id)?.name : null,
    })),
  });
  const restoredBackup = {
    ...backup,
    products: afterLost.products.map(
      ({
        id,
        name,
        barcode,
        brand,
        size,
        unit,
        category,
        quantity,
        minimum,
        off_barcode,
        off_image_url,
        updated_at,
      }) => ({
        id,
        name,
        barcode,
        brand,
        size,
        unit,
        category,
        quantity,
        minimum,
        off_barcode,
        off_image_url,
        updatedAt: new Date(updated_at).toISOString(),
      }),
    ),
    shopping: afterLost.shopping,
  };
  assert.deepEqual(
    normalizeBackup({
      ...restoredBackup,
      shopping: restoredBackup.shopping.map(({ id, product_id, name, quantity, checked }) => ({
        id,
        product_id,
        name,
        quantity,
        checked,
      })),
    }),
    normalizeBackup(backup),
    'All exported domain fields and links restored exactly',
  );
  await closeSettings();
  await page.getByRole('button', { name: 'Reprendre la demande', exact: true }).click();
  await page.getByText('Restauration terminée.', { exact: true }).waitFor();
  assert.deepEqual(await snapshot(), afterLost);
  assert.equal(restoreCalls, 2);
  await settings();
  await choose();
  await mutate(owner, 'stock', { product_id: afterLost.products[0].id, delta: 1 });
  await page
    .getByText('La réserve a changé. Fermez cet aperçu puis sélectionnez à nouveau le fichier.', {
      exact: true,
    })
    .waitFor();
  assert.equal(await restoreButton.isDisabled(), true);
  await page.getByRole('button', { name: 'Fermer l’aperçu' }).click();
  await closeSettings();
  // Cached shell + private read after complete navigation with no network.
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Votre stock' }).waitFor();
  await page.getByText(/Hors ligne · consultation uniquement/).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Ajouter un produit', exact: true }).isDisabled(),
    true,
  );
  await page
    .getByRole('navigation', { name: 'Navigation mobile' })
    .getByRole('button', { name: /À acheter/ })
    .click();
  await page.getByRole('heading', { name: /acheter/ }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Cocher Riz fictif', exact: true }).isDisabled(),
    true,
  );
  // An expired token must still permit cached consultation during an outage.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k === 'app-reserve.auth.v1');
    const session = JSON.parse(localStorage.getItem(key));
    session.expires_at = 1;
    localStorage.setItem(key, JSON.stringify(session));
  });
  await page.reload();
  await page.getByRole('heading', { name: 'Votre stock' }).waitFor();
  // Let Auth finish its actual network retries: an unavailable refresh is not logout.
  await page.waitForTimeout(32_000);
  assert.equal(
    await page.getByRole('heading', { name: 'Votre stock' }).isVisible(),
    true,
    'Expired offline session remains consultable after Auth retries',
  );
  await context.setOffline(false);
  // The locked SDK keeps a failed refresh in a 60s cooldown. Keep the copy
  // visible throughout, then require a real successful authenticated refresh.
  await page.getByText('Synchronisé', { exact: true }).waitFor({ timeout: 75_000 });
  await settings();
  await choose();
  await page.getByRole('button', { name: 'Fermer l’aperçu' }).click();
  await closeSettings();
  // A second open page must drop private memory when logout is broadcast.
  const second = await context.newPage();
  await second.goto(origin);
  await second.getByRole('heading', { name: 'Votre stock' }).waitFor();
  await settings();
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
  await second.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => Object.keys(localStorage).filter((k) => k.startsWith('app-reserve.private.v1:')).length,
    ),
    0,
  );
  await second.close();
  await login(other);
  assert.equal(await page.getByText('Riz fictif', { exact: true }).count(), 0);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Votre stock' }).waitFor();
  assert.equal(await page.getByText('Riz fictif', { exact: true }).count(), 0);
  await settings();
  const offlineLogoutReload = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame === page.mainFrame(),
  });
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  // ReserveAuth deliberately reloads after failed remote logout to clear SDK memory.
  await offlineLogoutReload;
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => Object.keys(localStorage).filter((k) => k.startsWith('app-reserve.private.v1:')).length,
    ),
    0,
  );
  // No private API response or backup is stored by the service worker.
  const cachedUrls = await page.evaluate(async () => {
    const urls = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
    return urls;
  });
  assert.equal(
    cachedUrls.some((url) => new URL(url).origin !== origin),
    false,
  );
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await mkdir('.tmp/phase5', { recursive: true });
  await page.screenshot({ path: '.tmp/phase5/logged-out.png', fullPage: true });
  console.log(
    'Phase 5 navigateur : export, validation, aperçu/confirmation, perte de réponse/reprise idempotente, conflit, PWA hors ligne/expiration, reconnexion, deux comptes et déconnexion multi-onglets réussis ; aucune requête externe.',
  );
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
  if (users.length) {
    await admin.query('delete from public.reserves where owner_id=any($1::uuid[])', [users]);
    await admin.query('delete from private.requests where actor_id=any($1::uuid[])', [users]);
    await admin.query('delete from auth.users where id=any($1::uuid[])', [users]);
  }
  await admin.end();
}
