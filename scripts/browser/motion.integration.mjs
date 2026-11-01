import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5200';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5200', '--strictPort'],
  { stdio: 'pipe', windowsHide: true },
);
let browser, context;
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    assert(attempt < 80 && server.exitCode === null, 'Local Vite starts');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const external = [],
    errors = [];
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  const nav = page.locator('.mobile-nav');
  const dialog = page.locator('dialog[open]');
  const track = page.locator('.page-track');
  const selected = () => nav.locator('[aria-current=page]').innerText();
  const settled = () =>
    page.waitForFunction(
      () => !document.getAnimations().some((animation) => animation.playState === 'running'),
    );
  const tick = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(done)));
  const touch = (type, points = []) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y, id = 1]) => ({ x, y, id })),
    });
  const drag = async (points, ending = 'touchEnd') => {
    await touch('touchStart', [points[0]]);
    for (const point of points.slice(1)) {
      await touch('touchMove', [point]);
      await tick();
    }
    await touch(ending);
    await settled();
  };
  const exactPage = async (index) => {
    await settled();
    assert(
      await track.evaluate(
        (element, index) =>
          Math.abs(
            new DOMMatrixReadOnly(getComputedStyle(element).transform).m41 +
              element.clientWidth * index,
          ) < 1,
        index,
      ),
      'Exact destination transform',
    );
    assert.equal(await page.locator('.page-pane:not([inert])').count(), 1);
    assert.equal(await page.locator('.dragging').count(), 0);
  };
  await page.goto(origin + '/scripts/browser/polish-harness.html');
  await page.locator('.product-edit').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const initial = await page.evaluate(() => localStorage.getItem('app-reserve.local.v1'));
  await touch('touchStart', [[300, 450]]);
  await touch('touchMove', [[250, 450]]);
  await tick();
  await touch('touchMove', [[200, 450]]);
  await tick();
  assert(
    await track.evaluate(
      (element) =>
        Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m41 + 100) < 2,
    ),
    'Content follows the finger without an easing lag',
  );
  // Record release trajectory to catch an origin flash or backwards/double displacement.
  await page.evaluate(() => {
    window.releasePositions = [];
    window.sampleRelease = true;
    const sample = () => {
      if (!window.sampleRelease) return;
      window.releasePositions.push(
        new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.page-track')).transform)
          .m41,
      );
      requestAnimationFrame(sample);
    };
    sample();
  });
  await touch('touchEnd');
  await exactPage(1);
  const trajectory = await page.evaluate(() => {
    window.sampleRelease = false;
    return window.releasePositions;
  });
  assert(
    trajectory.every((value, index) => index === 0 || value <= trajectory[index - 1] + 1),
    'Release never jumps backwards to the old page',
  );
  await nav.locator('button').nth(0).click();
  await exactPage(0);
  await drag([
    [300, 450],
    [280, 450],
  ]);
  await exactPage(0); // incomplete
  await drag([
    [300, 450],
    [170, 450],
    [295, 450],
  ]);
  await exactPage(0); // reversal
  await drag(
    [
      [300, 450],
      [190, 450],
    ],
    'touchCancel',
  );
  await exactPage(0);
  await drag([
    [300, 450],
    [285, 530],
    [270, 600],
  ]);
  await exactPage(0); // vertical
  await touch('touchStart', [[300, 450]]);
  await touch('touchMove', [[200, 450]]);
  await tick();
  await touch('touchStart', [
    [200, 450],
    [240, 470, 2],
  ]);
  await touch('touchEnd');
  await exactPage(0);
  await touch('touchStart', [[300, 450]]);
  await touch('touchMove', [[200, 450]]);
  await tick();
  await page.setViewportSize({ width: 430, height: 812 });
  await touch('touchEnd');
  await exactPage(0);
  await page.setViewportSize({ width: 375, height: 812 });
  await touch('touchStart', [[300, 450]]);
  await touch('touchMove', [[200, 450]]);
  await tick();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await touch('touchEnd');
  await exactPage(0);
  await touch('touchStart', [[300, 450]]);
  await touch('touchMove', [[200, 450]]);
  await tick();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await touch('touchEnd');
  await exactPage(0);
  await drag([
    [10, 450],
    [150, 450],
  ]);
  await exactPage(0); // system edge
  await touch('touchStart', [[100, 450]]);
  await touch('touchMove', [[200, 450]]);
  await tick();
  assert(
    await track.evaluate((element) => {
      const x = new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
      return x > 0 && x <= 20;
    }),
    'Discrete edge resistance',
  );
  await touch('touchEnd');
  await exactPage(0);
  // An explicit event clock tests slow versus fast release without sleeping in CI.
  const timedGesture = (elapsed) =>
    page
      .locator('.product-edit')
      .first()
      .evaluate((element, elapsed) => {
        const dispatch = (type, x, time, ended = false) => {
          const point = new Touch({ identifier: 9, target: element, clientX: x, clientY: 450 });
          const event = new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: ended ? [] : [point],
            changedTouches: [point],
          });
          Object.defineProperty(event, 'timeStamp', { value: time });
          element.dispatchEvent(event);
        };
        dispatch('touchstart', 150, 1000);
        dispatch('touchmove', 95, 1000 + elapsed / 2);
        dispatch('touchend', 95, 1000 + elapsed, true);
      }, elapsed);
  await timedGesture(700);
  await exactPage(0);
  await timedGesture(70);
  await exactPage(1);
  // Retarget a running transition several times, including a touch interruption.
  await nav.evaluate((element) => {
    const buttons = element.querySelectorAll('button');
    buttons[2].click();
  });
  await tick();
  await nav.evaluate((element) => {
    element.querySelectorAll('button')[0].click();
  });
  await tick();
  await touch('touchStart', [[300, 450]]);
  await touch('touchMove', [[270, 450]]);
  await touch('touchCancel');
  await exactPage(0);
  assert.equal(await page.evaluate(() => localStorage.getItem('app-reserve.local.v1')), initial);
  assert.equal(await dialog.count(), 0, 'Dragging a product never activates its detail click');

  // Exit retains the native modal until completion; replacements open immediately.
  const opener = page.getByRole('button', { name: 'Détails de Penne rigate', exact: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    await opener.focus();
    await page.keyboard.press('Enter');
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert(
      await opener.evaluate((element) => element === document.activeElement),
      'Focus restored to exact product opener',
    );
  }
  await opener.click();
  await dialog
    .getByRole('button', { name: 'Modifier le produit', exact: true })
    .evaluate((button) => button.click());
  await page.getByRole('dialog', { name: 'Modifier le produit', exact: true }).waitFor();
  assert(
    await dialog.locator('[name=name]').evaluate((element) => element === document.activeElement),
    'Replacement focuses the editor without waiting for an exit',
  );
  await dialog.locator('[name=name]').fill('Brouillon conservé');
  await page.setViewportSize({ width: 320, height: 360 });
  assert.equal(await dialog.locator('[name=name]').inputValue(), 'Brouillon conservé');
  assert(
    await dialog.locator('[name=name]').evaluate((element) => element === document.activeElement),
    'Viewport changes preserve input focus',
  );
  assert(
    await dialog.evaluate(
      (element) =>
        element.scrollWidth <= element.clientWidth + 1 &&
        element.getBoundingClientRect().bottom <= innerHeight,
    ),
    'Small viewport sheet stays in bounds',
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await dialog.waitFor();
  assert.equal(
    await dialog.locator('.draft-warning').count(),
    1,
    'Dirty guard stays interactive instead of animating away',
  );
  assert.equal(await dialog.getAttribute('data-closing'), null);
  await dialog.getByRole('button', { name: 'Abandonner les modifications' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 375, height: 812 });

  // Real shared store, held synthetic transport: confirmation precedes motion.
  await page.goto(origin + '/scripts/browser/polish-harness.html?shared');
  const quantity = page
    .locator('.product-row')
    .filter({ has: page.getByRole('button', { name: 'Détails de Penne rigate', exact: true }) })
    .locator('.quantity');
  await page.evaluate(() => window.polish.hold());
  await quantity.getByRole('button', { name: 'Ajouter un Penne rigate', exact: true }).click();
  assert.equal(await quantity.locator('.quantity-value').innerText(), '3');
  assert(await quantity.getByRole('button').last().isDisabled());
  await drag([
    [300, 450],
    [150, 450],
  ]);
  await exactPage(0);
  await page.evaluate(() => window.polish.finish());
  await page.waitForFunction(() => document.querySelector('.quantity[aria-busy]') === null);
  assert.equal(await quantity.locator('.quantity-value').innerText(), '4');
  await settled();
  await nav.locator('button').nth(2).click();
  await exactPage(2);
  const row = page.locator('[data-motion-id="s-thon"]');
  await page.evaluate(() => window.polish.hold());
  await row.getByRole('checkbox').click();
  assert.equal(await row.getByRole('checkbox').getAttribute('aria-checked'), 'false');
  assert.equal(await row.evaluate((element) => element.getAnimations().length), 0);
  await page.evaluate(() => window.polish.finish());
  await page.waitForFunction(() =>
    document.querySelector('[data-motion-id="s-thon"] [aria-checked=true]'),
  );
  await settled();
  await row.getByRole('checkbox').click();
  await settled();
  assert.equal(await row.getByRole('checkbox').getAttribute('aria-checked'), 'false');
  await row.getByRole('checkbox').click();
  await settled();
  const box = await row.boundingBox();
  const y = box.y + 30;
  await drag([
    [280, y],
    [220, y],
    [155, y],
  ]);
  await exactPage(2);
  assert.equal(await row.getAttribute('class'), 'shopping-swipe revealed');
  const confirmed = await page.evaluate(() => window.polish.snapshot().shopping.length);
  await drag([
    [155, y],
    [220, y],
    [280, y],
  ]);
  assert.equal(await row.locator('.swipe-delete').getAttribute('aria-hidden'), 'true');
  await drag(
    [
      [280, y],
      [155, y],
    ],
    'touchCancel',
  );
  assert.equal(await page.evaluate(() => window.polish.snapshot().shopping.length), confirmed);
  await row.locator('summary').tap();
  await page.evaluate(() => window.polish.hold());
  await row
    .getByRole('button', { name: 'Supprimer Thon au naturel des courses', exact: true })
    .last()
    .click();
  assert.equal(await row.count(), 1);
  assert.equal(await page.locator('.shopping-exit,.shopping-undo').count(), 0);
  await page.evaluate(() => {
    window.originalMotionAnimate = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = function (...args) {
      const animation = window.originalMotionAnimate.apply(this, args);
      if (this.matches('.shopping-list,.shopping-exit')) animation.pause();
      return animation;
    };
  });
  await page.evaluate(() => window.polish.finish());
  await page.locator('.shopping-undo').waitFor();
  assert(
    await page
      .locator('.shopping-exit')
      .evaluate(
        (element) =>
          element.inert && getComputedStyle(element.parentElement).overflowY === 'hidden',
      ),
    'Outgoing visual copy is inert and clipped, so it cannot paint across the following hint',
  );
  await page.evaluate(() => {
    HTMLElement.prototype.animate = window.originalMotionAnimate;
    document
      .getAnimations()
      .filter((animation) => animation.playState === 'paused')
      .forEach((animation) => animation.finish());
  });
  await settled();
  assert.equal(await row.count(), 0);
  assert.equal(
    await page.locator('.shopping-exit').count(),
    0,
    'No ghost controls after confirmed removal',
  );
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await settled();
  assert(
    await page.evaluate(() =>
      window.polish.snapshot().shopping.some((item) => item.product_id === 'thon' && !item.checked),
    ),
  );
  const restored = page
    .locator('.shopping-row')
    .filter({ has: page.getByText('Thon au naturel', { exact: true }) });
  await restored.locator('summary').click();
  await page.evaluate(() => window.polish.fail('rejected'));
  await restored
    .getByRole('button', { name: 'Supprimer Thon au naturel des courses', exact: true })
    .click();
  await page.locator('.sync-message.sync-error').waitFor();
  assert.equal(await restored.count(), 1);
  assert.equal(await page.locator('.shopping-exit,.shopping-undo').count(), 0);
  await page.evaluate(() => window.polish.fail('uncertain'));
  await restored
    .getByRole('button', { name: 'Supprimer Thon au naturel des courses', exact: true })
    .click();
  await page.getByRole('button', { name: 'Reprendre la demande', exact: true }).waitFor();
  assert.equal(await restored.count(), 1);
  assert.equal(await page.locator('.shopping-exit,.shopping-undo').count(), 0);

  // Scanner presentation: detection, failure and uncertain writes never use success motion.
  for (const failure of ['rejected', 'uncertain']) {
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(origin + '/scripts/browser/polish-harness.html?shared');
    await nav.locator('button').nth(1).click();
    await exactPage(1);
    await page.locator('.manual-code summary').click();
    await page.locator('#barcode').fill('8076802085738');
    await page.evaluate((kind) => {
      window.polish.fail(kind);
      window.polish.hold();
    }, failure);
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    assert.equal(await page.locator('.last-product[data-confirmed=true]').count(), 0);
    await page.evaluate(() => window.polish.finish());
    await page.locator('.sync-message.sync-error').first().waitFor();
    assert.equal(await page.locator('.last-product[data-confirmed=true]').count(), 0);
  }

  // CSS AND JS reduced-motion, including a preference change during a running FLIP/exit.
  await page.goto(origin + '/scripts/browser/polish-harness.html');
  await nav.locator('button').nth(2).click();
  await exactPage(2);
  await page
    .getByRole('checkbox', { name: 'Cocher Thon au naturel', exact: true })
    .evaluate((button) => button.click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settled();
  assert.equal(
    await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === 'running').length,
    ),
    0,
  );
  await nav.locator('button').nth(0).click();
  await exactPage(0);
  await drag([
    [300, 450],
    [200, 450],
    [150, 450],
  ]);
  await exactPage(1);
  await nav.locator('button').nth(0).click();
  await page.getByRole('button', { name: 'Détails de Penne rigate', exact: true }).click();
  assert.equal(await dialog.evaluate((element) => element.getAnimations().length), 0);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await opener.click();
  await dialog
    .getByRole('button', { name: 'Fermer', exact: true })
    .evaluate((button) => button.click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await dialog.waitFor({ state: 'detached' });

  // All palette/viewport combinations retain usable sheets, focus and no overflow.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.locator('.sidebar nav button').nth(2).click();
  assert(
    await page
      .locator('.shopping-swipe')
      .evaluateAll((rows) => rows.every((row) => row.getAnimations().length === 0)),
    'Entering Shopping does not cascade its rows',
  );
  await page.locator('.sidebar nav button').nth(0).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'maison', 'maison-night']) {
    for (const [width, height] of [
      [320, 568],
      [375, 812],
      [430, 932],
      [1100, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      await opener.click();
      assert(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
    }
  }

  // Delayed real image bytes, contain-fit geometry and a missing-image fallback.
  let releasePhoto;
  await context.route(
    'https://images.openfoodfacts.org/images/products/5449000000996.jpg',
    async (route) => {
      await new Promise((resolve) => {
        releasePhoto = resolve;
      });
      await route.fulfill({
        path: 'explorations/7a/assets/reality/5449000000996.jpg',
        contentType: 'image/jpeg',
      });
    },
  );
  await page.goto(origin + '/scripts/browser/core-mobile-harness.html', {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('button', { name: 'Détails de Coca-Cola Original', exact: true }).click();
  const media = dialog.locator('.product-image');
  const size = await media.boundingBox();
  // Release every consumer of the same URL (inventory and sheet).
  await page.waitForFunction(() => !!document.querySelector('.object-detail img'));
  assert(releasePhoto);
  releasePhoto();
  await media.locator('img').evaluate((image) => image.decode());
  const loaded = await media.boundingBox();
  assert(
    Math.abs(size.width - loaded.width) < 1 && Math.abs(size.height - loaded.height) < 1,
    'Late image does not resize the sheet frame',
  );
  assert.equal(
    await media.locator('img').evaluate((image) => getComputedStyle(image).objectFit),
    'contain',
  );
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    'PASS motion: direct/reversed/slow/flick/cancel/multitouch/vertical/edge/resize/interrupted navigation; modal lifecycle/focus/draft/viewport; confirmed quantities/check/delete/undo/rejection/uncertainty; scanner failure presentation; live CSS+JS reduced motion; 3 themes × 4 widths; late photo. Synthetic Chrome only.',
  );
} finally {
  await mkdir('.tmp', { recursive: true });
  await context?.tracing.stop({ path: '.tmp/motion-transitions.zip' });
  await browser?.close();
  server.kill();
}
