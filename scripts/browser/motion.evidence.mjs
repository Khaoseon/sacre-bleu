import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolve } from 'node:path';

// Deliberately separate from CI assertions: records time, rather than prescribing frames.
const label = process.argv.includes('--before') ? 'before' : 'after';
const rate = process.argv.includes('--slow') ? 4 : 1;
const metricsOnly = process.argv.includes('--metrics-only');
const output = `docs/design/motion/evidence/${label}${rate > 1 ? '-cpu4' : ''}${metricsOnly ? '-metrics' : ''}`;
const origin = 'http://127.0.0.1:5201';
const baselineRoot = process.argv.includes('--baseline-root')
  ? resolve('.tmp/motion-baseline')
  : process.cwd();
const server = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5201',
    '--strictPort',
  ],
  { cwd: baselineRoot, stdio: 'pipe', windowsHide: true },
);
let serverLog = '';
server.stderr.on('data', (chunk) => {
  serverLog += chunk;
});
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    assert(attempt < 80 && server.exitCode === null, `Local Vite starts: ${serverLog}`);
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  await context.route('**/*', (r) =>
    new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
  );
  if (!metricsOnly) await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.goto(origin + '/scripts/browser/polish-harness.html');
  await page.evaluate(() => {
    localStorage.setItem('app-reserve.theme.v1', 'maison');
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.product-edit').first().waitFor();
  const results = [];
  async function record(name, action) {
    await page.evaluate(() => {
      window.motionSamples = { frames: [], longTasks: [], start: performance.now(), running: true };
      window.motionObserver = new PerformanceObserver((list) =>
        window.motionSamples.longTasks.push(
          ...list.getEntries().map((e) => ({ start: e.startTime, duration: e.duration })),
        ),
      );
      window.motionObserver.observe({ type: 'longtask' });
      const tick = (time) => {
        if (!window.motionSamples.running) return;
        window.motionSamples.frames.push(time);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    // Successive screenshots retain actual capture timestamps; no exact frame-rate claim.
    let recording = true;
    const frames = [];
    const capture = (async () => {
      for (let i = 0; !metricsOnly && recording && i < 80; i++) {
        const time = await page.evaluate(() => performance.now());
        const file = `${name}-${String(i).padStart(3, '0')}.jpg`;
        await page.screenshot({ path: `${output}/${file}`, type: 'jpeg', quality: 65 });
        frames.push({ file, time });
        await new Promise((r) => setTimeout(r, 60));
      }
    })();
    try {
      await action();
      await page.waitForFunction(
        () => !document.getAnimations().some((a) => a.playState === 'running'),
      );
    } finally {
      recording = false;
      await capture;
    }
    const samples = await page.evaluate(() => {
      window.motionSamples.running = false;
      window.motionObserver.disconnect();
      return window.motionSamples;
    });
    const gaps = samples.frames
      .slice(1)
      .map((time, i) => time - samples.frames[i])
      .sort((a, b) => a - b);
    results.push({
      name,
      frames,
      elapsed: await page.evaluate((start) => performance.now() - start, samples.start),
      raf: {
        count: gaps.length,
        median: gaps[Math.floor(gaps.length * 0.5)] ?? 0,
        p95: gaps[Math.floor(gaps.length * 0.95)] ?? 0,
        max: gaps.at(-1) ?? 0,
        over34ms: gaps.filter((v) => v > 34).length,
      },
      longTasks: samples.longTasks,
    });
  }
  await record('navigation', async () => {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 300, y: 450, id: 1 }],
    });
    for (let i = 1; i <= 10; i++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 300 - i * 18, y: 450, id: 1 }],
      });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page
      .locator('.mobile-nav button[aria-current=page]')
      .filter({ hasText: 'Scanner' })
      .waitFor();
  });
  await page.locator('.mobile-nav button').nth(0).click();
  await page.waitForFunction(
    () => !document.getAnimations().some((a) => a.playState === 'running'),
  );
  await record('sheet', async () => {
    await page.getByRole('button', { name: 'Détails de Penne rigate', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(
      () => !document.getAnimations().some((a) => a.playState === 'running'),
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  await record('quantity', async () => {
    const plus = page.getByRole('button', { name: 'Ajouter un Penne rigate', exact: true });
    await plus.click();
    await plus.click();
    await plus.click();
  });
  await page.locator('.mobile-nav button').nth(2).click();
  await page.waitForFunction(
    () => !document.getAnimations().some((a) => a.playState === 'running'),
  );
  await record('shopping', async () => {
    await page.getByRole('checkbox', { name: 'Cocher Thon au naturel', exact: true }).click();
    await page.waitForFunction(
      () => !document.getAnimations().some((a) => a.playState === 'running'),
    );
    const row = page
      .locator('.shopping-row')
      .filter({ has: page.getByText('Thon au naturel', { exact: true }) });
    await row.locator('summary').click();
    await row
      .getByRole('button', { name: 'Supprimer Thon au naturel des courses', exact: true })
      .click();
    await page.locator('.shopping-undo').waitFor();
  });
  await page.locator('.mobile-nav button').nth(1).click();
  await page.waitForFunction(
    () => !document.getAnimations().some((a) => a.playState === 'running'),
  );
  await page.locator('.manual-code summary').click();
  await page.locator('#barcode').fill('8076802085738');
  await record('scanner', async () => {
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    await page.locator('.last-product').waitFor();
    await page.getByRole('button', { name: 'Augmenter la quantité du dernier scan' }).click();
    await page.getByRole('button', { name: 'Annuler la dernière opération' }).click();
    await page.getByRole('button', { name: 'Continuer à scanner' }).click();
  });
  if (!metricsOnly) await context.tracing.stop({ path: `.tmp/motion-${label}-${rate}.zip` });
  const retained = new Set(results.flatMap((result) => result.frames.map((frame) => frame.file)));
  for (const file of await readdir(output)) {
    if (/^(navigation|sheet|quantity|shopping|scanner)-\d+\.jpg$/.test(file) && !retained.has(file))
      await unlink(resolve(output, file));
  }
  if (!metricsOnly)
    await writeFile(
      `${output}/README.md`,
      `# ${label} · CPU ×${rate}\n\n375 × 812, Maison, Chrome ${await browser.version()}. Successive captured frames, in capture order; times are relative to the first capture in each scenario. These are sparse temporal samples, not a 60 FPS video. See [raw timings](timings.json).\n\n` +
        results
          .map(
            (result) =>
              `## ${result.name}\n\n| ${result.frames.map((frame) => `${Math.round(frame.time - result.frames[0].time)} ms`).join(' | ')} |\n| ${result.frames.map(() => '---').join(' | ')} |\n| ${result.frames.map((frame) => `<img src="${frame.file}" width="150" alt="${result.name} at ${Math.round(frame.time - result.frames[0].time)} ms">`).join(' | ')} |\n`,
          )
          .join('\n'),
    );
  await writeFile(
    `${output}/timings.json`,
    JSON.stringify(
      {
        browser: await browser.version(),
        viewport: { width: 375, height: 812 },
        cpuRate: rate,
        label,
        source: process.argv.includes('--baseline-root')
          ? 'decf2c4b004590c588ea5726f3a22d74db3031c1'
          : 'Phase B working tree',
        conditions: metricsOnly
          ? 'Headless desktop Chrome; local Vite; no screenshots/tracing; synthetic demo; Playwright/CDP input overhead included.'
          : 'Headless desktop Chrome; local Vite; screenshots/tracing enabled; synthetic demo. Capture overhead included.',
        results,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`${label}, CPU ${rate}: recorded ${results.length} temporal scenarios in ${output}`);
  await context.close();
} finally {
  await browser?.close();
  server.kill();
}
