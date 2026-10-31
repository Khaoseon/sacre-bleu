import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  openSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
  rmSync,
  realpathSync,
} from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { emitKeypressEvents } from 'node:readline';
import { randomUUID } from 'node:crypto';
import {
  MAX_BYTES,
  sha256,
  outsideGit,
  packArchive,
  unpackArchive,
  findGpg,
  createGpgHome,
  equalSecrets,
} from './backup-archive.mjs';
import { backupPlan, fingerprintSQL, sameFingerprint } from './backup-plan.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    destination: { type: 'string' },
    archive: { type: 'string' },
    'project-ref': { type: 'string' },
    'before-phase4': { type: 'boolean', default: false },
    'before-lookup-budget': { type: 'boolean', default: false },
    'before-v1-conflicts': { type: 'boolean', default: false },
    'before-phase5': { type: 'boolean', default: false },
    'before-photos': { type: 'boolean', default: false },
  },
});
const command = positionals[0];
if (!['create', 'verify', 'extract'].includes(command) || positionals.length !== 1)
  throw new Error(
    'Usage : create --destination CHEMIN --project-ref REF [--before-phase4 | --before-lookup-budget | --before-v1-conflicts | --before-phase5 | --before-photos] | verify --archive FICHIER | extract --archive FICHIER --destination DOSSIER_NEUF',
  );
process.chdir(root);
if (!process.stdin.isTTY || !process.stdout.isTTY)
  throw new Error(
    'Lancer dans votre terminal personnel interactif. Aucun mot de passe par argument, fichier ou variable d’environnement.',
  );

function capture(label, binary, args) {
  const result = spawnSync(binary, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: MAX_BYTES,
    timeout: 180000,
  });
  if (result.status !== 0)
    throw new Error(
      `${label} impossible (code ${result.status ?? 'interrompu'}). Diagnostic brut non affiché pour protéger les données.`,
    );
  return result.stdout;
}
function durableWrite(path, bytes) {
  const fd = openSync(path, 'wx', 0o600);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function password(prompt) {
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  const previousRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolvePassword, rejectPassword) => {
    const chars = [];
    function finish(error) {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(!!previousRaw);
      process.stdin.pause();
      process.stdout.write('\n');
      const result = Buffer.concat(chars);
      chars.forEach((char) => char.fill(0));
      if (error) {
        result.fill(0);
        rejectPassword(new Error('Saisie annulée.'));
      } else resolvePassword(result);
    }
    function onKey(text, key = {}) {
      if ((key.ctrl && key.name === 'c') || key.name === 'escape') return finish(true);
      if (key.name === 'return' || key.name === 'enter') return finish(false);
      if (key.name === 'backspace') {
        chars.pop()?.fill(0);
        return;
      }
      if (key.ctrl && key.name === 'u') {
        chars.splice(0).forEach((char) => char.fill(0));
        return;
      }
      if (!key.ctrl && !key.meta && text && !/[\x00-\x1f\x7f]/.test(text))
        chars.push(Buffer.from(text, 'utf8'));
    }
    process.stdin.on('keypress', onKey);
  });
}
async function newPassword() {
  console.log(
    'Choisissez une longue phrase secrète unique (au moins 20 caractères, idéalement six mots aléatoires). Conservez-la séparément dans votre gestionnaire de mots de passe.',
  );
  const first = await password('Mot de passe de chiffrement (saisie invisible) : ');
  const second = await password('Confirmez le mot de passe (saisie invisible) : ');
  try {
    if ([...first.toString('utf8')].length < 20 || !equalSecrets(first, second))
      throw new Error('Phrases trop courtes ou différentes ; aucun export effectué.');
    return first;
  } catch (error) {
    first.fill(0);
    throw error;
  } finally {
    second.fill(0);
  }
}
async function decode(gpg, archive) {
  const secret = await password(
    'Ressaisissez le mot de passe pour vérifier/déchiffrer (saisie invisible) : ',
  );
  let bytes;
  try {
    bytes = gpg.decrypt(archive, secret);
    return { data: unpackArchive(bytes), digest: sha256(bytes) };
  } finally {
    secret.fill(0);
    bytes?.fill(0);
  }
}

