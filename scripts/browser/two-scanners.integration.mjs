import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const require = createRequire(
  process.env.PLAYWRIGHT_PACKAGE ? resolve(process.env.PLAYWRIGHT_PACKAGE) : import.meta.url,
);
const { chromium } = require('playwright');
const statusRun = spawnSync(
  process.execPath,
  ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'],
  { encoding: 'utf8' },
);
if (statusRun.status !== 0) throw new Error('Local Supabase unavailable; raw output suppressed');
const status = JSON.parse(statusRun.stdout);
const api = new URL(status.API_URL);
if (!['127.0.0.1', 'localhost'].includes(api.hostname)) throw new Error('Local-only fixtures');
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const authAdmin = createClient(api.href, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const config = readFileSync('supabase/config.toml', 'utf8');
const port = Number(config.match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1]);
if (!port) throw new Error('Local DB port unavailable');
const admin = new pg.Client({
  host: '127.0.0.1',
  port,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});
await admin.connect();
const users = [],
  clients = [];
let reserve, server, browser;
const origin = 'http://127.0.0.1:5190';
const codes = ['3017620422003', '3274080005003'];
const names = ['Produit A local', 'Produit B local'];
async function rpc(client, name, args) {
  const result = await client.rpc(name, args);
  if (result.error) throw new Error(`Local RPC failed: ${name}`);
  return result.data;
}
try {
  for (let index = 0; index < 2; index++) {
    const email = `${randomUUID()}@example.test`,
      password = `FixtureAa1!${randomUUID()}`;
    const created = await authAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Local fixture account failed');
    users.push({ id: created.data.user.id, email, password });
    const client = createClient(api.href, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clients.push(client);
    if ((await client.auth.signInWithPassword({ email, password })).error)
      throw new Error('Local sign-in failed');
  }
  reserve = (
    await rpc(clients[0], 'create_reserve', {
      p_request_id: randomUUID(),
      p_name: 'Deux scanners isolés',
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
  const ids = [randomUUID(), randomUUID()];
  for (let index = 0; index < 2; index++) {
    await rpc(clients[0], 'mutate_reserve', {
      p_request_id: randomUUID(),
      p_reserve_id: reserve,
      p_action: 'create_product',
      p_payload: { id: ids[index], name: names[index], barcode: codes[index], initial_quantity: 0 },
    });
    await rpc(clients[0], 'mutate_reserve', {
      p_request_id: randomUUID(),
      p_reserve_id: reserve,
      p_action: 'add_shopping',
      p_payload: { product_id: ids[index], quantity: 5 },
    });
  }
  server = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5190', '--strictPort'],
    {
      env: { ...process.env, VITE_SUPABASE_URL: api.origin, VITE_SUPABASE_PUBLISHABLE_KEY: key },
      stdio: 'pipe',
      windowsHide: true,
    },
  );
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (attempt > 50 || server.exitCode !== null) throw new Error('Local Vite did not start');
    await new Promise((done) => setTimeout(done, 100));
  }
  browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });
  const pages = [],
    contexts = [],
    errors = [],
    external = [];
  let offRequests = 0,
    slowRead = false,
    dropMutation = false;
  for (let index = 0; index < 2; index++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['camera'],
    });
    contexts.push(context);
    await context.addInitScript(() => {
      window.fixtureBarcode = null;
      window.fixtureReads = 0;
    });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin && url.pathname === '/src/scanner/decoder.ts') {
        await route.fulfill({
          contentType: 'application/javascript',
          body: 'export function createDecoder(){return {read(){window.fixtureReads++;return window.fixtureBarcode},dispose(){}}}',
        });
        return;
      }
      if (url.origin === api.origin && url.pathname === '/functions/v1/product-lookup') {
        offRequests++;
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
            'Retry-After': '6',
          },
          body: JSON.stringify({
            status: 'unavailable',
            reason: 'cooldown',
            budget: { allowed: false, reason: 'cooldown', retryAfterSeconds: 6 },
          }),
        });
        return;
      }
      if (![origin, api.origin].includes(url.origin)) {
        external.push(url.origin);
        await route.abort();
        return;
      }
      if (dropMutation && index === 0 && url.pathname === '/rest/v1/rpc/mutate_reserve') {
        dropMutation = false;
        await route.fetch(); // Commit really happens locally; only the reply is lost.
        await route.abort('failed');
        return;
      }
      if (slowRead && index === 0 && url.pathname === '/rest/v1/rpc/get_reserve_snapshot') {
        slowRead = false;
        const response = await route.fetch();
        await new Promise((done) => setTimeout(done, 500));
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    pages.push(page);
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin);
    await page.locator('input[type=email]').fill(users[index].email);
    await page.locator('input[type=password]').fill(users[index].password);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Navigation mobile' })
      .getByRole('button', { name: 'Scanner', exact: true })
      .click();
    await page.getByRole('button', { name: 'Activer la caméra', exact: true }).click();
    await page.waitForFunction(() => window.fixtureReads > 0);
  }
  await Promise.all(
    pages.map((page, index) =>
      page.evaluate((code) => {
        window.fixtureBarcode = code;
      }, codes[index]),
    ),
  );
  await Promise.all(
    pages.map((page, index) =>
      page.locator('.last-product h2').filter({ hasText: names[index] }).waitFor(),
    ),
  );
  for (let index = 0; index < 2; index++)
    assert.equal(await pages[index].locator('.last-product h2').innerText(), names[index]);
  assert.equal(offRequests, 0);
  // Force polling and delayed snapshots while the camera presentation stays held.
  slowRead = true;
  await Promise.all(
    pages.map((page) => page.evaluate(() => window.dispatchEvent(new Event('focus')))),
  );
  await new Promise((done) => setTimeout(done, 6000));
  for (let index = 0; index < 2; index++) {
    assert.equal(await pages[index].locator('.last-product h2').innerText(), names[index]);
    assert.ok(
      await pages[index].evaluate(
        () =>
          !!document
            .querySelector('video')
            .srcObject?.getVideoTracks()
            .some((t) => t.readyState === 'live'),
      ),
    );
  }
  let snapshot = await rpc(clients[0], 'get_reserve_snapshot', { p_reserve_id: reserve });
  for (const product of snapshot.products) assert.equal(product.quantity, 1);
  for (const item of snapshot.shopping) assert.equal(item.quantity, 4);
  // A distinct new presentation on each camera works after the remote revision.
  await Promise.all(
    pages.map((page, index) =>
      page.evaluate(
        (code) => {
          window.fixtureBarcode = code;
        },
        codes[1 - index],
      ),
    ),
  );
  await Promise.all(
    pages.map((page, index) =>
      page
        .locator('.last-product h2')
        .filter({ hasText: names[1 - index] })
        .waitFor(),
    ),
  );
  assert.equal(offRequests, 0);
  snapshot = await rpc(clients[0], 'get_reserve_snapshot', { p_reserve_id: reserve });
  for (const product of snapshot.products) assert.equal(product.quantity, 2);
  for (const item of snapshot.shopping) assert.equal(item.quantity, 3);
  // Unknown: internal wait opens a manual form, preserving the live camera.
  await pages[0].evaluate(() => {
    window.fixtureBarcode = '7613034626844';
  });
  const form = pages[0].getByRole('dialog', { name: 'Nouveau code-barres' });
  await form.getByText(/Le créneau partagé OFF est occupé/).waitFor();
  await form.getByRole('button', { name: 'Fermer', exact: true }).click();
  await pages[0].evaluate(() => {
    window.fixtureBarcode = '3017620422003';
  });
  await pages[0].locator('.last-product h2').filter({ hasText: names[0] }).waitFor();
  assert.equal(offRequests, 1);
  await pages[0]
    .locator('.lookup-indicator')
    .getByText('Recherche OFF dans', { exact: true })
    .waitFor();
  mkdirSync('.tmp', { recursive: true });
  await pages[0].screenshot({ path: '.tmp/scanner-off-cooldown.png' });
  await pages[0].evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await pages[0].setViewportSize({ width: 320, height: 844 });
  assert.ok(await pages[0].evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await pages[0].screenshot({ path: '.tmp/scanner-off-cooldown-dark.png' });
  await pages[0].setViewportSize({ width: 390, height: 844 });
  dropMutation = true;
  await pages[0].evaluate(() => {
    window.fixtureBarcode = '3274080005003';
  });
  await pages[0].getByRole('button', { name: 'Reprendre la demande', exact: true }).waitFor();
  const committed = await rpc(clients[0], 'get_reserve_snapshot', { p_reserve_id: reserve });
  const committedQuantity = committed.products.find((p) => p.id === ids[1]).quantity;
  await pages[0].getByRole('button', { name: 'Reprendre la demande', exact: true }).click();
  await pages[0].locator('.last-product h2').filter({ hasText: names[1] }).waitFor();
  assert.equal(
    (await rpc(clients[0], 'get_reserve_snapshot', { p_reserve_id: reserve })).products.find(
      (p) => p.id === ids[1],
    ).quantity,
    committedQuantity,
  );
  await pages[0].evaluate(() => {
    window.fixtureBarcode = '3017620422003';
  });
  await pages[0].locator('.last-product h2').filter({ hasText: names[0] }).waitFor();
  assert.equal(offRequests, 1);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        twoRealAccounts: true,
        independentBrowserContexts: true,
        simulatedCameraDecoder: true,
        localProductIdentityCorrect: true,
        heldBarcodeNoDoubleMovement: true,
        nextLocalScanWorks: true,
        manualFallbackAndCameraLive: true,
        lostReceiptThenSameKeyResumeWithoutDoubleMovement: true,
        offKnownRequests: 0,
        unknownMockRequests: offRequests,
        errors,
        externalRequests: external.length,
      },
      null,
      2,
    ),
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
