import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { assetPath, options } from './phone-serve.mjs';

test('aucune écoute publique ou implicite, seulement des IPv4 privées explicites', () => {
  const args = [
    '--host',
    '192.168.1.10',
    '--cert',
    'cert.pem',
    '--key',
    'key.pem',
    '--allow',
    '192.168.1.11',
  ];
  assert.equal(options(args).host, '192.168.1.10');
  assert.throws(() => options([]));
  for (const address of ['0.0.0.0', '127.0.0.1', '8.8.8.8', '192.168.1.999', '172.32.0.1', '::'])
    assert.throws(() => options(args.map((value) => (value === '192.168.1.10' ? address : value))));
  assert.throws(() => options(args.slice(0, -2)));
  assert.throws(() => options([...args, '--unknown', 'yes']));
  assert.equal(options([...args, '--allow', '192.168.1.12']).allowed.length, 2);
});
test('le serveur ne peut servir ni secrets, ni sources, ni chemins hors du build', () => {
  const root = resolve('dist-cloud');
  assert.equal(assetPath(root, '/assets/app.js'), resolve(root, 'assets/app.js'));
  for (const path of [
    '/.env',
    '/%2eenv',
    '/%2e%2e%2fsecret.pem',
    '/%5c..%5c.env',
    '/%00',
    '/%zz',
    '/.git/config',
  ])
    assert.equal(assetPath(root, path), null);
});
