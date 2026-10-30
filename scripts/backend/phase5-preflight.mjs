// No write SQL, no fixture and no production mutation in this command.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fingerprintSQL, sameFingerprint } from './backup-plan.mjs';
const project = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
if (project !== 'uznbnihmdzxdnlxanjcl') throw new Error('Unexpected linked project');
const cli = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
function query(sql, isFile = false) {
  let raw;
  try {
    raw = execFileSync(
      process.execPath,
      [
        resolve('node_modules/supabase', cli.bin.supabase),
        'db',
        'query',
        '--linked',
        ...(isFile ? ['--file', sql] : [sql]),
        '--output-format',
        'json',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch {
    throw new Error('Read-only preflight query failed (private output suppressed)');
  }
  const result = JSON.parse(raw);
  return (Array.isArray(result) ? result : result.rows)?.[0];
}
const { audit } = query('scripts/backend/phase5-audit.sql', true);
if (!audit || audit.violations.length || audit.postgres_major !== 17)
  throw new Error('Audit incompatible avec la livraison phase 5');
const tables = [
  'auth.users',
  'auth.identities',
  'public.reserves',
  'public.reserve_members',
  'public.products',
  'public.product_stock',
  'public.shopping_items',
  'private.invitations',
  'private.requests',
  'private.scan_operations',
  'private.product_lookup_gate',
].sort();
const { fingerprint } = query(fingerprintSQL(tables));
if (!sameFingerprint(fingerprint, fingerprint, tables)) throw new Error('Incomplete fingerprints');
mkdirSync('.tmp/phase5', { recursive: true });
writeFileSync(
  '.tmp/phase5/preflight-private.json',
  JSON.stringify({ at: new Date().toISOString(), project, audit, fingerprint }),
);
console.log(
  JSON.stringify({
    target: project,
    postgresMajor: audit.postgres_major,
    violations: audit.violations,
    restorePresent: audit.restore_present,
    confirmedAccounts: audit.confirmed_accounts,
    reserves: audit.reserves,
    memberships: audit.memberships,
    privateFingerprintsRecorded: tables.length,
  }),
);
