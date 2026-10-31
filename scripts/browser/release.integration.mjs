// Disposable local accounts, real Root/store/RPC/photo processor. No hosted requests.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import jpeg from 'jpeg-js';
import pg from 'pg';

const statusRun = spawnSync(
  process.execPath,
  ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'],
  { encoding: 'utf8', windowsHide: true },
);
if (statusRun.status !== 0) throw Error('Local Supabase unavailable; diagnostics suppressed');
const status = JSON.parse(statusRun.stdout);
const api = new URL(status.API_URL);
if (api.hostname !== '127.0.0.1') throw Error('Local-only fixtures');
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const authAdmin = createClient(api.href, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const port = Number(
  readFileSync('supabase/config.toml', 'utf8').match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1],
);
assert(port);
const admin = new pg.Client({
  host: '127.0.0.1',
  port,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});
await admin.connect();
// The processor's documented local allowed origin, with a strict port to avoid reusing another app.
const origin = 'http://127.0.0.1:5173';
const users = [],
  clients = [],
  errors = [],
  external = [];
let reserve, server, browser;
const photo = jpeg.encode(
  { width: 32, height: 24, data: new Uint8Array(32 * 24 * 4).fill(200) },
  80,
).data;
async function rpc(client, name, args) {
  const result = await client.rpc(name, args);
  if (result.error) throw Error(`Local RPC failed: ${name}`);
  return result.data;
}
const snapshot = () => rpc(clients[0], 'get_reserve_snapshot', { p_reserve_id: reserve });
try {
  for (let index = 0; index < 2; index++) {
    const email = `${randomUUID()}@example.test`,
      password = `FixtureAa1!${randomUUID()}`;
    const result = await authAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    assert(!result.error && result.data.user);
    users.push({ id: result.data.user.id, email, password });
    const client = createClient(api.href, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clients.push(client);
    assert(!(await client.auth.signInWithPassword({ email, password })).error);
  }
  reserve = (
    await rpc(clients[0], 'create_reserve', {
      p_request_id: randomUUID(),
      p_name: 'Release QA fictive',
    })
  ).reserve_id;
  const invite = await rpc(clients[0], 'invite_member', {
    p_request_id: randomUUID(),
    p_reserve_id: reserve,
    p_email: users[1].email,
  });
  await rpc(clients[1], 'accept_invitation', {
    p_request_id: randomUUID(),
    p_invitation_id: invite.invitation_id,
    p_token: invite.token,
  });
  server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    {
      env: { ...process.env, VITE_SUPABASE_URL: api.origin, VITE_SUPABASE_PUBLISHABLE_KEY: key },
      stdio: 'pipe',
      windowsHide: true,
    },
  );
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw Error('Strict local QA server unavailable');
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    assert(attempt < 70, 'Local server starts');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const contexts = [],
    pages = [];
  for (const user of users) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    contexts.push(context);
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if ([origin, api.origin].includes(url.origin)) return route.continue();
      external.push(url.origin);
      return route.abort();
    });
    const page = await context.newPage();
    pages.push(page);
    page.setDefaultTimeout(12000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin);
    await page.locator('input[type=email]').fill(user.email);
    await page.locator('input[type=password]').fill(user.password);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await page.getByRole('heading', { name: 'Votre stock.' }).waitFor();
  }
  const [page, member] = pages;
  const stock = page.locator('.page-pane').nth(0);
  const dialog = page.locator('dialog[open]');
  const nav = page.locator('.mobile-nav');
  await stock.getByRole('button', { name: 'Ajouter un produit', exact: true }).first().click();
  await dialog.locator('[name=name]').fill('Riz QA');
  await dialog.locator('[name=quantity]').fill('2');
  await dialog
    .locator('input[type=file]')
    .setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: photo });
  await dialog.locator('.photo-preview img[src^="data:image/jpeg"]').waitFor();
  assert.equal((await snapshot()).products.length, 0, 'Preview does not create data');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  await stock.locator('.product-row img[src^="blob:"]').waitFor();
  let data = await snapshot();
  const id = data.products[0].id;
  assert(data.products[0].photo_path);
  const path = data.products[0].photo_path;
  await member.locator('.product-row img[src^="blob:"]').waitFor();
  // Photo references must not prevent the *inventory* offline cache from advancing.
  assert.equal(
    await page
      .getByText('La copie hors ligne n’a pas pu être conservée sur cet appareil.', { exact: true })
      .count(),
    0,
  );
  await stock.getByRole('button', { name: 'Détails de Riz QA' }).click();
  await dialog.getByRole('button', { name: 'Ajouter un Riz QA', exact: true }).click();
  await dialog.locator('.quantity > span').filter({ hasText: '3' }).waitFor();
  await dialog.getByRole('button', { name: 'Ajouter aux courses', exact: true }).click();
  await dialog.getByRole('button', { name: 'Modifier le produit', exact: true }).click();
  await dialog.locator('[name=name]').fill('Riz QA modifié');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  data = await snapshot();
  assert.equal(data.products[0].photo_path, path, 'Metadata preserves photo');
  assert.equal(data.products[0].quantity, 3);
  assert.equal(data.shopping[0].product_id, id);
  await nav.getByRole('button', { name: /^À acheter/ }).click();
  await page.locator('.shopping-options summary').click();
  await page.getByRole('button', { name: 'Ajouter un Riz QA', exact: true }).click();
  await page.locator('.shopping-options summary').filter({ hasText: '2' }).waitFor();
  await nav.getByRole('button', { name: 'Stock', exact: true }).click();
  // Small representative set, no screenshot matrix. Check clipping inside panes as well as the document.
  for (const width of [320, 430, 900]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 932 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert(await stock.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
    for (const button of await stock.locator('.quantity-button').all()) {
      assert(
        await button.evaluate((e) => {
          const r = e.getBoundingClientRect();
          return r.width >= 44 && r.height >= 44;
        }),
      );
    }
  }
  await rpc(clients[0], 'mutate_reserve', {
    p_request_id: randomUUID(),
    p_reserve_id: reserve,
    p_action: 'stock',
    p_payload: { product_id: id, delta: 9996 },
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await stock.locator('.quantity > span').filter({ hasText: '9' }).waitFor();
  const cached = await page.evaluate(() => {
    const entry = Object.keys(localStorage).find(
      (k) => k.startsWith('app-reserve.private.v1:') && !k.endsWith(':owner'),
    );
    return entry ? JSON.parse(localStorage.getItem(entry)) : null;
  });
  assert.equal(
    cached?.snapshot.products[0].quantity,
    9999,
    'Photographed stock stays current on disk',
  );
  assert.equal(cached.snapshot.products[0].photo_path, path);
  assert(!JSON.stringify(cached).includes('data:image'), 'No image bytes in offline snapshot');
  await page.reload();
  await stock.locator('.product-row img[src^="blob:"]').waitFor();
  await contexts[0].setOffline(true);
  await page.getByText('Hors ligne · lecture seule', { exact: true }).waitFor();
  await stock.locator('img[src^="blob:"]').waitFor({ state: 'detached' });
  assert(
    await stock
      .getByRole('button', { name: 'Retirer un Riz QA modifié', exact: true })
      .isDisabled(),
  );
  await contexts[0].setOffline(false);
  await page.getByText('Synchronisé', { exact: true }).waitFor();
  await stock.locator('.product-row img[src^="blob:"]').waitFor();
  await page.locator('.toast.error').waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  assert(
    await stock.locator('.quantity > span').evaluate((e) => e.scrollWidth <= e.clientWidth),
    'Enlarged quantity text must not overlap the buttons',
  );
  assert(await stock.evaluate((e) => e.scrollWidth <= e.clientWidth + 1), 'Large text pane fits');
  const clipped = await stock.locator('.quantity-button').evaluateAll((buttons) =>
    buttons.some((e) => {
      const r = e.getBoundingClientRect(),
        p = e.closest('.page-pane').getBoundingClientRect();
      return r.left < p.left || r.right > p.right;
    }),
  );
  mkdirSync('.tmp/phase7c', { recursive: true });
  const largeTextStockControl = stock.getByRole('button', {
    name: 'Retirer un Riz QA modifié',
    exact: true,
  });
  await largeTextStockControl.scrollIntoViewIfNeeded();
  assert(
    await largeTextStockControl.evaluate((e) => {
      const r = e.getBoundingClientRect(),
        p = e.closest('.page-pane').getBoundingClientRect();
      return (
        r.top >= p.top &&
        r.bottom <= p.bottom &&
        r.bottom <= document.querySelector('.mobile-nav').getBoundingClientRect().top
      );
    }),
    'Large text stock controls scroll clear of fixed navigation',
  );
  await page.screenshot({ path: '.tmp/phase7c/large-text-320.png' });
  assert(!clipped, 'Large text stock controls remain reachable');
  await page.evaluate(() => (document.documentElement.style.fontSize = ''));
  await page.setViewportSize({ width: 375, height: 812 });
  mkdirSync('.tmp/phase7c', { recursive: true });
  await page.screenshot({ path: '.tmp/phase7c/connected-stock-375.png' });
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  await dialog.getByText('Compte et réserve', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Exporter la réserve JSON', exact: true }).click();
  await dialog.getByRole('alert').filter({ hasText: /photo/i }).waitFor();
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await stock.getByRole('button', { name: 'Détails de Riz QA modifié' }).click();
  await dialog.getByRole('button', { name: 'Modifier le produit', exact: true }).click();
  await dialog
    .locator('input[type=file]')
    .setInputFiles({ name: 'replacement.jpg', mimeType: 'image/jpeg', buffer: photo });
  await dialog.locator('.photo-preview img[src^="data:image/jpeg"]').waitFor();
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.notEqual(
    (await snapshot()).products[0].photo_path,
    path,
    'Replacement has immutable locator',
  );
  await stock.getByRole('button', { name: 'Détails de Riz QA modifié' }).click();
  await dialog.getByRole('button', { name: 'Modifier le produit', exact: true }).click();
  await dialog.getByRole('button', { name: 'Retirer la photo', exact: true }).click();
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal((await snapshot()).products[0].photo_path, null);
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  const download = page.waitForEvent('download');
  await dialog.getByText('Compte et réserve', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Exporter la réserve JSON', exact: true }).click();
  assert((await download).suggestedFilename().endsWith('.json'));
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await stock.getByRole('button', { name: 'Détails de Riz QA modifié' }).click();
  await dialog.getByRole('button', { name: 'Modifier le produit', exact: true }).click();
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  data = await snapshot();
  assert.equal(data.products.length, 0);
  assert.equal(data.shopping[0].product_id, null, 'Deletion retains free shopping row');
  assert.equal(data.shopping[0].quantity, 2);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    'Release connected: two members, create/photo preview/upload, stock, linked shopping, metadata, 320/430/900px, 200% text, JSON guard/export, replace/remove and delete/detach passed. Local only; no physical-device claim.',
  );
} finally {
  await browser?.close();
  server?.kill();
  await Promise.all(clients.map((client) => client.auth.signOut()));
  if (reserve) await admin.query('delete from public.reserves where id=$1', [reserve]);
  if (users.length) {
    const ids = users.map((user) => user.id);
    await admin.query('delete from private.requests where actor_id=any($1::uuid[])', [ids]);
    await admin.query('delete from auth.users where id=any($1::uuid[])', [ids]);
  }
  await admin.end();
}
