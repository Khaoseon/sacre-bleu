import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:5197',
  evidence = resolve('docs/design/phase7a/convergence/screenshots');
let server, browser;
const results = [],
  external = [],
  errors = [];
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
    if (i > 60 || server?.exitCode != null) throw Error('7A loopback server unavailable');
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir(evidence, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      external.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(e.message));
  const nav = page.getByRole('navigation'),
    dialog = page.getByRole('dialog'),
    active = page.locator('.page-content[aria-hidden="false"]');
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
  async function load(path = '/') {
    await page.goto(origin + path);
    await page.locator(path.includes('compare.html') ? '.comparison' : '.brand-bar').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await settle();
  }
  async function go(name) {
    await nav.getByRole('button', { name, exact: true }).click();
    await settle();
  }
  async function settings(value) {
    await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
    await dialog.getByLabel('Simuler un état').selectOption(value);
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await settle();
  }
  async function done() {
    await page.waitForFunction(() => !document.querySelector('.bottom-nav button:disabled'));
    await settle();
  }
  async function confirmed() {
    await page
      .locator('.feedback')
      .getByText('Enregistré dans la simulation.', { exact: true })
      .waitFor();
    await done();
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
              r.left < innerWidth &&
              r.right > 0
            );
          })
          .map((i) => i.decode().catch(() => {})),
      );
    });
    await page.screenshot({
      path: resolve(evidence, name.replace(/\.png$/, '') + '.png'),
      animations: 'disabled',
    });
  }
  async function noOverflow() {
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(await active.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
    if (await dialog.count())
      assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
  }
  async function visibleAboveNav(locator) {
    const b = await locator.boundingBox(),
      n = await nav.boundingBox();
    assert.ok(
      b && b.y >= 0 && b.y + b.height <= n.y + 1,
      `Action fits above navigation: ${await locator.textContent()}`,
    );
  }
  async function simulate() {
    await active.getByRole('button', { name: 'Démarrer la simulation', exact: true }).click();
    await active.getByRole('button', { name: 'Simuler une lecture', exact: true }).click();
    await active.locator('[data-scan-result]').waitFor();
    await done();
  }
  const cdp = await context.newCDPSession(page);
  async function swipe(x, endX, y = 120, endY = y, { cancel = false, steps = 8, delay = 18 } = {}) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + ((endX - x) * i) / steps, y: y + ((endY - y) * i) / steps, id: 1 }],
      });
      if (delay) await new Promise((r) => setTimeout(r, delay));
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
    await settle();
  }
  const current = () => nav.locator('[aria-current]').getAttribute('aria-label');
  // Clean visual fixtures FIRST; mutations below can never leak into review captures.
  for (const [width, height] of process.argv.includes('--checks-only')
    ? []
    : [
        [320, 568],
        [320, 812],
        [375, 667],
        [375, 812],
        [390, 844],
        [430, 932],
        [900, 932],
      ]) {
    const tag = `${width}x${height}`;
    await page.setViewportSize({ width, height });
    await load('/?layout=shelf');
    await noOverflow();
    await shot(`shelf-${tag}`);
    const geometry = await active.evaluate((el) => {
      const cards = [...el.querySelectorAll('.product-card')],
        bottom = document.querySelector('.bottom-nav').getBoundingClientRect().top;
      return {
        firstTop: cards[0].getBoundingClientRect().top,
        fullProducts: cards.filter((c) => c.getBoundingClientRect().bottom <= bottom).length,
        recognisableProducts: cards.filter(
          (c) => c.querySelector('.product-object').getBoundingClientRect().bottom <= bottom,
        ).length,
      };
    });
    await active.getByRole('button', { name: 'Vue compacte', exact: true }).click();
    await shot(`compact-${tag}`);
    await noOverflow();
    const compact = await active.evaluate(
      (el) =>
        [...el.querySelectorAll('.product-card')].filter(
          (c) =>
            c.getBoundingClientRect().bottom <=
            document.querySelector('.bottom-nav').getBoundingClientRect().top,
        ).length,
    );
    results.push({ viewport: tag, shelf: geometry, compactFullProducts: compact });
    // Both layouts show real warnings and zero, including short phones.
    for (const layout of ['shelf', 'compact']) {
      await load(`/?layout=${layout}`);
      await active.getByLabel('Rechercher un produit').fill('Tomates');
      assert.equal(await active.getByText('Stock bas', { exact: true }).isVisible(), true);
      assert.ok(
        Number(
          await active
            .locator('.stock-status.low')
            .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        ) >= 12,
      );
      if (width === 320 || width === 375) await shot(`warning-${layout}-${tag}`);
      await active.getByLabel('Rechercher un produit').fill('Riz');
      assert.equal(await active.getByText('Plus en réserve', { exact: true }).isVisible(), true);
    }
    await load('/?detail=object');
    await noOverflow();
    await shot(`detail-object-${tag}`);
    assert.equal(await dialog.getByRole('heading', { name: 'Rigatoni', exact: true }).count(), 1);
    await load('/?detail=split');
    await noOverflow();
    await shot(`detail-split-${tag}`);
    await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
    await shot(`editor-${tag}`);
    assert.ok(await dialog.getByLabel('Nom du produit').isVisible());
    await page.setViewportSize({ width, height: 460 });
    await dialog.getByText('Informations du produit', { exact: true }).click();
    await dialog.getByLabel('Code-barres', { exact: true }).focus();
    await settle();
    const field = await dialog.getByLabel('Code-barres', { exact: true }).boundingBox(),
      save = await dialog.locator('.editor-save').boundingBox();
    assert.ok(field.y >= 0 && field.y + field.height <= save.y + 1, `Keyboard clearance ${tag}`);
    if (height !== 568 && height !== 667) await shot(`editor-reduced-${tag}`);
    await page.setViewportSize({ width, height });
    await load('/?page=2');
    await noOverflow();
    await shot(`shopping-${tag}`);
    await active
      .getByRole('button', { name: 'Dans le panier · Pain au levain', exact: true })
      .click();
    await done();
    await shot(`shopping-completed-${tag}`);
    await load('/?page=1');
    await noOverflow();
    await shot(`scanner-ready-${tag}`);
    await simulate();
    await visibleAboveNav(active.getByRole('button', { name: 'Scanner à nouveau', exact: true }));
    await visibleAboveNav(
      active.getByRole('button', { name: 'Saisir un code-barres', exact: true }),
    );
    assert.equal(
      await active.getByRole('button', { name: 'Retirer Total traité', exact: true }).isDisabled(),
      true,
    );
    await shot(`scanner-result-${tag}`);
    await load();
    await settings('offline');
    await shot(`offline-${tag}`);
    assert.ok(
      await active.getByRole('button', { name: 'Ajouter Huile d’olive', exact: true }).isDisabled(),
    );
    await settings('empty');
    assert.equal(await active.locator('.product-card').count(), 0);
    assert.equal(await active.locator('.restock-note').count(), 0);
    assert.equal(await nav.locator('.nav-badge').count(), 0);
    await visibleAboveNav(
      active.getByRole('button', { name: 'Ajouter un produit', exact: true }).last(),
    );
    await shot(`empty-${tag}`);
    await load('/?fixtures=mixed');
    await noOverflow();
    await shot(`mixed-${tag}`);
    await active.getByLabel('Rechercher un produit').fill('Rigatoni au blé');
    await noOverflow();
    await shot(`long-name-${tag}`);
    if (width === 320 || width === 375 || width === 430) {
      await load('/baseline.html');
      await shot(`baseline-inventory-${tag}`);
      await load('/baseline.html?detail=1');
      await shot(`baseline-detail-${tag}`);
      await load('/baseline.html?page=2');
      await shot(`baseline-shopping-${tag}`);
      await load('/baseline.html?page=1');
      await shot(`baseline-scanner-${tag}`);
    }
    console.log(`Visual matrix ${tag} passed`);
  }
  await writeFile(resolve(evidence, 'measurements.json'), JSON.stringify(results, null, 2) + '\n');
  await page.setViewportSize({ width: 375, height: 812 });
  // F1, F4, F5: real limits; DOM order; controlled announcements.
  await load('/?page=1');
  await active.getByRole('button', { name: 'Retirer', exact: true }).click();
  await simulate();
  assert.equal(
    await active.getByRole('button', { name: 'Retirer Total traité', exact: true }).isDisabled(),
    true,
  );
  const announcement = await active.locator('.sr-only[role=status]').innerText();
  assert.match(announcement, /Rigatoni.*Retrait confirmé.*1.*3/);
  for (let i = 2; i <= 4; i++) {
    await active.getByRole('button', { name: 'Ajouter Total traité', exact: true }).click();
    await active.locator('.scan-total output').getByText(String(i), { exact: true }).waitFor();
    await done();
  }
  assert.equal(
    await active.getByRole('button', { name: 'Ajouter Total traité', exact: true }).isDisabled(),
    true,
  );
  assert.equal(
    await active.locator('.sr-only[role=status]').innerText(),
    announcement,
    'Correction does not repeat scan announcement',
  );
  assert.equal(
    await active.locator('.scan-product').getByText('→ 0 en stock', { exact: false }).isVisible(),
    true,
  );
  const ordered = await active.locator('.session-scanner').evaluate((el) => {
    let previous = -Infinity;
    return [...el.querySelectorAll('button,input')]
      .filter((e) => e.getBoundingClientRect().height > 0)
      .every((e) => {
        const y = e.getBoundingClientRect().top;
        if (y < previous - 2) return false;
        previous = y;
        return getComputedStyle(e).order === '0';
      });
  });
  assert.equal(ordered, true, 'Scanner interactive DOM and visual order agree');
  await active.getByRole('button', { name: 'Annuler le dernier scan', exact: true }).click();
  await done();
  await go('Stock');
  assert.equal(await active.locator('[data-product=pasta] .quantity-value').innerText(), '4');
  // Proposed stock movement is one receipt, never optimistic; quantities bounded.
  await active.getByRole('button', { name: 'Ajuster la quantité Rigatoni', exact: true }).click();
  const proposal = dialog.getByLabel('Variation proposée', { exact: true });
  await proposal.fill('-5');
  assert.equal(
    await dialog.getByRole('button', { name: 'Confirmer la variation', exact: true }).isDisabled(),
    true,
  );
  await proposal.fill('12');
  await dialog.getByRole('button', { name: 'Confirmer la variation', exact: true }).click();
  assert.equal(await page.locator('[data-product=pasta] .quantity-value').innerText(), '4');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await active.locator('[data-product=pasta] .quantity-value').innerText(), '16');
  // F8: unchanged close is silent; modified close/continue retains actual draft.
  await active.getByRole('button', { name: 'Détails Rigatoni', exact: true }).click();
  await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  assert.equal(await dialog.count(), 0);
  await active.getByRole('button', { name: 'Détails Rigatoni', exact: true }).click();
  await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByLabel('Nom du produit').fill('Brouillon conservé');
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await dialog.getByRole('button', { name: 'Continuer l’édition', exact: true }).click();
  assert.equal(await dialog.getByLabel('Nom du produit').inputValue(), 'Brouillon conservé');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Abandonner les modifications', exact: true }).click();
  assert.equal(await active.getByRole('button', { name: 'Rigatoni', exact: true }).count(), 1);
  // F2: failure, conflict, validation, unexpected errors are distinct; draft retained.
  for (const [scenario, text] of [
    ['failure', 'Échec simulé. Aucun changement appliqué.'],
    ['conflict', 'Conflit : la réserve a changé. Vérifiez avant de réessayer.'],
    ['unexpected', 'Erreur inattendue. Aucun changement confirmé. Votre saisie est conservée.'],
  ]) {
    await load();
    await settings(scenario);
    await active.getByRole('button', { name: 'Détails Rigatoni', exact: true }).click();
    await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
    await dialog.getByLabel('Nom du produit').fill('Draft');
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await dialog.getByRole('alert').getByText(text, { exact: true }).waitFor();
    assert.equal(await dialog.getByLabel('Nom du produit').inputValue(), 'Draft');
  }
  await load();
  await active.getByRole('button', { name: 'Détails Rigatoni', exact: true }).click();
  await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByText('Informations du produit', { exact: true }).click();
  await dialog.getByLabel('Code-barres', { exact: true }).fill('1234567890123');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await active.getByRole('button', { name: 'Détails Huile d’olive', exact: true }).click();
  await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByText('Informations du produit', { exact: true }).click();
  await dialog.getByLabel('Code-barres', { exact: true }).fill('1234567890123');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog
    .getByRole('alert')
    .getByText('Ce code-barres appartient déjà à un autre produit.', { exact: true })
    .waitFor();
  // F3: unknown Remove has explicit create-without-removal decision and prefilled code.
  await load('/?page=1');
  await active.getByRole('button', { name: 'Retirer', exact: true }).click();
  await active.getByRole('button', { name: 'Saisir un code-barres', exact: true }).click();
  await active.getByLabel('Code-barres', { exact: true }).fill('1234567890123');
  await active.getByRole('button', { name: 'Valider', exact: true }).click();
  assert.equal(await active.getByText('Produit inconnu', { exact: true }).isVisible(), true);
  assert.equal(await active.locator('.scan-result').count(), 0);
  await shot('scanner-unknown-remove-375.png');
  await active.getByRole('button', { name: 'Créer sans retrait', exact: true }).click();
  assert.equal(
    await dialog.getByLabel('Code-barres', { exact: true }).inputValue(),
    '1234567890123',
  );
  await dialog.getByLabel('Nom du produit').fill('Nouveau produit');
  await dialog.getByLabel('Quantité en stock', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await active.locator('.scan-result').count(), 0);
  await go('Stock');
  assert.equal(
    await active
      .locator('.product-card')
      .filter({ has: page.getByRole('button', { name: 'Nouveau produit', exact: true }) })
      .locator('.quantity-value')
      .innerText(),
    '2',
  );
  // Add-mode creation and targeted scan undo keep new catalogue product at zero.
  await load('/?page=1');
  await active.getByRole('button', { name: 'Saisir un code-barres', exact: true }).click();
  await active.getByLabel('Code-barres', { exact: true }).fill('1234567890123');
  await active.getByRole('button', { name: 'Valider', exact: true }).click();
  await active.getByRole('button', { name: 'Créer et ajouter', exact: true }).click();
  await dialog.getByLabel('Nom du produit').fill('Nouveau produit');
  await dialog.getByLabel('Quantité à ajouter', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await active.locator('.scan-result').waitFor();
  await active.getByRole('button', { name: 'Annuler le dernier scan', exact: true }).click();
  await done();
  await go('Stock');
  assert.equal(
    await active
      .locator('.product-card')
      .filter({ has: page.getByRole('button', { name: 'Nouveau produit', exact: true }) })
      .locator('.quantity-value')
      .innerText(),
    '0',
  );
  // Unified entry never infers a link; explicit suggestions accumulate linked quantities.
  await load('/?page=2');
  const entry = active.getByLabel('Ajouter à la liste', { exact: true });
  await entry.fill('Tomates');
  await active.locator('.catalog-choice').getByText('Tomates en purée', { exact: true }).click();
  await confirmed();
  assert.equal(await active.locator('[data-shopping=s1] .row-options span').innerText(), '3');
  await entry.fill('Tomates en purée');
  await active.getByRole('button', { name: 'Ajouter en texte libre', exact: true }).click();
  await confirmed();
  assert.equal(
    await active.locator('.shopping-row').filter({ hasText: 'Tomates en purée' }).count(),
    2,
  );
  const row = active.locator('[data-shopping=s1]');
  await row
    .getByRole('button', { name: 'Quantité et options Tomates en purée', exact: true })
    .click();
  await row.getByRole('button', { name: 'Retirer Tomates en purée', exact: true }).click();
  await confirmed();
  assert.equal(await row.locator('.row-options span').innerText(), '2');
  await row.getByRole('button', { name: 'Dans le panier · Tomates en purée', exact: true }).click();
  assert.equal(
    await row
      .getByRole('button', { name: 'Dans le panier · Tomates en purée', exact: true })
      .getAttribute('aria-pressed'),
    'false',
  );
  await done();
  assert.equal(
    await row
      .getByRole('button', { name: 'À prendre · Tomates en purée', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(await row.locator('.row-options span').innerText(), '2');
  await row.getByRole('button', { name: 'Ajouter Tomates en purée', exact: true }).click();
  await confirmed();
  assert.equal(
    await row
      .getByRole('button', { name: 'Dans le panier · Tomates en purée', exact: true })
      .getAttribute('aria-pressed'),
    'false',
  );
  await row.getByRole('button', { name: 'Supprimer Tomates en purée', exact: true }).click();
  await done();
  assert.equal(await row.count(), 0);
  await page.locator('.undo-removal').getByRole('button', { name: 'Annuler', exact: true }).click();
  await done();
  assert.equal(await row.count(), 1);
  await row.getByRole('button', { name: 'Dans le panier · Tomates en purée', exact: true }).click();
  await done();
  await active.getByRole('button', { name: 'Vider les cochés', exact: true }).click();
  await done();
  assert.equal(await row.count(), 0);
  assert.equal(await active.locator('[data-shopping=s2]').count(), 1);
  // Replenishment: linked rows disabled; threshold-free zero separated; selection atomic.
  await load('/?fixtures=mixed');
  await active.locator('.restock-note').click();
  assert.equal(await dialog.getByText('Épuisés sans seuil', { exact: true }).isVisible(), true);
  assert.equal(await dialog.locator('.restock-row input:disabled').count(), 2);
  await dialog.locator('.restock-row').filter({ hasText: 'Nutella' }).getByRole('checkbox').check();
  await shot('replenishment-375.png');
  await dialog
    .getByRole('button', { name: 'Ajouter la sélection aux courses', exact: true })
    .click();
  await dialog.waitFor({ state: 'hidden' });
  await go('À acheter');
  assert.equal(await active.locator('.shopping-row').filter({ hasText: 'Nutella' }).count(), 1);
  // Personal photo >500KB, preview/replace/remove; invalid HEIC safe error. No OFF on overrides.
  await load('/?fixtures=mixed');
  await active.getByLabel('Rechercher un produit').fill('Nutella');
  await active.getByRole('button', { name: 'Détails Nutella', exact: true }).click();
  await dialog.getByText('À propos de ce visuel', { exact: true }).click();
  assert.equal(await dialog.getByRole('link', { name: /Open Food Facts/ }).count(), 1);
  await shot('off-attribution-375.png');
  await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByText('Photo du produit', { exact: true }).click();
  await dialog
    .locator('input[type=file]')
    .setInputFiles(resolve('explorations/7a/assets/reality/personal-lentils.png'));
  await dialog.getByRole('button', { name: 'Retirer la photo personnelle', exact: true }).waitFor();
  await dialog.getByLabel('Cadrage de l’aperçu').selectOption('cover');
  await shot('photo-preview-375.png');
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await active.getByRole('button', { name: 'Détails Nutella', exact: true }).click();
  await dialog.getByText('À propos de ce visuel', { exact: true }).click();
  assert.equal(
    await dialog
      .locator('.detail-object .image-area img')
      .evaluate((el) => getComputedStyle(el).objectFit),
    'cover',
  );
  assert.equal(await dialog.getByRole('link', { name: /Open Food Facts/ }).count(), 0);
  await dialog.getByRole('button', { name: 'Modifier', exact: true }).click();
  await dialog.getByText('Photo du produit', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Retirer la photo personnelle', exact: true }).click();
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'example.heic',
    mimeType: 'image/heic',
    buffer: Buffer.from('invalid fixture'),
  });
  await dialog
    .getByRole('alert')
    .getByText(/Photo non prise en charge/)
    .waitFor();
  await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await active.getByRole('button', { name: 'Détails Nutella', exact: true }).click();
  await dialog.getByText('À propos de ce visuel', { exact: true }).click();
  assert.equal(await dialog.getByRole('link', { name: /Open Food Facts/ }).count(), 1);
  // F6: shopping/manual drafts preserved, only current page blocks gestures.
  await load('/?page=2');
  await entry.fill('Brouillon courses');
  await go('Stock');
  await swipe(260, 80);
  assert.equal(await current(), 'Scanner');
  await active.getByRole('button', { name: 'Saisir un code-barres', exact: true }).click();
  await active.getByLabel('Code-barres', { exact: true }).fill('12345678');
  await swipe(260, 80);
  assert.equal(await current(), 'Scanner');
  await go('Stock');
  await swipe(260, 80);
  assert.equal(
    await current(),
    'Scanner',
    'Manual draft on another page does not block stock swipe',
  );
  await go('À acheter');
  assert.equal(await entry.inputValue(), 'Brouillon courses');
  await go('Scanner');
  assert.equal(await active.getByLabel('Code-barres', { exact: true }).inputValue(), '12345678');
  // Gesture continuity, photograph arbitration, canceled/diagonal/vertical/edges/busy/sheets.
  await load('/?layout=shelf');
  const photo = await active.locator('[data-product=oil] .product-object').boundingBox();
  const x = photo.x + photo.width * 0.8,
    y = photo.y + photo.height * 0.5;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 90, y: y + 2, id: 1 }],
  });
  await page.waitForTimeout(40);
  const shift = await page
    .locator('.page-track')
    .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
  assert.ok(Math.abs(shift + 90) < 2, 'Track follows finger 1:1');
  await shot('swipe-continuity-375');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle();
  assert.equal(await current(), 'Scanner');
  assert.equal(await dialog.count(), 0);
  await go('Stock');
  for (const args of [
    [260, 235, 120, 120, {}],
    [260, 80, 120, 260, {}],
    [260, 240, 120, 280, {}],
    [260, 80, 120, 120, { cancel: true }],
  ]) {
    await swipe(...args);
    assert.equal(await current(), 'Stock');
  }
  const edgeIgnored = await page.evaluate(() => {
    const root = document.querySelector('main');
    const target = document.querySelector('.page-0 h1');
    const touch = (x) => new Touch({ identifier: 99, target, clientX: x, clientY: 120 });
    target.dispatchEvent(
      new TouchEvent('touchstart', { touches: [touch(10)], bubbles: true, cancelable: true }),
    );
    const move = new TouchEvent('touchmove', {
      touches: [touch(220)],
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(move);
    target.dispatchEvent(
      new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touch(220)],
        bubbles: true,
        cancelable: true,
      }),
    );
    return !move.defaultPrevented && !!root;
  });
  assert.equal(edgeIgnored, true, 'App leaves system-edge events uncaptured');
  assert.equal(await current(), 'Stock');
  await swipe(260, 215, 120, 120, { steps: 2, delay: 0 });
  assert.equal(await current(), 'Scanner', 'Fast flick');
  await go('Stock');
  await active.getByRole('button', { name: 'Détails Huile d’olive', exact: true }).tap();
  assert.equal(await dialog.count(), 1);
  await swipe(260, 80);
  assert.equal(await current(), 'Stock');
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  await active.getByRole('button', { name: 'Ajouter Huile d’olive', exact: true }).click();
  await swipe(260, 80);
  assert.equal(await current(), 'Stock', 'Pending operation blocks navigation');
  await done();
  // F9: uncertain/read-only distinct; local verification is asynchronous and explicitly simulated.
  await settings('uncertain');
  assert.equal(
    await active.getByRole('button', { name: 'Ajouter Huile d’olive', exact: true }).isDisabled(),
    true,
  );
  await active.getByRole('button', { name: 'Vérifier la simulation', exact: true }).click();
  assert.equal(
    await active.getByRole('button', { name: 'Ajouter Huile d’olive', exact: true }).isDisabled(),
    true,
  );
  await active
    .getByText('Résultat incertain · vérifiez avant de continuer.', { exact: true })
    .waitFor({ state: 'hidden' });
  await load('/?page=1');
  await settings('failure');
  await active.getByRole('button', { name: 'Démarrer la simulation', exact: true }).click();
  await active.getByRole('button', { name: 'Simuler une lecture', exact: true }).click();
  await active
    .getByRole('alert')
    .getByText('Échec simulé. Aucun changement appliqué.', { exact: true })
    .waitFor();
  await shot('scanner-error-375');
  // Accessibility: contrast, mobile inputs, EN, keyboard, reduced motion, zoom/landscape.
  function contrast(a, b) {
    const luminance = (h) => {
      const c = h
        .match(/\d+/g)
        .slice(0, 3)
        .map(Number)
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
      return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    };
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  await load('/?fixtures=mixed');
  await active.getByLabel('Rechercher un produit').fill('Sel');
  const fallback = await active.locator('.image-fallback').evaluate((el) => ({
    fg: getComputedStyle(el).color,
    bg: getComputedStyle(el).backgroundColor,
  }));
  assert.ok(contrast(fallback.fg, fallback.bg) >= 4.5);
  await load('/?page=2');
  const checkContrast = await active
    .locator('.check-item')
    .first()
    .evaluate((el) => ({
      fg: getComputedStyle(el, '::before').borderColor,
      bg: getComputedStyle(document.documentElement).backgroundColor,
    }));
  assert.ok(contrast(checkContrast.fg, checkContrast.bg) >= 3);
  for (const url of [
    '/?lang=en',
    '/?lang=en&page=2',
    '/?lang=en&page=1',
    '/?lang=en&detail=split',
  ]) {
    await load(url);
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await noOverflow();
    await shot(
      `english-${url.includes('page=2') ? 'shopping' : url.includes('page=1') ? 'scanner' : url.includes('detail') ? 'detail' : 'inventory'}-375`,
    );
  }
  await load('/?fixtures=mixed&layout=compact');
  await page.addStyleTag({
    content:
      'input,select,button,.product-name,.package-size,.stock-status{font-size:200%!important}',
  });
  await noOverflow();
  await shot('text-enlargement-375');
  await page.setViewportSize({ width: 812, height: 375 });
  await load('/?layout=compact');
  await noOverflow();
  await shot('landscape-812x375');
  await page.setViewportSize({ width: 375, height: 812 });
  await load();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page.locator('.page-track').evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s',
  );
  await nav.getByRole('button', { name: 'Scanner', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await nav.getByRole('button', { name: 'Scanner', exact: true }).focus();
  assert.equal(
    await nav
      .getByRole('button', { name: 'Scanner', exact: true })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    'solid',
  );
  await page.keyboard.press('Enter');
  assert.equal(await current(), 'Scanner');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Large-catalogue geometry and frame path, not a claim about physical hardware.
  const performance = [];
  for (const count of [100, 300]) {
    await load(`/?count=${count}&layout=compact`);
    assert.equal(await active.locator('.product-card').count(), count);
    const start = Date.now();
    await active.getByLabel('Rechercher un produit').fill('Rigatoni');
    await page.waitForFunction(
      () => document.querySelectorAll('.inventory .product-card').length < 100,
    );
    const filterMs = Date.now() - start;
    await active.getByLabel('Rechercher un produit').fill('');
    await page.waitForFunction(
      (count) => document.querySelectorAll('.inventory .product-card').length === count,
      count,
    );
    await settle();
    await cdp.send('Performance.enable');
    const before = await cdp.send('Performance.getMetrics');
    await swipe(260, 80, 120, 120, { steps: 20, delay: 12 });
    const after = await cdp.send('Performance.getMetrics');
    const metric = (m, k) => m.metrics.find((v) => v.name === k)?.value ?? 0;
    performance.push({
      count,
      filterMs,
      touchScriptMs: Math.round(
        (metric(after, 'ScriptDuration') - metric(before, 'ScriptDuration')) * 1000,
      ),
      layoutMs: Math.round(
        (metric(after, 'LayoutDuration') - metric(before, 'LayoutDuration')) * 1000,
      ),
    });
    assert.equal(await current(), 'Scanner');
  }
  await writeFile(
    resolve(evidence, 'performance.json'),
    JSON.stringify(performance, null, 2) + '\n',
  );
  await load('/compare.html');
  await page.setViewportSize({ width: 1280, height: 1200 });
  assert.equal(await page.locator('iframe').count(), 3);
  for (let i = 0; i < 3; i++)
    await page.frameLocator('iframe').nth(i).locator('.brand-bar').waitFor();
  await shot('comparison-inventory');
  await page.getByRole('button', { name: 'Détails', exact: true }).click();
  assert.equal(await page.locator('iframe').count(), 3);
  for (let i = 0; i < 3; i++)
    await page.frameLocator('iframe').nth(i).getByRole('dialog').waitFor();
  await shot('comparison-details');
  await page.getByRole('button', { name: 'À acheter', exact: true }).click();
  assert.equal(await page.locator('iframe').count(), 2);
  for (let i = 0; i < 2; i++)
    await page.frameLocator('iframe').nth(i).locator('.shopping-row').first().waitFor();
  await shot('comparison-shopping');
  await page.getByRole('button', { name: 'Scanner', exact: true }).click();
  for (let i = 0; i < 2; i++)
    await page.frameLocator('iframe').nth(i).locator('.viewfinder').waitFor();
  await shot('comparison-scanner-ready');
  for (let i = 0; i < 2; i++) {
    const frame = page.frameLocator('iframe').nth(i);
    await frame.getByRole('button', { name: 'Démarrer la simulation', exact: true }).click();
    await frame.getByRole('button', { name: 'Simuler une lecture', exact: true }).click();
    await frame.locator('.scan-result').waitFor();
  }
  await shot('comparison-scanner-result');
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.equal(
    await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)),
    0,
  );
  const files = await readdir(resolve('dist/assets'));
  for (const file of files.filter((f) => /\.(js|css)$/.test(f)))
    assert.equal(
      /Atelier 7A|prototype-ribbon|Maison Bleue|Fraunces|Manrope|Variation proposée/.test(
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
    '7A.2 passed: seven viewport comparison matrix; F1–F9; complete shopping/undo/explicit links; replenishment; local large-photo preview; guarded rAF swipe; 100/300 catalogue; FR/EN, contrast/inputs/keyboard/reduced motion/enlargement; no remote requests/storage/SW; production isolation.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
