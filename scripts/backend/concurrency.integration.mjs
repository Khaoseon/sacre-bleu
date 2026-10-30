import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { readFileSync } from 'node:fs';

const restoreBackup = () => ({
  format: 'sacre-bleu',
  version: 1,
  exportedAt: '2026-10-30T10:00:00.000Z',
  products: [],
  shopping: [],
});
async function restore(client, reserve, revision, backup = restoreBackup(), key = randomUUID()) {
  return (
    await client.query('select public.restore_reserve($1,$2,$3,$4::jsonb) as result', [
      key,
      reserve,
      revision,
      JSON.stringify(backup),
    ])
  ).rows[0].result;
}
test('restore serializes with a legacy stock writer and refuses to overwrite its newer revision', async () => {
  await fixture(async ({ a, b, admin, reserve, accept }) => {
    await accept(b);
    const product = (
      await rpc(a, reserve, 'create_product', { name: 'Concurrent', initial_quantity: 2 })
    ).product_id;
    const revision = (await a.query('select revision from public.reserves where id=$1', [reserve]))
      .rows[0].revision;
    await b.query('begin');
    await rpc(b, reserve, 'stock', { product_id: product, delta: 1 });
    const attempt = restore(a, reserve, revision).then(
      () => ({ ok: true }),
      (e) => ({ code: e.code }),
    );
    await waitForLock(admin, a);
    await b.query('commit');
    assert.equal((await attempt).code, 'PGRST');
    assert.equal(
      (await a.query('select quantity from public.product_stock where product_id=$1', [product]))
        .rows[0].quantity,
      3,
    );
  });
});
test('simultaneous owner restores from the same preview commit at most once', async () => {
  await fixture(async ({ a, owner, reserve, clients }) => {
    const second = await connect(owner);
    clients.push(second);
    const revision = (await a.query('select revision from public.reserves where id=$1', [reserve]))
      .rows[0].revision;
    const results = await Promise.allSettled([
      restore(a, reserve, revision),
      restore(second, reserve, revision),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(results.find((r) => r.status === 'rejected').reason.code, 'PGRST');
    assert.equal(
      Number(
        (await a.query('select revision from public.reserves where id=$1', [reserve])).rows[0]
          .revision,
      ),
      Number(revision) + 1,
    );
  });
});

// Deliberately local-only; no environment URL can redirect these destructive
// test fixtures toward a hosted project. This is the CLI's local test password.
const configPort = readFileSync('supabase/config.toml', 'utf8').match(
  /\[db\]\s*\nport\s*=\s*(\d+)/,
)?.[1];
if (!configPort) throw new Error('Missing local PostgreSQL port in supabase/config.toml');
const connection = {
  host: '127.0.0.1',
  port: Number(configPort),
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
  connectionTimeoutMillis: 5000,
};
async function connect(actor) {
  const client = new pg.Client(connection);
  await client.connect();
  await client.query("set statement_timeout='15s'");
  if (actor) {
    await client.query('set role authenticated');
    await client.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
  }
  return client;
}
async function rpc(client, reserve, action, payload, request = randomUUID()) {
  return (
    await client.query('select public.mutate_reserve($1,$2,$3,$4::jsonb) as result', [
      request,
      reserve,
      action,
      JSON.stringify(payload),
    ])
  ).rows[0].result;
}
async function fixture(callback) {
  const admin = await connect();
  const owner = randomUUID(),
    member = randomUUID();
  let reserve;
  const clients = [];
  try {
    await admin.query(
      'insert into auth.users(id,email,email_confirmed_at,is_anonymous) values ($1,$2,now(),false),($3,$4,now(),false)',
      [owner, `${owner}@example.test`, member, `${member}@example.test`],
    );
    const a = await connect(owner),
      b = await connect(member);
    clients.push(a, b);
    reserve = (
      await a.query('select public.create_reserve($1,$2) as result', [
        randomUUID(),
        'Concurrency fixture',
      ])
    ).rows[0].result.reserve_id;
    const invitation = (
      await a.query('select public.invite_member($1,$2,$3) as result', [
        randomUUID(),
        reserve,
        `${member}@example.test`,
      ])
    ).rows[0].result;
    const accept = async (client, key = randomUUID()) =>
      (
        await client.query('select public.accept_invitation($1,$2,$3) as result', [
          key,
          invitation.invitation_id,
          invitation.token,
        ])
      ).rows[0].result;
    await callback({ admin, a, b, owner, member, reserve, clients, accept });
  } finally {
    for (const client of clients) {
      await client.query('rollback').catch(() => {});
      await client.end();
    }
    if (reserve) await admin.query('delete from public.reserves where id=$1', [reserve]);
    await admin.query('delete from private.requests where actor_id=any($1::uuid[])', [
      [owner, member],
    ]);
    await admin.query('delete from auth.users where id=any($1::uuid[])', [[owner, member]]);
    await admin.end();
  }
}
async function waitForLock(admin, client) {
  const until = Date.now() + 5000;
  while (Date.now() < until) {
    const waiting = (
      await admin.query(
        "select wait_event_type='Lock' as waiting from pg_stat_activity where pid=$1",
        [client.processID],
      )
    ).rows[0]?.waiting;
    if (waiting) return;
    await delay(10);
  }
  throw new Error('Second connection did not reach a concurrent PostgreSQL lock');
}
test('two accounts atomically share the detailed OFF slot, including legacy claims', async () => {
  await fixture(async ({ admin, a, b, reserve, accept }) => {
    await accept(b);
    await admin.query(
      "update private.product_lookup_gate set next_allowed_at='-infinity',blocked_reason='cooldown'",
    );
    const results = await Promise.all([
      a.query('select public.claim_product_lookup_slot() as slot'),
      b.query('select public.claim_product_lookup_slot() as slot'),
    ]);
    const slots = results.map((r) => r.rows[0].slot);
    assert.equal(slots.filter((s) => s.allowed).length, 1);
    assert.equal(slots.filter((s) => !s.allowed).length, 1);
    for (const slot of slots) {
      assert.equal(slot.reason, 'cooldown');
      assert.ok(slot.retry_after_seconds >= 1 && slot.retry_after_seconds <= 6);
    }
    const deferred = (await a.query('select public.claim_product_lookup_slot(17) as slot')).rows[0]
      .slot;
    assert.equal(deferred.reason, 'rate-limit');
    assert.equal(deferred.allowed, false);
    assert.equal(
      (await b.query('select public.claim_product_lookup() as allowed')).rows[0].allowed,
      false,
    );
    assert.equal(
      (await b.query('select public.claim_product_lookup_slot() as slot')).rows[0].slot.reason,
      'rate-limit',
    );
    await admin.query(
      "update private.product_lookup_gate set next_allowed_at=clock_timestamp()-interval '1 second'",
    );
    assert.equal(
      (await b.query('select public.claim_product_lookup_slot() as slot')).rows[0].slot.allowed,
      true,
    );
    assert.ok(reserve);
  });
});
async function blockedPair(admin, first, second, runFirst, runSecond) {
  await first.query('begin');
  const a = await runFirst();
  // Attach rejection handling immediately while the second transaction waits.
  const pending = runSecond().then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await waitForLock(admin, second);
  await first.query('commit');
  return { a, b: await pending };
}
async function product(ctx, quantity = 0) {
  await ctx.accept(ctx.b);
  return (
    await rpc(ctx.a, ctx.reserve, 'create_product', {
      name: 'Concurrency product',
      initial_quantity: quantity,
    })
  ).product_id;
}
test('durable OFF budget serializes concurrent callers across Edge instances', async () =>
  fixture(async (ctx) => {
    await ctx.accept(ctx.b);
    await ctx.admin.query(
      "update private.product_lookup_gate set next_allowed_at='-infinity' where singleton",
    );
    const claim = async (client) =>
      (await client.query('select public.claim_product_lookup() as allowed')).rows[0].allowed;
    const result = await blockedPair(
      ctx.admin,
      ctx.a,
      ctx.b,
      () => claim(ctx.a),
      () => claim(ctx.b),
    );
    assert.equal(result.a, true);
    assert.equal(result.b.value, false);
    await ctx.admin.query(
      "update private.product_lookup_gate set next_allowed_at='-infinity' where singleton",
    );
  }));

test('two simultaneous additions serialize without losing either delta', async () =>
  fixture(async (ctx) => {
    const id = await product(ctx);
    const result = await blockedPair(
      ctx.admin,
      ctx.a,
      ctx.b,
      () => rpc(ctx.a, ctx.reserve, 'stock', { product_id: id, delta: 1 }),
      () => rpc(ctx.b, ctx.reserve, 'stock', { product_id: id, delta: 1 }),
    );
    assert.equal(result.b.error, undefined);
    assert.equal(result.a.stock, 1);
    assert.equal(result.b.value.stock, 2);
    assert.equal(
      (await ctx.admin.query('select quantity from public.product_stock where product_id=$1', [id]))
        .rows[0].quantity,
      2,
    );
  }));
test('concurrent withdrawals from one unit yield one success and no negative stock', async () =>
  fixture(async (ctx) => {
    const id = await product(ctx, 1);
    const result = await blockedPair(
      ctx.admin,
      ctx.a,
      ctx.b,
      () => rpc(ctx.a, ctx.reserve, 'stock', { product_id: id, delta: -1 }),
      () => rpc(ctx.b, ctx.reserve, 'stock', { product_id: id, delta: -1 }),
    );
    assert.equal(result.a.stock, 0);
    assert.equal(result.b.error?.code, '23514');
    assert.equal(
      (await ctx.admin.query('select quantity from public.product_stock where product_id=$1', [id]))
        .rows[0].quantity,
      0,
    );
  }));
test('same actor and same idempotency key concurrently apply only once', async () =>
  fixture(async (ctx) => {
    const id = await product(ctx),
      key = randomUUID();
    const other = await connect(ctx.owner);
    ctx.clients.push(other);
    const result = await blockedPair(
      ctx.admin,
      ctx.a,
      other,
      () => rpc(ctx.a, ctx.reserve, 'scan', { product_id: id, delta: 1 }, key),
      () => rpc(other, ctx.reserve, 'scan', { product_id: id, delta: 1 }, key),
    );
    assert.equal(result.b.error, undefined);
    assert.deepEqual(result.b.value, result.a);
    assert.equal(
      (await ctx.admin.query('select quantity from public.product_stock where product_id=$1', [id]))
        .rows[0].quantity,
      1,
    );
  }));
test('same key racing with different parameters rejects the second payload', async () =>
  fixture(async (ctx) => {
    const id = await product(ctx),
      key = randomUUID();
    const other = await connect(ctx.owner);
    ctx.clients.push(other);
    const result = await blockedPair(
      ctx.admin,
      ctx.a,
      other,
      () => rpc(ctx.a, ctx.reserve, 'stock', { product_id: id, delta: 1 }, key),
      () => rpc(other, ctx.reserve, 'stock', { product_id: id, delta: 2 }, key),
    );
    assert.equal(result.b.error?.code, '22023');
    assert.equal(
      (await ctx.admin.query('select quantity from public.product_stock where product_id=$1', [id]))
        .rows[0].quantity,
      1,
    );
  }));
test('concurrent acceptance consumes an invitation once and never adds a third member', async () =>
  fixture(async (ctx) => {
    const other = await connect(ctx.member);
    ctx.clients.push(other);
    const result = await blockedPair(
      ctx.admin,
      ctx.b,
      other,
      () => ctx.accept(ctx.b),
      () => ctx.accept(other),
    );
    assert.equal(result.a.reserve_id, ctx.reserve);
    assert.equal(result.b.error?.code, 'P0001');
    assert.equal(
      (
        await ctx.admin.query(
          'select count(*)::int as n from public.reserve_members where reserve_id=$1',
          [ctx.reserve],
        )
      ).rows[0].n,
      2,
    );
  }));
test('another member’s committed change prevents stale scan adjustment and compensation', async () =>
  fixture(async (ctx) => {
    const id = await product(ctx);
    await rpc(ctx.a, ctx.reserve, 'add_shopping', { product_id: id, quantity: 5 });
    const scan = await rpc(ctx.a, ctx.reserve, 'scan', { product_id: id, delta: 1 });
    const result = await blockedPair(
      ctx.admin,
      ctx.b,
      ctx.a,
      () => rpc(ctx.b, ctx.reserve, 'stock', { product_id: id, delta: 1 }),
      () => rpc(ctx.a, ctx.reserve, 'undo_scan', { scan_id: scan.scan_id, expected_version: 1 }),
    );
    assert.equal(result.b.error?.code, 'PGRST');
    assert.equal(JSON.parse(result.b.error.message).code, '40001');
    assert.equal(JSON.parse(result.b.error.detail).status, 409);
    await assert.rejects(
      rpc(ctx.a, ctx.reserve, 'adjust_scan', {
        scan_id: scan.scan_id,
        expected_version: 1,
        quantity: 3,
      }),
      (error) => error.code === 'PGRST' && JSON.parse(error.message).code === '40001',
    );
    assert.equal(
      (await ctx.admin.query('select quantity from public.product_stock where product_id=$1', [id]))
        .rows[0].quantity,
      2,
    );
    assert.equal(
      (
        await ctx.admin.query('select quantity from public.shopping_items where product_id=$1', [
          id,
        ])
      ).rows[0].quantity,
      4,
    );
  }));
