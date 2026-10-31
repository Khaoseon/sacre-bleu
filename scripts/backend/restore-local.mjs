import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'project-ref': { type: 'string' } },
});
const expectedProject = values['project-ref'];
if (!/^[a-z]{20}$/.test(expectedProject ?? '')) throw new Error('Explicit --project-ref required');

const container = 'sacre-bleu-v1-archive-restore';
import { outsideGit } from './backup-archive.mjs';
import { validateRestoreHistory } from './restore-import.mjs';
if (positionals.length !== 1)
  throw new Error(
    'Usage: npm run backup:restore:local -- ABSOLUTE_PRIVATE_EXTRACTION_FOLDER --project-ref EXPECTED_SOURCE_REF',
  );
const folder = outsideGit(positionals[0], process.cwd());
const manifest = JSON.parse(readFileSync(folder + '/manifest.json', 'utf8'));
const metadata = manifest.metadata;
const { createHash } = await import('node:crypto');
for (const entry of manifest.files) {
  if (
    !/^(data[.]sql|schema[.]sql|migration-history[.]json|RECUPERATION[.]md|migrations[/][a-z0-9_]+[.]sql|configuration[/][a-z0-9_.-]+)$/.test(
      entry.name,
    )
  )
    throw new Error('Unexpected archive path');
  const bytes = readFileSync(folder + '/' + entry.name);
  if (
    bytes.length !== entry.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== entry.sha256
  )
    throw new Error('Extracted file integrity mismatch');
}
if (metadata.projectRef !== expectedProject) throw new Error('Unexpected archive source');
const migrationFiles = readdirSync(folder + '/migrations').sort();
validateRestoreHistory(metadata.appliedMigrations, migrationFiles);
if (
  JSON.stringify(migrationFiles) !==
  JSON.stringify(
    manifest.files
      .filter((f) => f.name.startsWith('migrations/'))
      .map((f) => f.name.slice('migrations/'.length))
      .sort(),
  )
)
  throw new Error('Unverified migration file');
const project = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
if (project !== expectedProject) throw new Error('Projet lié inattendu.');
function run(command, args, input) {
  const result = spawnSync(command, args, {
    input,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 180000,
  });
  if (result.status !== 0) {
    // Never print stdout or raw error objects: dumps contain private data.
    const raw = result.stderr;
    const error = new Error('Private operation failed');
    error.diagnostic = {
      sqlstate: raw.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1] ?? null,
      category:
        [
          'permission denied',
          'does not exist',
          'already exists',
          'violates',
          'extra data',
          'missing data',
          'invalid command',
          'unrecognized configuration parameter',
          'invalid input syntax',
        ].find((s) => raw.includes(s)) ?? 'other',
      safeObjects: [
        'auth.users',
        'auth.identities',
        'public.products',
        'product_lookup_gate',
        'session_replication_role',
        'transaction_timeout',
        'restrict',
        'supabase_admin',
        'supabase_auth_admin',
      ].filter((s) => raw.includes(s)),
    };
    error.privateRaw = raw;
    throw error;
  }
  return result.stdout;
}
function local(sql) {
  return run(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      'VERBOSITY=verbose',
      '-U',
      'postgres',
      '-d',
      'restore_2c',
    ],
    sql,
  );
}
const tables = [
  'public.reserves',
  'public.reserve_members',
  'public.products',
  'public.product_stock',
  'public.shopping_items',
  'private.invitations',
  'private.requests',
  'private.scan_operations',
  'auth.users',
  'auth.identities',
  ...(metadata.appliedMigrations.includes('20261028000100') ? ['private.product_lookup_gate'] : []),
  ...(metadata.appliedMigrations.includes('20261031000100')
    ? ['private.product_photos', 'private.photo_rate']
    : []),
];
const fingerprints =
  'select jsonb_build_object(' +
  tables
    .map(
      (table) =>
        `'${table}',(select jsonb_build_object('rows',count(*),'digest',encode(extensions.digest(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text collate "C"),'[]'::jsonb)::text,'sha256'),'hex')) from ${table} t)`,
    )
    .join(',') +
  ') as fingerprints;';
