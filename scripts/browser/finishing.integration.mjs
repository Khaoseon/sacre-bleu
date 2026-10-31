import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5195';
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5195',
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
    if (n > 70 || server.exitCode !== null) throw Error('Local finishing server failed');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.setDefaultTimeout(8000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );
  const captures = resolve('docs/design/phase7bc');
  await mkdir(captures, { recursive: true });
  const fits = async () => {
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Page fits',
    );
    const dialog = page.locator('dialog[open]');
    if (await dialog.count())
      assert(await dialog.evaluate((d) => d.scrollWidth <= d.clientWidth + 1), 'Dialog fits');
  };
  await page.goto(origin);
  await page.getByLabel('Email', { exact: true }).fill('exemple@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('DisposableFixture123');
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  const dialog = page.locator('dialog[open]');
  assert(
    await dialog.locator('h2').evaluate((e) => e === document.activeElement),
    'Settings starts on visible title',
  );
  await page.keyboard.press('Tab');
  assert(
    await page
      .getByRole('button', { name: 'Fermer', exact: true })
      .evaluate((e) => e === document.activeElement),
  );
  await page.getByRole('combobox', { name: 'Langue', exact: true }).selectOption('en');
  assert.equal(
    await dialog.evaluate((d) => getComputedStyle(d).animationName),
    'none',
    'Reduced motion disables sheet entrance',
  );
  await fits();
  await page.screenshot({ path: resolve(captures, 'preferences-en-375.png') });
  await page.keyboard.press('Escape');
  assert.equal(
    await page.getByLabel('Email', { exact: true }).inputValue(),
    'exemple@example.test',
  );
  assert.equal(
    await page.getByLabel('Password', { exact: true }).inputValue(),
    'DisposableFixture123',
  );
  await page.getByLabel('Email', { exact: true }).fill('');
  await page.getByLabel('Password', { exact: true }).fill('');
  await page.screenshot({ path: resolve(captures, 'authentication-en-375.png') });
  await page.goto(origin + '/scripts/browser/finishing-harness.html');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await dialog.locator('.settings-more > summary').click();
  await page.setViewportSize({ width: 320, height: 568 });
  const backup = { version: 1, exportedAt: '2026-10-31T10:00:00Z', products: [], shopping: [] };
  // Use the exact export schema from the production exporter, with empty synthetic data.
  const exported = await page.evaluate(async () => {
    const { backupSnapshot } = await import('/src/storage.ts');
    return backupSnapshot({
      reserve: { id: 'r', name: 'Fixture', revision: 1 },
      products: [],
      shopping: [],
    });
  });
  Object.assign(backup, exported);
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const restore = dialog.getByRole('button', {
    name: 'Replace and restore pantry',
    exact: true,
  });
  await restore.waitFor();
  assert(await restore.isDisabled(), 'Restore requires backup and explicit confirmation');
  await fits();
  for (const theme of ['light', 'dark', 'slate', 'retro-cream', 'retro-petrol']) {
    await dialog.locator(`input[name=theme][value="${theme}"]`).check();
    await fits();
  }
  await dialog.locator('input[name=theme][value=light]').check();
  await page.setViewportSize({ width: 320, height: 812 });
  await dialog.evaluate((d) => {
    d.scrollTop = d.querySelector('.restore-preview').offsetTop - 20;
  });
  await page.screenshot({ path: resolve(captures, 'restore-en-320.png') });
  await page.setViewportSize({ width: 320, height: 568 });
  await dialog
    .getByRole('button', { name: 'Download backup before replacement', exact: true })
    .click();
  assert(await restore.isDisabled(), 'Download alone cannot authorize restoration');
  await dialog.locator('.restore-preview input[type=checkbox]').check();
  assert(await restore.isEnabled());
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.finishingFixture.offline());
  await page.locator('.local-button[data-state=offline]').waitFor();
  assert(await page.getByText('Offline · read only', { exact: true }).isVisible());
  await fits();
  await page.evaluate(() => window.finishingFixture.uncertain());
  await page.locator('.local-button[data-state=pending]').waitFor();
  await page.getByRole('button', { name: 'Resume request', exact: true }).waitFor();
  await fits();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: resolve(captures, 'uncertain-en-375.png') });
  // Exercise the update host's presentation without building another worker pair.
  // This fixture does not activate a worker or bypass production update guards.
  await page.evaluate(async () => {
    const { appUpdates } = await import('/src/pwaUpdateController.ts');
    appUpdates.publish({ available: true, message: 'Nouvelle version disponible.' });
  });
  const update = page.getByRole('complementary', { name: 'App update', exact: true });
  await update.waitFor();
  await fits();
  await update.getByRole('button', { name: 'Later', exact: true }).click();
  await update.waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log(
    'Finishing: Auth drafts, keyboard/focus, EN settings, 320px restore guards, five palettes, offline and uncertain recovery passed. Four representative captures; no remote requests.',
  );
} finally {
  await browser?.close();
  server.kill();
}
