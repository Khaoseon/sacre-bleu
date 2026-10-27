import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  outsideGit,
  packArchive,
  unpackArchive,
  findGpg,
  createGpgHome,
} from './backup-archive.mjs';

const files = {
  'data.sql': '-- Données synthétiques uniquement.\n',
  'schema.sql': '-- Schéma de test.\n',
  'migration-history.json': '[]',
  'migrations/20261026000100_example.sql': 'select 1;',
};
const metadata = { projectRef: 'abcdefghijklmnopqrst', createdAt: '2026-10-27T00:00:00Z' };
function tempDirectory() {
  const dir = mkdtempSync(join(tmpdir(), 'app-reserve-backup-test-'));
  return {
    dir,
    close() {
      assert.equal(dirname(realpathSync(dir)), realpathSync(tmpdir()));
      rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
  };
}
test('round trip preserves exact SQL contents and verifies every internal file', () => {
  const packed = packArchive(files, metadata);
  assert.deepEqual(unpackArchive(packed).files, files);
  const altered = JSON.parse(gunzipSync(packed).toString('utf8'));
  altered.files['data.sql'] += 'altered';
  assert.throws(() => unpackArchive(gzipSync(JSON.stringify(altered))), /manifeste/);
});
test('rejects path traversal, unexpected files and missing recovery files', () => {
  assert.throws(() => packArchive({ ...files, '../secret.txt': 'blocked' }, metadata));
  assert.throws(() => packArchive({ ...files, '.env.local': 'blocked' }, metadata));
  const altered = JSON.parse(gunzipSync(packArchive(files, metadata)).toString('utf8'));
  altered.manifest.push(altered.manifest[0]);
  assert.throws(() => unpackArchive(gzipSync(JSON.stringify(altered))), /manifeste/);
  assert.throws(() => unpackArchive(Buffer.from('not gzip')), /Archive illisible/);
});
test('refuses backup destinations in this repository or any other Git repository', () => {
  const repository = resolve('.');
  assert.throws(() => outsideGit(join(repository, 'backups'), repository), /hors du dépôt/);
  assert.throws(() => outsideGit('relative-backup', repository), /absolu/);
  const temp = tempDirectory();
  try {
    assert.equal(
      outsideGit(join(temp.dir, 'approved'), repository),
      join(realpathSync(temp.dir), 'approved'),
    );
    mkdirSync(join(temp.dir, '.git'));
    assert.throws(() => outsideGit(join(temp.dir, 'backup'), repository), /dépôt Git/);
  } finally {
    temp.close();
  }
});
test('real GnuPG round trip requires the correct secret and rejects corrupted ciphertext', () => {
  const temp = tempDirectory();
  const tool = findGpg();
  const gpg = createGpgHome(temp.dir, tool);
  const secret = randomBytes(32);
  // The passphrase FD is line-oriented, so use an ephemeral printable secret.
  const password = Buffer.from(secret.toString('base64url'));
  const archive = join(temp.dir, 'synthetic.gpg');
  const packed = packArchive(files, metadata);
  try {
    writeFileSync(archive, gpg.encrypt(packed, password));
    const decrypted = gpg.decrypt(archive, password);
    assert.deepEqual(unpackArchive(decrypted).files, files);
    decrypted.fill(0);
    const wrong = Buffer.from(randomBytes(32).toString('base64url'));
    try {
      assert.throws(() => gpg.decrypt(archive, wrong), /refusé/);
    } finally {
      wrong.fill(0);
    }
    const corrupted = readFileSync(archive);
    corrupted[corrupted.length - 1] ^= 1;
    writeFileSync(archive, corrupted);
    assert.throws(() => gpg.decrypt(archive, password), /refusé|Intégrité/);
  } finally {
    secret.fill(0);
    password.fill(0);
    packed.fill(0);
    gpg.close();
    temp.close();
  }
});
