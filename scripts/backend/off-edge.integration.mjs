import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';

// Requires `supabase functions serve product-lookup --no-verify-jwt` locally.
// Valid product requests are intentionally excluded: this suite never calls OFF.
const cli = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
const status = JSON.parse(
  execFileSync(
    process.execPath,
    [resolve('node_modules/supabase', cli.bin.supabase), 'status', '-o', 'json'],
    { encoding: 'utf8' },
  ),
);
const api = new URL(status.API_URL);
if (!['127.0.0.1', 'localhost'].includes(api.hostname)) throw new Error('Local API required');
const port = Number(
  readFileSync('supabase/config.toml', 'utf8').match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1],
);
if (!port) throw new Error('Local database port missing');
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
test('real local Edge runtime authenticates verified members and validates inputs before OFF', async () => {
  const admin = new pg.Client({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });
  await admin.connect();
  let userId;
  const send = (path, body, token) =>
    fetch(new URL(path, api), {
      method: 'POST',
      headers: {
        apikey: publicKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  try {
    const edge = '/functions/v1/product-lookup';
    assert.equal((await send(edge, { barcode: '1234' })).status, 401);
    assert.equal((await send(edge, { barcode: '1234' }, 'invalid.jwt.token')).status, 401);
    const email = `${randomUUID()}@example.test`;
    const password = `TestAa1!${randomUUID()}`;
    const signup = await send('/auth/v1/signup', { email, password });
    assert.equal(signup.ok, true);
    const data = await signup.json();
    userId = (data.user ?? data).id;
    assert.ok(userId);
    await admin.query('update auth.users set email_confirmed_at=now() where id=$1', [userId]);
    const login = await send('/auth/v1/token?grant_type=password', { email, password });
    assert.equal(login.ok, true);
    const token = (await login.json()).access_token;
    assert.equal((await send(edge, { barcode: '1234' }, token)).status, 401, 'Non-member denied');
    assert.equal(
      (
        await send(
          '/rest/v1/rpc/create_reserve',
          { p_request_id: randomUUID(), p_name: 'Edge fixture' },
          token,
        )
      ).ok,
      true,
    );
    assert.equal(
      (await send(edge, { barcode: '123' }, token)).status,
      400,
      'Member authorized but invalid barcode refused',
    );
    assert.equal(
      (await send(edge, { barcode: '00123456', url: 'https://evil.test' }, token)).status,
      400,
      'Arbitrary URL refused',
    );
    const origin = await fetch(new URL(edge, api), {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.test' },
    });
    assert.equal(origin.status, 403);
  } finally {
    if (userId) {
      await admin.query('delete from public.reserves where owner_id=$1', [userId]);
      await admin.query('delete from private.requests where actor_id=$1', [userId]);
      await admin.query('delete from auth.users where id=$1', [userId]);
    }
    await admin.end();
  }
});
