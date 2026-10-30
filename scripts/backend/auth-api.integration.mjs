import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';

// Query local CLI status in memory. Never print or save the returned key material.
const cli = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
const status = JSON.parse(
  execFileSync(
    process.execPath,
    [resolve('node_modules/supabase', cli.bin.supabase), 'status', '-o', 'json'],
    { encoding: 'utf8' },
  ),
);
const api = new URL(status.API_URL);
if (api.hostname !== '127.0.0.1' && api.hostname !== 'localhost')
  throw new Error('Integration test refuses a non-local API');
const port = Number(
  readFileSync('supabase/config.toml', 'utf8').match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1],
);
if (!port) throw new Error('Missing local DB port');
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (!publicKey) throw new Error('No local public API key');
async function request(path, body, token) {
  const response = await fetch(new URL(path, api), {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: publicKey,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return { response, data };
}
async function success(path, body, token) {
  const result = await request(path, body, token);
  if (!result.response.ok)
    throw new Error(`Local API ${path.split('?')[0]} returned HTTP ${result.response.status}`);
  return result.data;
}
test('local Auth sessions, RLS and invitations work through the real Data API', async () => {
  const admin = new pg.Client({
    host: '127.0.0.1',
    port,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    connectionTimeoutMillis: 5000,
  });
  await admin.connect();
  const users = [];
  try {
    async function account() {
      const email = `${randomUUID()}@example.test`,
        password = `Aa1!${randomBytes(24).toString('base64url')}`;
      const signup = await success('/auth/v1/signup', { email, password, data: { role: 'owner' } });
      const createdUser = signup.user ?? signup;
      users.push(createdUser.id);
      assert.equal(signup.access_token, undefined);
      const unconfirmed = await request('/auth/v1/token?grant_type=password', { email, password });
      assert.equal(unconfirmed.response.ok, false, 'Unconfirmed account cannot sign in');
      // Fixture-only confirmation. Mail delivery/callback UI belongs to phase 2B.
      await admin.query('update auth.users set email_confirmed_at=now() where id=$1', [
        createdUser.id,
      ]);
      const signed = await success('/auth/v1/token?grant_type=password', { email, password });
      assert.equal(signed.user.id, createdUser.id);
      return { id: createdUser.id, email, token: signed.access_token };
    }
    const owner = await account(),
      receiver = await account();
    const reserveKey = randomUUID();
    const reserve = await success(
      '/rest/v1/rpc/create_reserve',
      { p_request_id: reserveKey, p_name: 'API test household' },
      owner.token,
    );
    assert.deepEqual(
      await success(
        '/rest/v1/rpc/create_reserve',
        { p_request_id: reserveKey, p_name: 'API test household' },
        owner.token,
      ),
      reserve,
    );
    const anonymous = await request('/rest/v1/product_stock?select=quantity');
    assert.ok([401, 403].includes(anonymous.response.status), 'Anonymous table read denied');
    const outsiderRows = await success(
      `/rest/v1/reserves?id=eq.${reserve.reserve_id}&select=id`,
      undefined,
      receiver.token,
    );
    assert.deepEqual(outsiderRows, []);
    const outsiderMutation = await request(
      '/rest/v1/rpc/mutate_reserve',
      {
        p_request_id: randomUUID(),
        p_reserve_id: reserve.reserve_id,
        p_action: 'create_product',
        p_payload: { name: 'Forbidden' },
      },
      receiver.token,
    );
    assert.equal(outsiderMutation.response.status, 403);
    const initial = await success(
      '/rest/v1/rpc/get_reserve_snapshot',
      { p_reserve_id: reserve.reserve_id },
      owner.token,
    );
    assert.deepEqual(
      initial.products,
      [],
      'A real reserve has no automatic demonstration catalogue',
    );
    const invitation = await success(
      '/rest/v1/rpc/invite_member',
      { p_request_id: randomUUID(), p_reserve_id: reserve.reserve_id, p_email: receiver.email },
      owner.token,
    );
    assert.equal(typeof invitation.token, 'string');
    assert.equal(invitation.token.length, 64);
    const accepted = await success(
      '/rest/v1/rpc/accept_invitation',
      {
        p_request_id: randomUUID(),
        p_invitation_id: invitation.invitation_id,
        p_token: invitation.token,
      },
      receiver.token,
    );
    assert.equal(accepted.reserve_id, reserve.reserve_id);
    const snapshot = await success(
      '/rest/v1/rpc/get_reserve_snapshot',
      { p_reserve_id: reserve.reserve_id },
      receiver.token,
    );
    assert.equal(snapshot.members.length, 2);
    assert.equal(snapshot.members.find((m) => m.user_id === receiver.id).role, 'member');
    const escalation = await request(
      '/rest/v1/rpc/invite_member',
      {
        p_request_id: randomUUID(),
        p_reserve_id: reserve.reserve_id,
        p_email: 'third@example.test',
      },
      receiver.token,
    );
    assert.equal(
      escalation.response.status,
      403,
      'User-controlled role metadata does not grant administration',
    );
    const direct = await fetch(
      new URL(`/rest/v1/reserve_members?reserve_id=eq.${reserve.reserve_id}`, api),
      {
        method: 'PATCH',
        headers: {
          apikey: publicKey,
          Authorization: `Bearer ${receiver.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'owner' }),
      },
    );
    assert.equal(direct.status, 403, 'Direct table write rejected by grants');
    const restorePayload = {
      p_request_id: randomUUID(),
      p_reserve_id: reserve.reserve_id,
      p_expected_revision: snapshot.reserve.revision,
      p_backup: {
        format: 'sacre-bleu',
        version: 1,
        exportedAt: '2026-10-30T10:00:00.000Z',
        products: [],
        shopping: [],
      },
    };
    assert.equal(
      (await request('/rest/v1/rpc/restore_reserve', restorePayload)).response.status,
      401,
      'Anonymous restore denied',
    );
    assert.equal(
      (await request('/rest/v1/rpc/restore_reserve', restorePayload, receiver.token)).response
        .status,
      403,
      'Member restore denied',
    );
    const restored = await success('/rest/v1/rpc/restore_reserve', restorePayload, owner.token);
    assert.deepEqual(
      await success('/rest/v1/rpc/restore_reserve', restorePayload, owner.token),
      restored,
      'HTTP replay idempotent',
    );
    const conflict = await request(
      '/rest/v1/rpc/restore_reserve',
      { ...restorePayload, p_request_id: randomUUID() },
      owner.token,
    );
    assert.equal(conflict.response.status, 409, 'Stale restore returns bounded HTTP conflict');
    assert.equal(conflict.data.code, '40001', 'Installed legacy clients recognize conflict code');
  } finally {
    if (users.length) {
      await admin.query('delete from public.reserves where owner_id=any($1::uuid[])', [users]);
      await admin.query('delete from private.requests where actor_id=any($1::uuid[])', [users]);
      await admin.query('delete from auth.users where id=any($1::uuid[])', [users]);
    }
    await admin.end();
  }
});
