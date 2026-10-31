import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5197';
const evidence = resolve('docs/design/phase7a/screenshots');
let server, browser;
try {
  let ready = false;
  try {
    ready = (await fetch(origin)).ok;
  } catch {}
  if (!ready)
    server = spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', '--config', 'explorations/7a/vite.config.ts'],
      { stdio: 'pipe', windowsHide: true },
    );
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (i > 60 || server?.exitCode != null) throw new Error('7A loopback server unavailable');
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
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(e.message));
  const nav = page.getByRole('navigation');
  const dialog = page.getByRole('dialog');
  const active = page.locator('.page-content[aria-hidden="false"]');
  const selected = () => nav.locator('[aria-current]').getAttribute('aria-label');
  async function settle() {
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().iterations))
          .map((a) => a.finished.catch(() => {})),
      ),
    );
  }
  async function go(name) {
    await nav.getByRole('button', { name, exact: true }).click();
    await settle();
  }
  async function reset() {
    await page.goto(origin);
    await page.locator('[data-product="oil"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await settle();
  }
  async function settings(value) {
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await dialog.getByLabel('Simuler un état').selectOption(value);
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await settle();
  }
  async function images() {
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await dialog.getByLabel('Exemples d’images', { exact: true }).selectOption('mixed');
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await settle();
  }
  async function shot(name) {
    await settle();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter((i) => {
            const r = i.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.bottom > 0 &&
              r.top < innerHeight &&
              r.right > 0 &&
              r.left < innerWidth
            );
          })
          .map((i) => i.decode().catch(() => {})),
      );
    });
    await page.screenshot({ path: resolve(evidence, name), animations: 'disabled' });
  }
  async function confirmed() {
    await page
      .locator('.feedback')
      .getByText('Enregistré dans la simulation.', { exact: true })
      .waitFor();
  }
  const cdp = await context.newCDPSession(page);
  async function swipe(x, endX, y, endY, cancel = false) {
    y ??= await active.locator('h1').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.y + r.height / 2;
    });
    endY ??= y;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + ((endX - x) * i) / 8, y: y + ((endY - y) * i) / 8, id: 1 }],
      });
      await new Promise((r) => setTimeout(r, 18));
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
    await settle();
  }
  const measurements = [];
  for (const [width, height] of [
    [320, 568],
    [375, 812],
    [430, 932],
    [900, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await reset();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `No overflow ${width}`,
    );
    assert.equal(
      await page.evaluate(
        () => document.fonts.check('400 30px Fraunces') && document.fonts.check('600 14px Manrope'),
      ),
      true,
    );
    measurements.push({
      width,
      height,
      firstProductTop: Math.round((await page.locator('.product-card').first().boundingBox()).y),
    });
    await shot(`inventory-${width}.png`);
    await active.getByRole('button', { name: 'Conserves', exact: true }).click();
    const warning = page.locator('[data-product="tomato"] .stock-badge');
    assert.equal(await warning.isVisible(), true, `Warning visible ${width}`);
    assert.ok(
      Number.parseFloat(await warning.evaluate((el) => getComputedStyle(el).fontSize)) >= 12,
    );
    await shot(`inventory-warning-${width}.png`);
    await active.getByRole('button', { name: /^Tout/ }).click();
    if (width < 900) {
      await swipe(width * 0.7, width * 0.2);
      assert.equal(await selected(), 'Scanner');
      await swipe(width * 0.2, width * 0.7);
      assert.equal(await selected(), 'Stock');
    }
    await go('Scanner');
    await shot(`scanner-${width}.png`);
    await active.getByRole('button', { name: 'Démarrer la simulation', exact: true }).click();
    await active.getByRole('button', { name: 'Simuler une lecture', exact: true }).click();
    await active.getByText('Lecture confirmée', { exact: true }).waitFor();
    await settle();
    const result = await active.locator('.scan-result').boundingBox(),
      bar = await nav.boundingBox();
    assert.ok(
      result.y >= 0 && result.y + result.height <= bar.y,
      `Confirmed result fully visible without scrolling ${width}`,
    );
    assert.equal(await active.evaluate((el) => el.scrollTop), 0);
    for (const name of ['Scanner à nouveau', 'Saisir un code-barres']) {
      const box = await active.getByRole('button', { name, exact: true }).boundingBox();
      assert.ok(box.y + box.height <= bar.y, `${name} reachable immediately ${width}`);
    }
    await shot(`scan-result-${width}.png`);
    await active.getByRole('button', { name: 'Annuler le dernier scan', exact: true }).click();
    await active.locator('.scan-result').waitFor({ state: 'hidden' });
    await go('À acheter');
    await shot(`shopping-${width}.png`);
    await active
      .getByRole('button', { name: 'Dans le panier · Pain au levain', exact: true })
      .click();
    await confirmed();
    await page
      .getByText('Enregistré dans la simulation.', { exact: true })
      .waitFor({ state: 'hidden' });
    await shot(`shopping-completed-${width}.png`);
    await active.getByRole('button', { name: 'À prendre · Pain au levain', exact: true }).click();
    await confirmed();
    await go('Stock');
    await active.getByRole('button', { name: 'Détails Rigatoni', exact: true }).click();
    await shot(`detail-${width}.png`);
    await dialog.getByRole('button', { name: 'Modifier le produit', exact: true }).click();
    await shot(`editor-${width}.png`);
    // Reduced visible height models keyboard geometry, without claiming physical keyboard acceptance.
    await page.setViewportSize({ width, height: 460 });
    await dialog.getByLabel('Code-barres', { exact: true }).focus();
    await settle();
    const save = dialog.getByRole('button', { name: 'Enregistrer', exact: true });
    const button = await save.boundingBox();
    assert.ok(button.y >= 0 && button.y + button.height <= 460, `Sticky save ${width}`);
    const focused = await dialog.getByLabel('Code-barres', { exact: true }).boundingBox();
    assert.ok(
      focused.y + focused.height <= button.y - 4,
      `Focused field remains above sticky save ${width}`,
    );
    await shot(`editor-keyboard-${width}.png`);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width, height });
    await reset();
    await settings('offline');
    await shot(`offline-${width}.png`);
    assert.equal(
      await active.getByRole('button', { name: 'Ajouter Huile d’olive', exact: true }).isDisabled(),
      true,
    );
    const offlinePlus = await active
      .getByRole('button', { name: 'Ajouter Huile d’olive', exact: true })
      .boundingBox();
    assert.ok(
      offlinePlus.y + offlinePlus.height <= (await nav.boundingBox()).y,
      `First offline stock control visible ${width}`,
    );
    await reset();
    await settings('empty');
    assert.equal(await page.locator('.product-card').count(), 0);
    assert.equal(await active.locator('.restock-note').count(), 0);
    assert.equal(await page.locator('.nav-badge').count(), 0);
    const emptyAction = await active
      .getByRole('button', { name: 'Ajouter un produit', exact: true })
      .last()
      .boundingBox();
    assert.ok(
      emptyAction.y + emptyAction.height <= (await nav.boundingBox()).y,
      `Empty primary action visible ${width}`,
    );
    await shot(`empty-${width}.png`);
    await reset();
    await images();
    await shot(`images-mixed-${width}.png`);
    const personal = page.locator('[data-product="personal"]');
    await personal.scrollIntoViewIfNeeded();
    await shot(`images-personal-${width}.png`);
    await active.getByRole('button', { name: 'Détails Nutella', exact: true }).click();
    assert.equal(await dialog.getByRole('link', { name: 'CC BY-SA 3.0', exact: true }).count(), 1);
    assert.equal(
      await dialog.locator('.image-area img').evaluate((el) => getComputedStyle(el).mixBlendMode),
      'normal',
    );
    await shot(`images-off-detail-${width}.png`);
    await page.keyboard.press('Escape');
    await reset();
    await go('À acheter');
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await dialog.getByLabel('Langue', { exact: true }).selectOption('en');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `English layout ${width}`,
    );
    await shot(`shopping-en-${width}.png`);
    console.log(`Reviewed capture matrix ${width} px`);
  }
  await writeFile(
    resolve(evidence, 'measurements.json'),
    JSON.stringify(measurements, null, 2) + '\n',
  );
  // Interactions run separately, after clean-fixture visual evidence.
  await page.setViewportSize({ width: 375, height: 812 });
  await reset();
  await swipe(260, 235);
  assert.equal(await selected(), 'Stock', 'Short drag');
  await swipe(260, 90, 120, 310);
  assert.equal(await selected(), 'Stock', 'Vertical intent');
  await swipe(260, 90, undefined, undefined, true);
  assert.equal(await selected(), 'Stock', 'Cancelled touch');
  await swipe(10, 180);
  assert.equal(await selected(), 'Stock', 'System edge');
  const oil = page.locator('[data-product="oil"]');
  const picture = await oil.locator('.image-hit').boundingBox();
  const touchY = picture.y + picture.height * 0.8;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 150, y: touchY, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 90, y: touchY, id: 1 }],
  });
  await page.evaluate(() => new Promise(requestAnimationFrame));
  assert.ok(
    Math.abs(
      (await page
        .locator('.page-track')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)) + 60,
    ) < 3,
    'Finger tracks 1:1',
  );
  await shot('swipe-continuity-375.png');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 40, y: touchY, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle();
  assert.equal(await selected(), 'Scanner', 'Photo swipe navigates');
  assert.equal(await dialog.count(), 0, 'No accidental photo tap');
  await swipe(80, 260);
  assert.equal(await selected(), 'Stock');
  await oil.getByRole('button', { name: 'Détails Huile d’olive', exact: true }).click();
  await dialog.waitFor();
  await swipe(260, 80, 100);
  assert.equal(await selected(), 'Stock', 'Sheet blocks swipe');
  await page.keyboard.press('Escape');
  const plus = oil.getByRole('button', { name: 'Ajouter Huile d’olive', exact: true });
  const before = await oil.locator('output').innerText();
  await plus.click();
  assert.equal(await oil.locator('output').innerText(), before, 'No optimistic count');
  await confirmed();
  assert.equal(await oil.locator('output').innerText(), String(Number(before) + 1));
  await settings('failure');
  await plus.click();
  await page.getByText('Échec simulé. Aucun changement appliqué.', { exact: true }).waitFor();
  assert.equal(await oil.locator('output').innerText(), String(Number(before) + 1));
  await settings('uncertain');
  assert.equal(await plus.isDisabled(), true);
  await active.getByRole('button', { name: 'Reprendre la demande', exact: true }).click();
  await settings('failure');
  await active
    .getByRole('button', { name: 'Modifier directement Huile d’olive', exact: true })
    .click();
  await dialog.getByLabel('Nom du produit', { exact: true }).fill('Nom provisoire');
  await dialog
    .getByLabel('Choisir une photo', { exact: true })
    .setInputFiles(resolve('public/favicon.png'));
  await dialog.getByRole('button', { name: 'Revenir au visuel proposé', exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Revenir au visuel proposé', exact: true }).click();
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(
    await dialog.getByLabel('Nom du produit', { exact: true }).inputValue(),
    'Nom provisoire',
    'Failed edit retains the draft',
  );
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(
    await active.getByRole('button', { name: 'Nom provisoire', exact: true }).count(),
    1,
  );
  await reset();
  await go('À acheter');
  const tomatoes = active.locator('.shopping-row').filter({ hasText: 'Tomates en purée' });
  await tomatoes.getByRole('button', { name: 'Ajouter Tomates en purée', exact: true }).click();
  await confirmed();
  assert.equal(await tomatoes.locator('output').innerText(), '3');
  await tomatoes.getByRole('button', { name: 'Retirer Tomates en purée', exact: true }).click();
  await confirmed();
  assert.equal(await tomatoes.locator('output').innerText(), '2');
  const check = tomatoes.getByRole('button', {
    name: 'Dans le panier · Tomates en purée',
    exact: true,
  });
  await check.click();
  await confirmed();
  assert.equal(await tomatoes.locator('output').innerText(), '2', 'Checking retains quantity');
  await tomatoes.getByRole('button', { name: 'Ajouter Tomates en purée', exact: true }).click();
  await confirmed();
  assert.equal(
    await tomatoes.locator('.check-item').getAttribute('aria-pressed'),
    'false',
    'Quantity unchecks',
  );
  await active.getByRole('button', { name: 'Depuis la réserve', exact: true }).click();
  await dialog.getByRole('button', { name: /^Tomates en purée/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await tomatoes.locator('output').innerText(), '4', 'Linked additions accumulate');
  await active
    .getByRole('textbox', { name: 'Ajouter à la liste', exact: true })
    .fill('Article temporaire');
  await active.getByRole('button', { name: 'Ajouter à la liste', exact: true }).click();
  await confirmed();
  await active.getByRole('button', { name: 'Supprimer Article temporaire', exact: true }).click();
  await confirmed();
  assert.equal(await active.getByText('Article temporaire', { exact: true }).count(), 0);
  await active
    .getByRole('button', { name: 'Dans le panier · Pain au levain', exact: true })
    .click();
  await confirmed();
  await active.getByRole('button', { name: 'À prendre · Pain au levain', exact: true }).click();
  await confirmed();
  await active
    .getByRole('button', { name: 'Dans le panier · Pain au levain', exact: true })
    .click();
  await confirmed();
  await active.getByRole('button', { name: 'Vider les cochés', exact: true }).click();
  await confirmed();
  assert.equal(await active.getByText('Pain au levain', { exact: true }).count(), 0);
  assert.equal(await tomatoes.count(), 1);
  await reset();
  await go('Scanner');
  await active.getByRole('button', { name: 'Démarrer la simulation', exact: true }).click();
  await swipe(260, 90);
  assert.equal(await selected(), 'Scanner', 'Active viewfinder guards gestures');
  await active.getByRole('button', { name: 'Simuler une lecture', exact: true }).click();
  await active.locator('.scan-result').waitFor();
  await active.getByRole('button', { name: 'Ajouter Total traité', exact: true }).click();
  await active.locator('.scan-total output').getByText('2', { exact: true }).waitFor();
  await active.getByRole('button', { name: 'Annuler le dernier scan', exact: true }).click();
  await active.locator('.scan-result').waitFor({ state: 'hidden' });
  await active.getByRole('button', { name: 'Saisir un code-barres', exact: true }).click();
  await active.getByLabel('Code-barres', { exact: true }).fill('1234567890123');
  await active.getByRole('button', { name: 'Valider', exact: true }).click();
  await dialog.getByLabel('Nom du produit', { exact: true }).fill('Produit temporaire');
  await dialog.getByLabel('Quantité en stock', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await active.getByRole('button', { name: 'Annuler le dernier scan', exact: true }).click();
  await active.locator('.scan-result').waitFor({ state: 'hidden' });
  await go('Stock');
  const created = page
    .locator('.product-card')
    .filter({ has: page.getByRole('button', { name: 'Produit temporaire', exact: true }) });
  assert.equal(
    await created.locator('output').innerText(),
    '0',
    'New scanned product remains at zero after undo',
  );
  await created.getByRole('button', { name: 'Détails Produit temporaire', exact: true }).click();
  await dialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  assert.equal(await created.count(), 1);
  await reset();
  await go('À acheter');
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await dialog.getByLabel('Langue', { exact: true }).selectOption('en');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await settle();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await active.getByText('Pain au levain', { exact: true }).count(), 1);
  await shot('shopping-en-375.png');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page.locator('.page-track').evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s',
  );
  await nav.getByRole('button', { name: 'Scanner', exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await selected(), 'Scanner');
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.deepEqual(
    await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((r) => r.map((v) => v.scope)),
    ),
    [],
  );
  const files = await readdir(resolve('dist/assets'));
  for (const file of files.filter((f) => /\.(js|css)$/.test(f)))
    assert.equal(
      /Atelier 7A|prototype-ribbon|Maison Bleue|Fraunces|Manrope/.test(
        await readFile(resolve('dist/assets', file), 'utf8'),
      ),
      false,
      `Production isolation ${file}`,
    );
  assert.equal(
    files.some((f) =>
      /pasta|chickpea|tomato|Manrope|Fraunces|3017620422003|personal-lentils/.test(f),
    ),
    false,
  );
  console.log(
    '7A.1 passed: 4-width screen/keyboard/image matrix; stock warnings; immediate scan receipt/correction/undo; complete shopping controls; photo tap/swipe continuity; guarded gestures; FR/EN; reduced motion; no remote requests/storage/SW; production isolation.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
