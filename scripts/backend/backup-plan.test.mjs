import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupPlan, fingerprintSQL, sameFingerprint } from './backup-plan.mjs';
const versions = ['20261026000100', '20261026000200', '20261026000300', '20261028000100'];
const files = versions.map((version) => `${version}_example.sql`);
const applied = versions.map((version) => ({ local: version, remote: version }));
const pending = applied.map((row, i) => ({ ...row, remote: i === 3 ? '' : row.remote }));

test('pre-phase-4 backup contains only the three applied migrations and ten source tables', () => {
  const plan = backupPlan(pending, files, true);
  assert.deepEqual(plan.files, files.slice(0, 3));
  assert.deepEqual(plan.appliedVersions, versions.slice(0, 3));
  assert.equal(plan.pendingVersion, versions[3]);
  assert.equal(plan.tables.length, 10);
  assert.equal(plan.tables.includes('private.product_lookup_gate'), false);
});
test('ordinary backups reject pending migrations and include the budget only after phase 4', () => {
  assert.throws(() => backupPlan(pending, files), /en attente/);
  assert.equal(backupPlan(applied, files).tables.length, 11);
  assert.equal(backupPlan(applied.slice(0, 3), files.slice(0, 3)).tables.length, 10);
  assert.throws(() => backupPlan(applied, files, true), /trois migrations/);
});
test('predeployment exception cannot hide divergence, missing history, unknown versions or extra pending migrations', () => {
  for (const rows of [
    pending.slice(1),
    pending.map((row, i) => (i === 1 ? { ...row, remote: '' } : row)),
    pending.map((row, i) => (i === 0 ? { ...row, remote: '20261026000999' } : row)),
    [...pending, { local: '20261029000100', remote: '' }],
    pending.map((row, i) => (i === 3 ? { local: '20261028000200', remote: '' } : row)),
    pending.map((row, i) => (i === 3 ? { local: '', remote: versions[3] } : row)),
  ])
    assert.throws(() => backupPlan(rows, files, true));
  assert.throws(() => backupPlan(pending, files.slice(1), true));
  assert.throws(() =>
    backupPlan(
      pending,
      files.map((file, i) => (i === 0 ? '../secret.sql' : file)),
      true,
    ),
  );
});
test('digest audit accepts only expected tables and detects changes or incomplete receipts', () => {
  const tables = backupPlan(pending, files, true).tables;
  const before = Object.fromEntries(tables.map((name) => [name, 'a'.repeat(64)]));
  assert.equal(sameFingerprint(before, { ...before }, tables), true);
  assert.equal(
    sameFingerprint(before, { ...before, 'public.products': 'b'.repeat(64) }, tables),
    false,
  );
  assert.equal(sameFingerprint(before, {}, tables), false);
  assert.equal(sameFingerprint(before, { ...before, unexpected: 'a'.repeat(64) }, tables), false);
  assert.equal(
    sameFingerprint({ ...before, 'public.products': 'not a digest' }, before, tables),
    false,
  );
  assert.throws(() => fingerprintSQL(['auth.users;delete from public.products']));
  assert.throws(() => fingerprintSQL(['auth.sessions']));
  assert.match(fingerprintSQL(tables), /sha256/);
  assert.match(fingerprintSQL(tables), /collate "C"/);
});
