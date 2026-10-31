// Local/disposable only. Auth and processor credentials stay in process memory.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import jpeg from 'jpeg-js';
import { packArchive, unpackArchive } from './backup-archive.mjs';

const cli = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
const status = JSON.parse(
  execFileSync(
    process.execPath,
    [resolve('node_modules/supabase', cli.bin.supabase), 'status', '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const api = new URL(status.API_URL);
if (!['127.0.0.1', 'localhost'].includes(api.hostname))
  throw Error('Photos tests refuse hosted infrastructure');
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const port = Number(
  readFileSync('supabase/config.toml', 'utf8').match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1],
);
const hash = (b) => createHash('sha256').update(b).digest('hex');
// Wait for this disposable local processor, not for GitHub CI. Cold-starting
// the Edge runtime can exceed the former eight-second window on shared runners.
const startupDeadline = Date.now() + 45_000;
let lastStartupStatus = 'no response';
for (;;) {
  try {
    const response = await fetch(new URL('/functions/v1/product-photo', api), {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(1500),
    });
    if (response.ok) break;
    lastStartupStatus = `HTTP ${response.status}`;
  } catch (error) {
    lastStartupStatus = error instanceof Error ? error.name : 'request failed';
  }
  if (Date.now() >= startupDeadline)
    throw Error(
      `Local photo Edge runtime unavailable after 45s (${lastStartupStatus}); run supabase functions serve product-photo --no-verify-jwt`,
    );
  await new Promise((r) => setTimeout(r, 200));
}
const makeImage = (value = 200) =>
  jpeg.encode(
    {
      width: 16,
      height: 16,
      data: new Uint8Array(16 * 16 * 4).fill(value),
      comments: ['private GPS metadata'],
    },
    80,
  ).data;

async function request(path, body, token, extra = {}) {
  const response = await fetch(new URL(path, api), {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: publicKey,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...extra,
  });
  return { response, data: await response.json() };
}
async function success(path, body, token) {
  const result = await request(path, body, token);
  assert.equal(
    result.response.ok,
    true,
    `${path.split('?')[0]} HTTP ${result.response.status} / ${result.data?.code ?? ''}`,
  );
  return result.data;
}
test('private photo Auth/API, processor validation, household isolation, atomic races, recovery and backup', async () => {
  const admin = new pg.Client({
    host: '127.0.0.1',
    port,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    connectionTimeoutMillis: 5000,
  });
  await admin.connect();
  const accounts = [];
  let reserve, otherReserve;
  try {
    async function account() {
      const email = `${randomUUID()}@example.test`,
        password = `Aa1!${randomBytes(24).toString('base64url')}`;
      const signup = await success('/auth/v1/signup', { email, password });
      const user = signup.user ?? signup;
      accounts.push(user.id);
      await admin.query('update auth.users set email_confirmed_at=now() where id=$1', [user.id]);
      return {
        id: user.id,
        ...(await success('/auth/v1/token?grant_type=password', { email, password })),
      };
    }
    const owner = await account(),
      member = await account(),
      outsider = await account();
    reserve = (
      await success(
        '/rest/v1/rpc/create_reserve',
        { p_request_id: randomUUID(), p_name: 'Private photos' },
        owner.access_token,
      )
    ).reserve_id;
    otherReserve = (
      await success(
        '/rest/v1/rpc/create_reserve',
        { p_request_id: randomUUID(), p_name: 'Other household' },
        outsider.access_token,
      )
    ).reserve_id;
    await admin.query(
      "insert into public.reserve_members(reserve_id,user_id,role) values($1,$2,'member')",
      [reserve, member.id],
    );
    const create = async (name = 'Product') =>
      (
        await success(
          '/rest/v1/rpc/mutate_reserve',
          {
            p_request_id: randomUUID(),
            p_reserve_id: reserve,
            p_action: 'create_product',
            p_payload: {
              name,
              off_barcode: '3017620422003',
              off_image_url:
                'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.1.400.jpg',
            },
          },
          owner.access_token,
        )
      ).product_id;
    const product = await create();
    const current = async () =>
      (
        await success(
          '/rest/v1/rpc/get_reserve_snapshot',
          { p_reserve_id: reserve },
          owner.access_token,
        )
      ).products.find((p) => p.id === product);
    const upload = async ({
      token = owner.access_token,
      bytes = makeImage(),
      expected_path = null,
      expected_version = 0,
      request_id = randomUUID(),
      hash: inputHash = bytes?.length ? hash(bytes) : null,
      origin = 'http://127.0.0.1:5173',
      product_id = product,
      reserve_id = reserve,
      type = 'image/jpeg',
    } = {}) => {
      const response = await fetch(new URL('/functions/v1/product-photo', api), {
        method: 'POST',
        headers: {
          apikey: publicKey,
          Authorization: `Bearer ${token}`,
          Origin: origin,
          'Content-Type': type,
          'X-Photo-Intent': JSON.stringify({
            request_id,
            reserve_id,
            product_id,
            expected_path,
            expected_version,
            hash: inputHash,
          }),
        },
        body: bytes,
      });
      return { response, data: await response.json(), request_id, inputHash };
    };
    const read = async (token, path, product_id = product, reserve_id = reserve) =>
      request(
        '/rest/v1/rpc/read_product_photo',
        { p_reserve_id: reserve_id, p_product_id: product_id, p_path: path },
        token,
      );
    const fakeWrite = await request(
      '/rest/v1/rpc/commit_product_photo',
      {
        p_actor: owner.id,
        p_request_id: randomUUID(),
        p_reserve_id: reserve,
        p_product_id: product,
        p_expected_path: null,
        p_expected_version: 0,
        p_hash: null,
        p_data: null,
        p_width: null,
        p_height: null,
      },
      owner.access_token,
    );
    assert.equal(fakeWrite.response.status, 403, 'Authenticated client cannot bypass decoder');
    assert.equal((await upload({ token: outsider.access_token })).response.status, 403);
    assert.equal((await upload({ token: 'invalid' })).response.status, 403);
    assert.equal((await upload({ origin: 'https://forbidden.example' })).response.status, 403);
    assert.equal((await upload({ bytes: Buffer.from('<svg/>') })).response.status, 415);
    assert.equal((await upload({ bytes: new Uint8Array(500001) })).response.status, 413);
    assert.equal((await upload({ type: 'image/heic' })).response.status, 415);
    const first = await upload();
    assert.equal(
      first.response.status,
      200,
      `Local Edge upload failed: HTTP ${first.response.status} / ${first.data?.code ?? first.data?.message ?? ''}`,
    );
    const row = await current(),
      path = row.photo_path;
    assert.deepEqual(
      (await admin.query(readFileSync('scripts/backend/cloud-audit.sql', 'utf8'))).rows[0].audit
        .violations,
      [],
      'Administrative recovery audit recognizes exact processor privilege exception',
    );
    assert.equal(row.photo_version, 1);
    const legacyDetach = await request(
      '/rest/v1/rpc/mutate_reserve',
      {
        p_request_id: randomUUID(),
        p_reserve_id: reserve,
        p_action: 'update_product',
        p_payload: { product_id: product, photo_path: null },
      },
      owner.access_token,
    );
    assert.equal(
      legacyDetach.response.status,
      403,
      'Legacy metadata cannot bypass photo version checks',
    );
    assert.equal((await current()).photo_path, path);
    assert(row.off_image_url, 'OFF provenance retained');
    const download = await read(member.access_token, path);
    assert.equal(download.response.status, 200);
    assert.match(download.response.headers.get('cache-control'), /no-store/);
    const bytes = Buffer.from(download.data.data, 'base64');
    assert(!bytes.includes(Buffer.from('private GPS')), 'Server strips source metadata');
    assert.equal(jpeg.decode(bytes).width, 16);
    assert.equal((await read(outsider.access_token, path)).response.status, 403);
    assert.equal((await read(undefined, path)).response.status, 401);
    assert.equal((await read(member.access_token, path, randomUUID())).data, null);
    assert.equal(
      (await read(outsider.access_token, path, product, otherReserve)).data,
      null,
      'Forged destination reserve never resolves foreign bytes',
    );
    // Original intention replay returns its receipt even without input bytes.
    const replay = await upload({
      bytes: new Uint8Array(),
      request_id: first.request_id,
      hash: first.inputHash,
    });
    assert.equal(replay.data.revision, first.data.revision);
    const backup = {
      format: 'sacre-bleu',
      version: 1,
      exportedAt: '2026-10-31T12:00:00.000Z',
      products: [],
      shopping: [],
    };
    const revision = (
      await admin.query('select revision from public.reserves where id=$1', [reserve])
    ).rows[0].revision;
    const restore = await request(
      '/rest/v1/rpc/restore_reserve',
      {
        p_request_id: randomUUID(),
        p_reserve_id: reserve,
        p_expected_revision: Number(revision),
        p_backup: backup,
      },
      owner.access_token,
    );
    assert.equal(
      restore.response.status,
      400,
      'JSON restore cannot silently discard private photos',
    );
    assert.equal((await current()).photo_path, path);

    // Exercise actual pg_dump bytes through the supported archive integrity layer,
    // then re-import transactionally on this disposable local source and roll back.
    const dump = execFileSync(
      'docker',
      [
        'exec',
        'supabase_db_app_reserve',
        'pg_dump',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '--data-only',
        '--inserts',
        '--table=private.product_photos',
        '--table=private.photo_rate',
      ],
      { encoding: 'utf8' },
    ).replace(/^\\.*$/gm, '');
    const archive = packArchive(
      {
        'data.sql': dump,
        'schema.sql': '-- local photo backup regression',
        'migration-history.json': '[]',
        'migrations/20261031000100_private_photos.sql': readFileSync(
          'supabase/migrations/20261031000100_private_photos.sql',
          'utf8',
        ),
      },
      { projectRef: 'local-disposable' },
    );
    const restored = unpackArchive(archive);
    await admin.query('begin');
    await admin.query('delete from private.product_photos; delete from private.photo_rate');
    await admin.query(restored.files['data.sql']);
    assert.equal(
      (
        await admin.query(
          "select encode(bytes,'hex') as bytes from private.product_photos where product_id=$1",
          [product],
        )
      ).rows[0].bytes,
      bytes.toString('hex'),
    );
    await admin.query('rollback');

    // Hold the serialization point so both real HTTP uploads overlap.
    await admin.query('begin');
    await admin.query('select 1 from public.reserves where id=$1 for update', [reserve]);
    const races = [
      upload({ expected_path: path, expected_version: 1 }),
      upload({
        token: member.access_token,
        expected_path: path,
        expected_version: 1,
        bytes: makeImage(100),
      }),
    ];
    await new Promise((r) => setTimeout(r, 200));
    await admin.query('commit');
    const results = await Promise.all(races);
    assert.deepEqual(
      results.map((r) => r.response.status).sort(),
      [200, 409],
      'Only one competing replacement commits',
    );
    assert.equal(
      (await read(owner.access_token, path)).data,
      null,
      'Old version is no longer downloadable',
    );
    const replaced = await current();
    const removed = await upload({
      bytes: new Uint8Array(),
      expected_path: replaced.photo_path,
      expected_version: 2,
    });
    assert.equal(removed.response.status, 200);
    assert.equal((await current()).photo_path, null);
    assert.equal(
      (
        await admin.query('select count(*) from private.product_photos where product_id=$1', [
          product,
        ])
      ).rows[0].count,
      '0',
    );
    assert.equal(
      (await upload({ expected_version: 0 })).response.status,
      409,
      'Version prevents absent → photo → absent ABA overwrite',
    );
    const requestId = randomUUID(),
      pendingHash = hash(makeImage(33));
    const aborted = await upload({
      bytes: new Uint8Array(),
      expected_version: 3,
      request_id: requestId,
      hash: pendingHash,
    });
    assert.equal(aborted.data.aborted, true);
    const late = await upload({
      bytes: makeImage(33),
      expected_version: 3,
      request_id: requestId,
      hash: pendingHash,
    });
    assert.equal(late.data.aborted, true, 'Late upload cannot commit after recovered abort');
    assert.equal((await current()).photo_path, null);
    const last = await upload({ expected_version: 3 });
    assert.equal(last.response.status, 200);
    let lastPath = (await current()).photo_path;
    const reusedByMember = await upload({
      token: member.access_token,
      request_id: last.request_id,
      expected_path: lastPath,
      expected_version: 4,
    });
    assert.equal(reusedByMember.response.status, 200);
    assert.notEqual(
      (await current()).photo_path,
      lastPath,
      'Different actors reusing a request UUID still receive a new immutable asset identity',
    );
    lastPath = (await current()).photo_path;
    assert.equal((await current()).photo_version, 5);
    await admin.query('delete from public.reserve_members where reserve_id=$1 and user_id=$2', [
      reserve,
      member.id,
    ]);
    assert.equal(
      (await read(member.access_token, lastPath)).response.status,
      403,
      'Membership revocation denies subsequent download',
    );
    assert.equal(
      (await upload({ token: member.access_token, expected_path: lastPath, expected_version: 5 }))
        .response.status,
      403,
      'Removed member cannot replace',
    );
    await admin.query('update private.photo_rate set attempts=30 where actor_id=$1', [owner.id]);
    assert.equal(
      (await upload({ expected_path: lastPath, expected_version: 5 })).response.status,
      429,
      'Decode rate limit is enforced',
    );
    const noBytes = await upload({
      bytes: new Uint8Array(),
      expected_path: lastPath,
      expected_version: 5,
    });
    assert.equal(noBytes.response.status, 200, 'Rate limiting never prevents removal');
    await admin.query('update private.photo_rate set attempts=0 where actor_id=$1', [owner.id]);
    const another = await create('Deleted during upload');
    await admin.query('begin');
    await admin.query('select 1 from public.reserves where id=$1 for update', [reserve]);
    const duringDelete = upload({ product_id: another });
    await new Promise((r) => setTimeout(r, 100));
    await admin.query('delete from public.products where id=$1', [another]);
    await admin.query('commit');
    assert.equal(
      (await duringDelete).response.status,
      404,
      'Deletion during upload prevents attachment',
    );
    await success(
      '/rest/v1/rpc/mutate_reserve',
      {
        p_request_id: randomUUID(),
        p_reserve_id: reserve,
        p_action: 'delete_product',
        p_payload: { product_id: product },
      },
      owner.access_token,
    );
    assert.equal((await read(owner.access_token, lastPath)).data, null);
    assert.equal(
      (
        await admin.query('select count(*) from private.product_photos where reserve_id=$1', [
          reserve,
        ])
      ).rows[0].count,
      '0',
    );
  } finally {
    await admin.query('rollback');
    await admin.query('delete from public.reserves where id=any($1::uuid[])', [
      [reserve, otherReserve].filter(Boolean),
    ]);
    await admin.query('delete from private.requests where actor_id=any($1::uuid[])', [accounts]);
    await admin.query('delete from auth.users where id=any($1::uuid[])', [accounts]);
    await admin.end();
  }
});
