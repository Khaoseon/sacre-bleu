import { createHash, timingSafeEqual } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

export const MAX_BYTES = 64 * 1024 * 1024;
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inside = (root, target) => {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
};
function canonical(path) {
  let parent = resolve(path);
  while (!existsSync(parent)) parent = dirname(parent);
  return resolve(realpathSync(parent), relative(parent, resolve(path)));
}
export function outsideGit(path, repository) {
  if (!isAbsolute(path)) throw new Error('Un chemin absolu hors Git est requis.');
  const target = canonical(path);
  if (inside(realpathSync(repository), target))
    throw new Error('La sauvegarde et les fichiers déchiffrés doivent rester hors du dépôt.');
  for (let parent = target; ; parent = dirname(parent)) {
    if (existsSync(join(parent, '.git')))
      throw new Error('Cet emplacement appartient à un dépôt Git.');
    if (parent === dirname(parent)) break;
  }
  return target;
}
const allowedName = (name) =>
  ['data.sql', 'schema.sql', 'migration-history.json', 'RECUPERATION.md'].includes(name) ||
  /^migrations\/\d{14}_[a-z0-9_]+\.sql$/.test(name) ||
  /^configuration\/(local\.toml|cloud\.toml|cloud-email\.toml|confirmation\.html)$/.test(name);

export function packArchive(files, metadata) {
  const manifest = Object.entries(files).map(([name, value]) => {
    if (!allowedName(name) || typeof value !== 'string')
      throw new Error('Fichier d’archive inattendu.');
    const bytes = Buffer.from(value, 'utf8');
    return { name, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const json = Buffer.from(
    JSON.stringify({ format: 'app-reserve-backup', version: 1, metadata, manifest, files }),
    'utf8',
  );
  if (json.length > MAX_BYTES)
    throw new Error('Archive trop volumineuse pour cette méthode en mémoire (64 Mio).');
  try {
    return gzipSync(json);
  } finally {
    json.fill(0);
  }
}
export function unpackArchive(compressed) {
  let bytes;
  try {
    bytes = gunzipSync(compressed, { maxOutputLength: MAX_BYTES });
    const data = JSON.parse(bytes.toString('utf8'));
    if (
      data.format !== 'app-reserve-backup' ||
      data.version !== 1 ||
      !Array.isArray(data.manifest) ||
      !data.files ||
      typeof data.files !== 'object' ||
      Array.isArray(data.files) ||
      !data.metadata ||
      typeof data.metadata.projectRef !== 'string'
    )
      throw new Error();
    const names = Object.keys(data.files);
    if (
      data.manifest.length !== names.length ||
      new Set(data.manifest.map((f) => f.name)).size !== names.length ||
      !names.includes('data.sql') ||
      !names.includes('schema.sql') ||
      !names.includes('migration-history.json') ||
      !names.some((name) => name.startsWith('migrations/'))
    )
      throw new Error();
    for (const entry of data.manifest) {
      if (!allowedName(entry.name) || typeof data.files[entry.name] !== 'string') throw new Error();
      const content = Buffer.from(data.files[entry.name], 'utf8');
      const valid = content.length === entry.bytes && sha256(content) === entry.sha256;
      content.fill(0);
      if (!valid) throw new Error();
    }
    return data;
  } catch {
    throw new Error('Archive illisible ou manifeste interne invalide.');
  } finally {
    bytes?.fill(0);
  }
}

const msysPath = (path) =>
  path
    .replaceAll('\\', '/')
    .replace(/^([A-Za-z]):\//, (_, drive) => '/' + drive.toLowerCase() + '/');
export function findGpg() {
  const candidates = [
    'C:/Program Files/Git/usr/bin/gpg.exe',
    'C:/Program Files (x86)/GnuPG/bin/gpg.exe',
    'C:/Program Files/GnuPG/bin/gpg.exe',
    'gpg',
  ];
  for (const binary of candidates) {
    const result = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 10000 });
    const version = result.stdout?.match(/gpg \(GnuPG\) (\d+)\.(\d+)\.\d+/);
    if (
      result.status === 0 &&
      version &&
      (Number(version[1]) > 2 || (Number(version[1]) === 2 && Number(version[2]) >= 4))
    )
      return {
        binary,
        version: version[0],
        msys: /[\\/]Git[\\/]usr[\\/]bin[\\/]gpg\.exe$/i.test(binary),
      };
  }
  throw new Error('GnuPG 2.4+ introuvable. Installer une distribution officielle maintenue.');
}
export function createGpgHome(directory, tool) {
  const home = mkdtempSync(join(directory, '.app-reserve-gpg-'));
  const gpgPath = (path) => (tool.msys ? msysPath(path) : path);
  const common = [
    '--no-options',
    '--homedir',
    gpgPath(home),
    '--batch',
    '--pinentry-mode',
    'loopback',
    '--no-symkey-cache',
    '--no-random-seed-file',
    '--passphrase-fd',
    '0',
    '--status-fd',
    '2',
  ];
  function invoke(args, password, content) {
    const input = Buffer.concat([password, Buffer.from('\n'), ...(content ? [content] : [])]);
    try {
      const result = spawnSync(tool.binary, [...common, ...args], {
        input,
        maxBuffer: MAX_BYTES,
        timeout: 180000,
      });
      const status = result.stderr?.toString('utf8') ?? '';
      if (result.status !== 0) {
        result.stdout?.fill(0);
        throw new Error('Chiffrement ou déchiffrement GnuPG refusé.');
      }
      return { bytes: result.stdout, status };
    } finally {
      input.fill(0);
    }
  }
  return {
    encrypt(content, password) {
      const result = invoke(
        [
          '--cipher-algo',
          'AES256',
          '--s2k-mode',
          '3',
          '--s2k-digest-algo',
          'SHA512',
          '--s2k-count',
          '65011712',
          '--compress-algo',
          'none',
          '--symmetric',
        ],
        password,
        content,
      );
      if (!result.status.includes('[GNUPG:] END_ENCRYPTION')) {
        result.bytes.fill(0);
        throw new Error('Chiffrement non confirmé.');
      }
      return result.bytes;
    },
    decrypt(archive, password) {
      const result = invoke(['--decrypt', gpgPath(archive)], password);
      if (
        !result.status.includes('[GNUPG:] DECRYPTION_OKAY') ||
        !result.status.includes('[GNUPG:] GOODMDC')
      ) {
        result.bytes.fill(0);
        throw new Error('Intégrité OpenPGP non confirmée.');
      }
      return result.bytes;
    },
    close() {
      const conf = tool.binary === 'gpg' ? 'gpgconf' : join(dirname(tool.binary), 'gpgconf.exe');
      spawnSync(conf, ['--homedir', gpgPath(home), '--kill', 'gpg-agent'], {
        timeout: 10000,
        stdio: 'ignore',
      });
      if (
        dirname(realpathSync(home)) !== realpathSync(directory) ||
        !home.includes('.app-reserve-gpg-')
      )
        throw new Error('Chemin de nettoyage GnuPG inattendu.');
      rmSync(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
  };
}
export function equalSecrets(a, b) {
  return a.length === b.length && timingSafeEqual(a, b);
}