const recoveryGuide = `# Récupération de la réserve\n\nCette archive contient un dump SQL et les migrations, pas de restauration automatique.\n1. Vérifier/déchiffrer avec le script cloud-backup.mjs et GnuPG 2.4+ ; protéger les fichiers SQL extraits.\n2. Recréer une cible Supabase NEUVE compatible PostgreSQL/Auth ; ne jamais réinitialiser la production.\n3. Appliquer les migrations versionnées de l'archive ; schema.sql est une référence, pas un second schéma à appliquer.\n4. Restaurer data.sql en une transaction avec psql, ON_ERROR_STOP=1 et session_replication_role=replica pendant l'import, puis origin. Mot de passe DB uniquement à l'invite.\n5. Conserver ensemble auth.users/auth.identities et leurs UUID ; aucune session ou refresh token sauvegardé.\n6. Vérifier liens, quantités, membres, grants et RLS ; reconfigurer séparément Auth, SMTP et URLs avec de nouveaux secrets de plateforme.\nVoir docs/BACKUP.md au commit indiqué dans les métadonnées pour la procédure éprouvée en phase 2C.\nNe pas exécuter de SQL avant d'avoir confirmé la cible neuve.\n`;

let gpg, secret, packed, encrypted, partial, staging;
try {
  const tool = findGpg();
  if (command === 'create') {
    if (!values.destination || !/^[a-z]{20}$/.test(values['project-ref'] ?? ''))
      throw new Error('Destination absolue et référence de projet explicite requises.');
    const destination = outsideGit(values.destination, root);
    const projectRef = values['project-ref'];
    if (readFileSync('supabase/.temp/project-ref', 'utf8').trim() !== projectRef)
      throw new Error('Le projet lié ne correspond pas au projet demandé.');
    const cli = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
    const cliEntry = resolve('node_modules/supabase', cli.bin.supabase);
    const supabase = (label, ...args) =>
      capture(label, process.execPath, [cliEntry, ...args, '--agent', 'no']);
    console.log(`Sauvegarde en lecture seule du projet ${projectRef} vers ${destination}.`);
    secret = await newPassword();
    const history = supabase(
      'Historique migrations',
      'migration',
      'list',
      '--linked',
      '--output-format',
      'json',
    );
    const migrations = JSON.parse(history).migrations;
    const gitCommit = capture('Révision Git', 'git', ['rev-parse', 'HEAD']).trim();
    const trackedSource = (source) =>
      capture('Source versionnée', 'git', ['show', `${gitCommit}:${source}`]);
    const migrationFiles = capture('Inventaire versionné', 'git', [
      'ls-tree',
      '-r',
      '--name-only',
      gitCommit,
      'supabase/migrations',
    ])
      .trim()
      .split(/\r?\n/)
      .map((name) => basename(name))
      .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
      .sort();
    const plan = backupPlan(
      migrations,
      migrationFiles,
      values['before-phase4'],
      values['before-lookup-budget'],
      values['before-v1-conflicts'],
      values['before-phase5'],
      values['before-photos'],
    );
    const sourceFingerprint = () => {
      const result = JSON.parse(
        supabase(
          'Empreintes source',
          'db',
          'query',
          '--linked',
          fingerprintSQL(plan.tables),
          '--output-format',
          'json',
        ),
      );
      const fingerprint = (Array.isArray(result) ? result : result.rows)?.[0]?.fingerprint;
      if (!sameFingerprint(fingerprint, fingerprint, plan.tables))
        throw new Error('Empreintes source incomplètes.');
      return fingerprint;
    };
    const beforeFingerprint = sourceFingerprint();
    const scopeSQL =
      "select jsonb_build_object('postgres',current_setting('server_version'),'pgcrypto',(select extversion from pg_extension where extname='pgcrypto'),'auth_tables',(select jsonb_agg(tablename order by tablename) from pg_tables where schemaname='auth'),'unsupported_identities',(select count(*) from auth.identities where provider <> 'email'),'mfa_factors',(select count(*) from auth.mfa_factors),'external_auth_dependencies',(select count(*) from pg_constraint where contype='f' and conrelid in ('auth.users'::regclass,'auth.identities'::regclass) and confrelid not in ('auth.users'::regclass,'auth.identities'::regclass))) as scope";
    const scopeResult = JSON.parse(
      supabase(
        'Périmètre de sauvegarde',
        'db',
        'query',
        '--linked',
        scopeSQL,
        '--output-format',
        'json',
      ),
    );
    const scope = (Array.isArray(scopeResult) ? scopeResult : scopeResult.rows)?.[0]?.scope;
    if (
      !scope ||
      scope.unsupported_identities ||
      scope.mfa_factors ||
      scope.external_auth_dependencies ||
      !Array.isArray(scope.auth_tables)
    )
      throw new Error(
        'Le périmètre Auth dépasse email/mot de passe validé en 2C : arrêter et examiner.',
      );
    const excludes = scope.auth_tables.filter((name) => !['users', 'identities'].includes(name));
    if (excludes.some((name) => !/^[a-z_][a-z0-9_]*$/.test(name)))
      throw new Error('Nom de table Auth inattendu.');
    const args = [
      'db',
      'dump',
      '--linked',
      '--schema',
      'public,private,auth',
      '--data-only',
      '--use-copy',
    ];
    excludes.forEach((name) => args.push('--exclude', `auth.${name}`));
    console.log('Export des données nécessaires en mémoire ; aucun dump en clair sur disque.');
    const dataSQL = supabase('Export des données', ...args);
    const expectedTables = plan.tables;
    const copiedTables = [...dataSQL.matchAll(/^COPY\s+"?(\w+)"?\."?(\w+)"?\s*\(/gm)]
      .map((match) => `${match[1]}.${match[2]}`)
      .sort();
    if (JSON.stringify(copiedTables) !== JSON.stringify(expectedTables))
      throw new Error('Le périmètre SQL exporté diffère des tables attendues.');
    const files = {
      'data.sql': dataSQL,
      'schema.sql': supabase(
        'Export du schéma',
        'db',
        'dump',
        '--linked',
        '--schema',
        'public,private',
      ),
      'migration-history.json': history,
      'RECUPERATION.md': recoveryGuide,
    };
    plan.files.forEach((name) => {
      files[`migrations/${name}`] = trackedSource(`supabase/migrations/${name}`);
    });
    for (const [name, source] of Object.entries({
      'local.toml': 'supabase/config.toml',
      'cloud.toml': 'config/cloud/supabase/config.toml',
      'cloud-email.toml': 'config/cloud-email/supabase/config.toml',
      'confirmation.html': 'supabase/templates/confirmation.html',
    }))
      files[`configuration/${name}`] = trackedSource(source);
    const finalHistory = JSON.parse(
      supabase('Relecture historique', 'migration', 'list', '--linked', '--output-format', 'json'),
    ).migrations;
    if (
      !Array.isArray(finalHistory) ||
      JSON.stringify(finalHistory.map((row) => [row.local, row.remote])) !==
        JSON.stringify(migrations.map((row) => [row.local, row.remote]))
    )
      throw new Error('Historique modifié pendant l’export : recommencer au calme.');
    const databaseFingerprint = sourceFingerprint();
    if (!sameFingerprint(beforeFingerprint, databaseFingerprint, plan.tables))
      throw new Error(
        'La base a changé pendant l’export. Suspendre les deux sessions et recommencer.',
      );
    const metadata = {
      createdAt: new Date().toISOString(),
      projectRef,
      gitCommit,
      appliedMigrations: plan.appliedVersions,
      pendingMigration: plan.pendingVersion,
      pendingMigrations: plan.pendingVersions,
      databaseFingerprint,
      postgres: scope.postgres,
      pgcrypto: scope.pgcrypto,
      supabaseCLI: cli.version,
      gpg: tool.version,
      authIncluded: ['auth.users', 'auth.identities'],
      authExcluded: excludes.map((name) => `auth.${name}`),
      encryption: 'OpenPGP AES-256, S2K SHA-512 itéré et salé',
    };
    packed = packArchive(files, metadata);
    mkdirSync(destination, { recursive: true, mode: 0o700 });
    if (outsideGit(destination, root) !== destination) throw new Error('Destination modifiée.');
    gpg = createGpgHome(destination, tool);
    const name = `app-reserve-${metadata.createdAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')}-${randomUUID().slice(0, 8)}.json.gz.gpg`;
    const archive = join(destination, name);
    partial = join(destination, '.' + name + '.partial');
    encrypted = gpg.encrypt(packed, secret);
    secret.fill(0);
    secret = null;
    durableWrite(partial, encrypted);
    encrypted.fill(0);
    encrypted = null;
    console.log(
      'Archive chiffrée écrite. Vérification indépendante avec ressaisie du mot de passe.',
    );
    const verified = await decode(gpg, partial);
    if (verified.digest !== sha256(packed))
      throw new Error('Le déchiffrement diffère de l’export initial.');
    const archiveHash = sha256(readFileSync(partial));
    renameSync(partial, archive);
    partial = null;
    durableWrite(archive + '.sha256', `${archiveHash}  ${name}\n`);
    durableWrite(
      archive + '.verification.json',
      JSON.stringify(
        {
          format: 'app-reserve-backup-verification',
          version: 1,
          archive: name,
          createdAt: metadata.createdAt,
          verifiedAt: new Date().toISOString(),
          archiveSha256: archiveHash,
          projectRef,
          appliedMigrations: plan.appliedVersions,
          pendingMigration: plan.pendingVersion,
          pendingMigrations: plan.pendingVersions,
          databaseFingerprint,
          openPGPIntegrity: true,
          decryptedPayloadMatchesExport: true,
          internalFileHashesVerified: true,
          fileCount: verified.data.manifest.length,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      `Sauvegarde vérifiée : ${archive}\nSHA-256 : ${archiveHash}\nConservez le mot de passe séparément et dupliquez l’archive sur un autre support.`,
    );
  } else {
    if (!values.archive) throw new Error('Archive absolue requise.');
    const archive = outsideGit(values.archive, root);
    const checksumFile = archive + '.sha256';
    if (
      !existsSync(checksumFile) ||
      readFileSync(checksumFile, 'utf8').split(/\s+/)[0] !== sha256(readFileSync(archive))
    )
      throw new Error('Empreinte de l’archive absente ou différente.');
    staging = mkdtempSync(join(dirname(archive), '.app-reserve-check-'));
    gpg = createGpgHome(staging, tool);
    const verified = await decode(gpg, archive);
    if (command === 'extract') {
      if (!values.destination) throw new Error('Dossier neuf de récupération requis.');
      const destination = outsideGit(values.destination, root);
      if (existsSync(destination))
        throw new Error('Le dossier de récupération doit être neuf ; aucun écrasement.');
      mkdirSync(destination, { recursive: true, mode: 0o700 });
      for (const [name, content] of Object.entries(verified.data.files)) {
        const target = join(destination, ...name.split('/'));
        mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
        durableWrite(target, content);
      }
      durableWrite(
        join(destination, 'manifest.json'),
        JSON.stringify(
          { metadata: verified.data.metadata, files: verified.data.manifest },
          null,
          2,
        ),
      );
      console.log(
        `Fichiers récupérés : ${destination}. Ils sont confidentiels et déchiffrés ; aucune base n’a été modifiée.`,
      );
    } else
      console.log(
        'Vérification réussie : SHA-256, intégrité OpenPGP et empreintes internes ; aucun fichier déchiffré enregistré.',
      );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  secret?.fill(0);
  packed?.fill(0);
  encrypted?.fill(0);
  if (partial && existsSync(partial)) unlinkSync(partial);
  try {
    gpg?.close();
  } catch {
    console.error('Nettoyage des métadonnées GnuPG à vérifier (aucun mot de passe en fichier).');
    process.exitCode = 1;
  }
  if (staging) {
    const actual = realpathSync(staging);
    if (actual !== resolve(staging) || !basename(actual).startsWith('.app-reserve-check-'))
      throw new Error('Nettoyage inattendu.');
    rmSync(actual, { recursive: true, force: true });
  }
}
