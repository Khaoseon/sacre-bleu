import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import jpeg from 'jpeg-js';
import { chromium } from 'playwright';
const origin = 'http://127.0.0.1:5196';
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5196',
    '--strictPort',
  ],
  { stdio: 'pipe', windowsHide: true },
);
let browser;
const bytes = jpeg.encode(
  { width: 1200, height: 800, data: new Uint8Array(1200 * 800 * 4).fill(200) },
  80,
).data;
try {
  for (let n = 0; ; n++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (n > 70 || server.exitCode !== null) throw Error('Photo fixture server unavailable');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.photoCalls = [];
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      window.photoCalls.push(`create:${url}`);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      window.photoCalls.push(`revoke:${url}`);
      revoke(url);
    };
  });
  let waitForDownload = null;
  const reads = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/photo-fixture') {
      reads.push(route.request().headers()['x-account']);
      if (waitForDownload) await waitForDownload;
      await route.fulfill({ json: { data: bytes.toString('base64') } }).catch(() => {});
    } else if (url.hostname === 'images.openfoodfacts.org')
      await route.fulfill({ contentType: 'image/jpeg', body: bytes });
    else if (url.origin === origin) await route.continue();
    else await route.abort();
  });
  await page.goto(origin + '/scripts/browser/photos-harness.html');
  const media = page.locator('[data-testid=media] img');
  await page.waitForFunction(() =>
    document.querySelector('[data-testid=media] img')?.getAttribute('src')?.startsWith('blob:'),
  );
  const first = await media.getAttribute('src');
  assert.equal(reads[0], 'account-a');
  assert.match(
    await page.locator('.product-attribution').innerText(),
    /Photo OFF/,
    'Personal image is not labelled CC BY-SA',
  );
  await page.getByText('Offline fixture', { exact: true }).click();
  await page.waitForFunction(() => window.photoCalls.some((c) => c.startsWith('revoke:')));
  assert((await media.getAttribute('src')).startsWith('https://images.openfoodfacts.org/'));
  assert(await page.evaluate((url) => window.photoCalls.includes(`revoke:${url}`), first));
  await page.getByText('Online fixture', { exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector('[data-testid=media] img')?.getAttribute('src')?.startsWith('blob:'),
  );
  const second = await media.getAttribute('src');
  await page.getByText('Logout fixture', { exact: true }).click();
  await page.waitForFunction((url) => window.photoCalls.includes(`revoke:${url}`), second);
  let release;
  waitForDownload = new Promise((r) => {
    release = r;
  });
  await page.getByText('Other account fixture', { exact: true }).click();
  for (let n = 0; reads.at(-1) !== 'account-b'; n++) {
    assert(n < 60);
    await new Promise((r) => setTimeout(r, 50));
  }
  await page.getByText('Logout fixture', { exact: true }).click();
  const before = await page.evaluate(
    () => window.photoCalls.filter((c) => c.startsWith('create:')).length,
  );
  release();
  waitForDownload = null;
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(
    await page.evaluate(() => window.photoCalls.filter((c) => c.startsWith('create:')).length),
    before,
    'Late account response cannot create a Blob URL',
  );
  await page.getByText('Other account fixture', { exact: true }).click();
  await page.getByText('Editor fixture', { exact: true }).click();
  const file = page.locator('input[type=file]');
  await file.setInputFiles({
    name: 'phone.heic',
    mimeType: 'image/heic',
    buffer: Buffer.from('invalid heic'),
  });
  await page.getByRole('alert').filter({ hasText: 'Format non pris en charge' }).waitFor();
  await page.getByText('English fixture', { exact: true }).evaluate((e) => e.click());
  await page.getByRole('alert').filter({ hasText: 'Unsupported format' }).waitFor();
  await file.setInputFiles({ name: 'phone.jpg', mimeType: 'image/jpeg', buffer: bytes });
  await page.waitForFunction(() =>
    document
      .querySelector('.photo-preview img')
      ?.getAttribute('src')
      ?.startsWith('data:image/jpeg'),
  );
  assert.equal(
    await page.evaluate(() => window.photoSaved),
    undefined,
    'Preview has no confirmed write',
  );
  await page
    .getByRole('button', { name: 'Enregistrer', exact: true })
    .count()
    .then(async (count) => {
      if (count) throw Error('Language did not update');
    });
  await page.locator('button[type=submit]').click();
  const saved = await page.evaluate(() => window.photoSaved);
  const normalized = jpeg.decode(Buffer.from(saved.photoChange.split(',')[1], 'base64'));
  assert.equal(Math.max(normalized.width, normalized.height), 1024);
  assert.equal(saved.privatePhotoPath, 'r/p/photo.jpg');
  assert(saved.external.imageUrl, 'OFF provenance survives personal override');
  await page.getByText('Editor fixture', { exact: true }).click();
  await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
  assert(
    (await page.locator('.photo-preview img').getAttribute('src')).startsWith(
      'https://images.openfoodfacts.org/',
    ),
  );
  await page.locator('button[type=submit]').click();
  assert.equal((await page.evaluate(() => window.photoSaved)).photoChange, null);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('app-reserve.local.v1')),
    null,
    'No photograph persisted to demo storage',
  );
  assert.deepEqual(errors, []);
  console.log(
    'Photo browser: real resize, HEIC recovery, bilingual editor, OFF retention, offline/logout URL revocation and late-response isolation passed.',
  );
} finally {
  await browser?.close();
  server.kill();
}