writeFileSync('.tmp/restore-fingerprints.sql', fingerprints);
let created = false;
try {
  const exists = spawnSync('docker', ['container', 'inspect', container], { encoding: 'utf8' });
  if (exists.status === 0)
    throw new Error('Conteneur de répétition déjà présent : arrêt sans modification.');
  const image = run('docker', [
    'inspect',
    '--format',
    '{{.Config.Image}}',
    'supabase_db_app_reserve',
  ]).trim();
  run('docker', [
    'run',
    '--rm',
    '--name',
    container,
    '--network',
    'none',
    '--log-driver',
    'none',
    '--user',
    'postgres',
    '--env',
    'PGDATA=/var/lib/postgresql/data/restore',
    '--env',
    'PGHOST=/tmp',
    '--tmpfs',
    '/var/lib/postgresql/data:rw,mode=1777',
    '--entrypoint',
    '/bin/sh',
    '--detach',
    image,
    '-c',
    'initdb -D "$PGDATA" --username=postgres --auth-local=trust --auth-host=reject >/dev/null && exec postgres -D "$PGDATA" -c listen_addresses= -c unix_socket_directories=/tmp',
  ]);
  created = true;
  console.log('Cible jetable créée en RAM, sans réseau ni port publié.');

  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const result = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], {
      encoding: 'utf8',
    });
    if (result.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('PostgreSQL jetable indisponible.');
  console.log('PostgreSQL jetable prêt sur socket interne uniquement.');
  const isolation = JSON.parse(run('docker', ['inspect', container]))[0];
  if (
    isolation.HostConfig.NetworkMode !== 'none' ||
    Object.keys(isolation.HostConfig.PortBindings ?? {}).length
  )
    throw new Error('Non-isolated target rejected');
  const dump = readFileSync(folder + '/data.sql', 'utf8');
  run('docker', [
    'exec',
    container,
    'createdb',
    '-U',
    'postgres',
    '--template=template0',
    'restore_2c',
  ]);
  local(
    `do $$ declare n text; begin foreach n in array array['anon','authenticated','service_role','supabase_auth_admin','supabase_admin','authenticator'] loop if not exists(select 1 from pg_roles where rolname=n) then execute format('create role %I nologin',n); end if; end loop; end $$; create schema extensions; create extension pgcrypto with schema extensions;`,
  );
  const authSchema = run('docker', [
    'exec',
    'supabase_db_app_reserve',
    'pg_dump',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '--schema-only',
    '--schema=auth',
    '--no-owner',
    '--no-acl',
  ]);
  local(authSchema);
  local('grant usage on schema auth to anon, authenticated, service_role;');
  for (const migration of readdirSync(folder + '/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    local(readFileSync(resolve(folder, 'migrations', migration), 'utf8'));
  console.log('Schéma Auth local et migrations applicatives recréés sur base vierge.');
  const { restoreImportSQL } = await import('./restore-import.mjs');
  // Full import followed by a deliberate failure must roll back every inserted row.
  let rolledBack = false;
  try {
    local(restoreImportSQL(dump + '\nSELECT 1/0;'));
  } catch (error) {
    if (error.diagnostic?.sqlstate !== '22012') throw error;
    const counts = local(
      'select (select count(*) from auth.users)+(select count(*) from auth.identities)+(select count(*) from public.reserves)+(select count(*) from public.reserve_members)+(select count(*) from public.products)+(select count(*) from public.product_stock)+(select count(*) from public.shopping_items)+(select count(*) from private.requests)+(select count(*) from private.invitations)+(select count(*) from private.scan_operations)',
    ).trim();
    const gate = local(
      "select count(*) from private.product_lookup_gate where singleton and next_allowed_at='-infinity'::timestamptz",
    ).trim();
    if (counts !== '0' || gate !== '1') throw new Error('Rollback regression failed');
    rolledBack = true;
  }
  if (!rolledBack) throw new Error('Injected failure did not reject');
  console.log(
    'Rollback regression: complete import then forced error leaves baseline intact, no partial rows.',
  );
  try {
    local(restoreImportSQL(dump));
  } catch (error) {
    const empty =
      local(
        'select (select count(*) from auth.users)+(select count(*) from auth.identities)+(select count(*) from public.reserves)+(select count(*) from public.reserve_members)+(select count(*) from public.products)+(select count(*) from public.product_stock)+(select count(*) from public.shopping_items)+(select count(*) from private.requests)+(select count(*) from private.invitations)+(select count(*) from private.scan_operations)',
      ).trim() === '0';
    console.log(
      JSON.stringify({
        stage: 'data import',
        ...error.diagnostic,
        failedImportLeavesNoRows: empty,
      }),
    );
    throw error;
  }
  console.log('Import des données réussi en une transaction.');

  const { fingerprintSQL, sameFingerprint } = await import('./backup-plan.mjs');
  const archiveTables = Object.keys(metadata.databaseFingerprint).sort();
  const restored = JSON.parse(local(fingerprintSQL(archiveTables)));
  if (!sameFingerprint(metadata.databaseFingerprint, restored, archiveTables))
    throw new Error('Restored data differs from archive');
  let refusedNonEmpty = false;
  try {
    local(restoreImportSQL(dump));
  } catch (error) {
    if (error.diagnostic?.sqlstate !== 'P0001') throw error;
    refusedNonEmpty = true;
  }
  if (
    !refusedNonEmpty ||
    !sameFingerprint(
      metadata.databaseFingerprint,
      JSON.parse(local(fingerprintSQL(archiveTables))),
      archiveTables,
    )
  )
    throw new Error('Non-empty target protection failed');
  console.log(
    'Safety regression: non-empty target refused before deletion; all fingerprints unchanged.',
  );
  const counts = JSON.parse(
    local(
      "select jsonb_build_object('users',(select count(*) from auth.users),'reserves',(select count(*) from public.reserves),'memberships',(select count(*) from public.reserve_members))",
    ),
  );
  if (counts.users !== 2 || counts.reserves !== 1 || counts.memberships !== 2)
    throw new Error('Unexpected restored counts');
  console.log(
    'Restored archive: eleven table fingerprints identical; two accounts, one reserve, two memberships.',
  );
  const audit = JSON.parse(local(readFileSync('scripts/backend/cloud-audit.sql', 'utf8')));
  if (audit.violations.length) throw new Error('Audit des privilèges de la cible non conforme.');
  const integrity = JSON.parse(
    local(
      `select jsonb_build_object('orphan_members',(select count(*) from public.reserve_members m left join auth.users u on u.id=m.user_id where u.id is null),'invalid_owners',(select count(*) from public.reserves r where not exists(select 1 from public.reserve_members m where m.reserve_id=r.id and m.user_id=r.owner_id and m.role='owner')),'missing_stock',(select count(*) from public.products p left join public.product_stock s on s.product_id=p.id where s.product_id is null),'invalid_shopping',(select count(*) from public.shopping_items i left join public.products p on p.id=i.product_id and p.reserve_id=i.reserve_id where i.product_id is not null and p.id is null),'replication_role',current_setting('session_replication_role'))`,
    ),
  );
  if (
    integrity.orphan_members ||
    integrity.invalid_owners ||
    integrity.missing_stock ||
    integrity.invalid_shopping ||
    integrity.replication_role !== 'origin'
  )
    throw new Error('Intégrité restaurée non conforme.');
  console.log('RLS, grants, liens et retour à origin conformes.');
  writeFileSync(
    '.tmp/v1-archive-restore-result.json',
    JSON.stringify(
      {
        success: true,
        sourceProject: project,
        postgresImage: image,
        tableCount: archiveTables.length,
        exactDataMatch: true,
        auditViolations: 0,
        integrity,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.log(
    JSON.stringify(
      error.diagnostic ?? { error: 'isolated restore failed; raw diagnostic withheld' },
    ),
  );
  process.exitCode = 1;
} finally {
  if (created) {
    const stopped = spawnSync('docker', ['rm', '--force', '--volumes', container], {
      encoding: 'utf8',
    });
    console.log(
      stopped.status === 0
        ? 'Conteneur et données de répétition supprimés.'
        : 'Nettoyage de la cible jetable à vérifier.',
    );
    if (stopped.status !== 0) process.exitCode = 1;
  }
}
