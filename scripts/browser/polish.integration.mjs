import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5198';
const output = 'docs/design/polish/screenshots';
const before = process.argv.includes('--before');
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5198', '--strictPort'],
  { stdio: 'pipe', windowsHide: true },
);
let browser;
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    assert(i < 80 && server.exitCode === null, 'Local Vite starts');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await mkdir(output, { recursive: true });
  await page.goto(`${origin}/scripts/browser/off-harness.html`);
  await page.evaluate(() => document.fonts.ready);
  const capture = (name) =>
    page.screenshot({ path: `${output}/${before ? 'before' : 'after'}-${name}.png` });
  await capture('stock');
  await page.locator('.mobile-nav button').nth(2).click();
  await page.locator('.shopping-check').click();
  await capture('shopping');
  await page.locator('.mobile-nav button').nth(1).click();
  await capture('scanner');
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  await capture('dark');
  if (!before) {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const nav = page.locator('.mobile-nav');
    const shopping = page.locator('.page-pane').nth(2);
    const dialog = page.locator('dialog[open]');
    const row = (name) =>
      shopping.locator('.shopping-row').filter({ has: page.getByText(name, { exact: true }) });
    const data = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('app-reserve.local.v1')));
    const selected = () => nav.locator('[aria-current=page] > span').innerText();
    const shot = (name) => page.screenshot({ path: `${output}/${name}.png` });
    const cdp = await context.newCDPSession(page);
    async function swipe(x, endX, y, endY = y, cancel = false, multiple = false) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let i = 1; i <= 8; i++) {
        const points = [{ x: x + ((endX - x) * i) / 8, y: y + ((endY - y) * i) / 8, id: 1 }];
        if (multiple) points.push({ x: points[0].x + 10, y: points[0].y + 10, id: 2 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points });
      }
      await cdp.send('Input.dispatchTouchEvent', {
        type: cancel ? 'touchCancel' : 'touchEnd',
        touchPoints: [],
      });
    }
    await page.goto(`${origin}/scripts/browser/polish-harness.html`);
    await nav.locator('button').nth(2).click();
    const tuna = row('Thon au naturel');
    await tuna.getByRole('checkbox').click();
    assert.equal((await data()).shopping.find((i) => i.id === 's-thon').checked, true);
    assert.equal(await tuna.getByRole('checkbox').getAttribute('aria-checked'), 'true');
    assert.equal(
      await tuna.locator('.check-item').evaluate((el) => getComputedStyle(el, '::before').content),
      'none',
    );
    const box = await tuna.boundingBox();
    const y = box.y + 35;
    await swipe(250, 234, y); // Short gesture cannot reveal or mutate.
    assert.equal(await shopping.locator('.revealed').count(), 0);
    await swipe(250, 170, y, y + 100); // Vertical scroll remains native.
    assert.equal(await shopping.locator('.revealed').count(), 0);
    await swipe(250, 130, y, y, true); // Cancellation restores the closed row.
    assert.equal(await shopping.locator('.revealed').count(), 0);
    await swipe(250, 130, y, y, false, true);
    assert.equal(await shopping.locator('.revealed').count(), 0);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await shopping.evaluate((el) => {
      el.scrollTop = 0;
    });
    const currentBox = await tuna.boundingBox();
    await swipe(250, 130, currentBox.y + 35);
    assert.equal(await selected(), 'À acheter');
    assert.equal(await shopping.locator('.revealed').count(), 1);
    assert.equal((await data()).shopping.length, 2, 'Swipe alone never deletes');
    await shot('shopping-revealed-375');
    await shopping.locator('.revealed .swipe-delete').click();
    await page.locator('.shopping-undo').waitFor();
    assert.equal((await data()).shopping.length, 1);
    await shot('shopping-undo-375');
    await page
      .locator('.shopping-undo')
      .getByRole('button', { name: 'Annuler', exact: true })
      .click();
    assert.equal((await data()).shopping.find((i) => i.productId === 'thon').checked, false);
    assert.equal((await data()).shopping.find((i) => i.productId === 'thon').quantity, 2);
    // Keyboard-only alternative: options, delete, focus moves to Undo, then restores.
    await tuna.locator('summary').focus();
    await page.keyboard.press('Enter');
    const deleteButton = tuna.getByRole('button', {
      name: 'Supprimer Thon au naturel des courses',
    });
    await deleteButton.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Annuler', exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole('button', { name: 'Annuler', exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press('Enter');
    await tuna.getByRole('checkbox').click();
    assert.equal((await data()).shopping.find((i) => i.productId === 'thon').checked, true);
    await tuna.getByRole('checkbox').click();
    assert.equal((await data()).shopping.find((i) => i.productId === 'thon').checked, false);
    // Re-added linked shopping still participates in a subsequent positive scan.
    await nav.locator('button').nth(1).click();
    await page.locator('.manual-code summary').click();
    await page.locator('#barcode').fill('3019081234567');
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    assert.equal((await data()).shopping.find((i) => i.productId === 'thon').quantity, 1);
    assert.equal((await data()).products.find((p) => p.id === 'thon').quantity, 1);
    await nav.locator('button').nth(2).click();
    await page.clock.install();
    await row('Éponges').locator('summary').click();
    await row('Éponges').getByRole('button', { name: 'Supprimer Éponges des courses' }).click();
    await page.locator('.shopping-undo').waitFor();
    await page.clock.fastForward(9000);
    assert.equal(await page.locator('.shopping-undo').count(), 1, 'Keyboard focus pauses expiry');
    await page.locator('.shopping-entry input').focus();
    await page.mouse.move(0, 0);
    await page.clock.fastForward(9000);
    assert.equal(await page.locator('.shopping-undo').count(), 0, 'Unfocused Undo expires');
    await page.reload();
    // All palettes use resolved, non-cyclic tokens; screenshots are actual app views.
    for (const theme of ['light', 'dark', 'slate', 'retro-cream', 'retro-petrol']) {
      await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
      for (const index of [0, 2, 1]) {
        await nav.locator('button').nth(index).click();
        await page.evaluate(() => document.fonts.ready);
        const colors = await page.locator('.app-shell').evaluate((el) => {
          const style = getComputedStyle(el);
          return [
            style.backgroundColor,
            style.color,
            style.getPropertyValue('--sb-color-canvas').trim(),
          ];
        });
        assert(
          colors.every((color) => color && color !== 'rgba(0, 0, 0, 0)'),
          `Resolved ${theme} tokens`,
        );
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await shot(`${theme}-${['stock', 'scanner', 'shopping'][index]}-375`);
        if (index === 2) {
          await tuna.getByRole('checkbox').click();
          await shot(`${theme}-completed-375`);
          await tuna.getByRole('checkbox').click();
        }
      }
    }
    await nav.locator('button').nth(0).click();
    // A keyboard focus belongs solely to the actual input/select.
    for (const control of ['.search-input input', '.sort-control select']) {
      await page.keyboard.press('Tab');
      await page.locator(control).focus();
      const focus = await page.locator(control).evaluate((el) => ({
        self: getComputedStyle(el).outlineStyle,
        parent: getComputedStyle(el.parentElement).outlineStyle,
        shadow: getComputedStyle(el).boxShadow,
      }));
      assert.equal(focus.self, 'solid');
      assert.equal(focus.parent, 'none');
      assert.equal(focus.shadow, 'none');
    }
    // Automatic follows the OS, manual preference survives an OS change and reload.
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    await dialog.locator('input[value=auto]').check();
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await dialog.locator('input[value=slate]').check();
    await page.emulateMedia({ colorScheme: 'light' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'slate');
    await dialog.getByRole('combobox', { name: 'Langue' }).selectOption('en');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'slate');
    await nav.locator('button').nth(2).click();
    await row('Thon au naturel').getByRole('checkbox').click();
    const enBox = await row('Thon au naturel').boundingBox();
    await swipe(250, 130, enBox.y + 35);
    assert.equal(await shopping.locator('.revealed .swipe-delete').innerText(), 'Delete');
    await shopping.locator('.revealed .swipe-delete').click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal((await data()).shopping.find((i) => i.productId === 'thon').checked, false);
    // Real store with isolated synthetic transport: no successful UI before writes.
    await page.evaluate(() => localStorage.removeItem('app-reserve.language.v1'));
    await page.goto(`${origin}/scripts/browser/polish-harness.html?shared`);
    assert.equal(
      await page
        .locator('#main-content')
        .getByText('Dernière synchronisation :', { exact: false })
        .count(),
      0,
    );
    await page.getByRole('button', { name: 'Détails de Penne rigate' }).click();
    assert.equal(
      await dialog.locator('.sync-message').count(),
      0,
      'No success recovery banner in details',
    );
    await shot('shared-detail-375');
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    assert.equal(await dialog.locator('.sync-details time').count(), 1);
    await shot('shared-settings-375');
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.evaluate(() => window.polish.online(false));
    assert(await page.getByText('Hors ligne · lecture seule', { exact: true }).isVisible());
    assert(await page.locator('.sync-message').isVisible());
    await shot('shared-offline-375');
    await page.evaluate(() => window.polish.online(true));
    await nav.locator('button').nth(2).click();
    await page.evaluate(() => window.polish.hold());
    await tuna.getByRole('checkbox').click();
    assert.equal(await tuna.getByRole('checkbox').getAttribute('aria-checked'), 'false');
    await page.evaluate(() => window.polish.finish());
    await page.waitForFunction(() => document.querySelector('.shopping-row.checked'));
    await tuna.locator('summary').click();
    await page.evaluate(() => window.polish.hold());
    await tuna.getByRole('button', { name: 'Supprimer Thon au naturel des courses' }).click();
    assert.equal(await tuna.count(), 1);
    assert.equal(await page.locator('.shopping-undo').count(), 0);
    await page.evaluate(() => window.polish.finish());
    await page.locator('.shopping-undo').waitFor();
    assert(
      await page
        .getByText('Annuler remet l’article dans la liste à acheter.', { exact: true })
        .isVisible(),
    );
    assert.equal(await tuna.count(), 0);
    // An addition after deletion must accumulate, never be overwritten by Undo.
    await page.evaluate(() => window.polish.store.addShopping('Thon au naturel', 3, 'thon'));
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await page.waitForFunction(() =>
      window.polish.snapshot().shopping.some((i) => i.name === 'Thon au naturel' && !i.checked),
    );
    const restored = await page.evaluate(() =>
      window.polish.snapshot().shopping.find((i) => i.name === 'Thon au naturel'),
    );
    assert.equal(restored.quantity, 5);
    assert.equal(restored.product_id, 'thon');
    // Definite rejection retains the row; uncertain deletion exposes the exact retry.
    await page.evaluate(() => window.polish.fail('rejected'));
    await tuna.locator('summary').click();
    await tuna.getByRole('button', { name: 'Supprimer Thon au naturel des courses' }).click();
    await page.locator('.sync-message.sync-error').waitFor();
    assert.equal(await tuna.count(), 1);
    await page.evaluate(() => window.polish.fail('uncertain'));
    await tuna.getByRole('button', { name: 'Supprimer Thon au naturel des courses' }).click();
    await page
      .getByRole('button', { name: 'Reprendre la demande', exact: true })
      .click({ trial: true });
    assert.equal(await tuna.count(), 1);
    await shot('shared-recovery-375');
    await page.evaluate(() => window.polish.fail('none'));
    await page.getByRole('button', { name: 'Reprendre la demande', exact: true }).click();
    await tuna.waitFor({ state: 'detached' });
    for (const [width, height] of [
      [320, 568],
      [430, 932],
      [812, 375],
      [900, 932],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(`${origin}/scripts/browser/polish-harness.html`);
      const navigation = width <= 760 ? nav : page.locator('.sidebar nav');
      for (const index of [0, 2, 1]) {
        await navigation.locator('button').nth(index).click();
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${width} no horizontal overflow`,
        );
      }
      await page.getByRole('button', { name: 'Activer la caméra', exact: true }).click();
      await page.locator('.camera-target').waitFor();
      const camera = await page.locator('.camera-preview').boundingBox();
      assert(camera.height >= (height < 650 ? 150 : 200));
      await shot(`camera-active-${width}`);
    }
    assert.deepEqual(errors, []);
    console.log(
      'PASS polish: touch arbitration/cancel/multitouch/scroll, confirmed delete and linked unchecked re-add, concurrent accumulation, subsequent scan consumption, Undo expiry/focus, FR/EN, five themes/Automatic/reload, confirmed writes/recovery/offline, sync preferences, synthetic camera and 320/375/430/landscape/desktop captures.',
    );
  } else console.log('Local before screenshots captured.');
} finally {
  await browser?.close();
  server.kill();
}
