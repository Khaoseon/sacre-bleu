import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instanceConfig } from './instance-config.mjs';
test('independent config uses closed signup and exact instance origins', () => {
  const c = instanceConfig('abcdefghijklmnopqrst', 'https://pantry-example.pages.dev');
  assert.match(c.auth, /enable_signup = false/);
  assert.ok(
    c.auth.includes(
      'additional_redirect_urls = ["https://pantry-example.pages.dev/auth/callback"]',
    ),
  );
  assert.equal(c.edge, 'OFF_ALLOWED_ORIGINS=https://pantry-example.pages.dev\n');
  assert.ok(!JSON.stringify(c).match(/uznbnih|sacre-bleu.pages.dev|\*/));
});
test('rejects invalid refs and non-exact or insecure origins', () => {
  for (const origin of [
    'http://example.test',
    'https://example.test/path',
    'https://u:p@example.test',
    'https://example.test?x=1',
    'https://example.test#x',
    'https://example.test:444',
  ])
    assert.throws(() => instanceConfig('abcdefghijklmnopqrst', origin));
  assert.throws(() => instanceConfig('other', 'https://example.test'));
});

import { initializeReserve } from './instance-init.mjs';
test('bootstrap refuses unconfirmed accounts and never writes for existing members', async () => {
  const fake = {
    auth: { getUser: async () => ({ data: { user: { email_confirmed_at: null } } }) },
  };
  await assert.rejects(initializeReserve(fake, 'id'), /Confirmed/);
  fake.auth.getUser = async () => ({ data: { user: { email_confirmed_at: 'date' } } });
  fake.from = () => ({ select: async () => ({ data: [{ id: 'existing' }] }) });
  assert.match(await initializeReserve(fake, 'id'), /nothing created/);
});
test('bootstrap uses the authenticated RPC and preserves the request ID', async () => {
  const fake = {
    auth: { getUser: async () => ({ data: { user: { email_confirmed_at: 'date' } } }) },
    from: () => ({ select: async () => ({ data: [] }) }),
    rpc: async (name, args) => {
      assert.equal(name, 'create_reserve');
      assert.equal(args.p_request_id, 'same-id');
      return {};
    },
  };
  assert.match(await initializeReserve(fake, 'same-id'), /initialized/);
  fake.rpc = async () => ({ error: true });
  await assert.rejects(initializeReserve(fake, 'same-id'), /SAME request ID/);
});
