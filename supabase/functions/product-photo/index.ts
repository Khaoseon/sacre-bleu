import { sanitizePhoto } from '../../../src/photoServer.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
const api = Deno.env.get('SUPABASE_URL')!;
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const processorKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins = (
  Deno.env.get('PHOTO_ALLOWED_ORIGINS') ?? 'http://127.0.0.1:5173,http://localhost:5173'
)
  .split(',')
  .map((s) => s.trim());
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Cache-Control': 'private, no-store',
    Vary: 'Origin',
    'Content-Type': 'application/json',
  };
  if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  if (origin && !origins.includes(origin)) return reply({ code: '42501' }, 403);
  if (request.method === 'OPTIONS') {
    headers['Access-Control-Allow-Headers'] = 'authorization,apikey,content-type,x-photo-intent';
    headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS';
    return reply(null);
  }
  if (request.method !== 'POST') return reply({ code: '22023' }, 405);
  try {
    const intentHeader = request.headers.get('X-Photo-Intent') ?? '';
    if (intentHeader.length > 2048) return reply({ code: '22023' }, 400);
    let intent;
    try {
      intent = JSON.parse(intentHeader);
    } catch {
      return reply({ code: '22023' }, 400);
    }
    if (
      !intent ||
      Object.keys(intent).sort().join(',') !==
        'expected_path,expected_version,hash,product_id,request_id,reserve_id' ||
      ![intent.product_id, intent.request_id, intent.reserve_id].every(
        (v) => typeof v === 'string' && uuid.test(v),
      ) ||
      !Number.isSafeInteger(intent.expected_version) ||
      intent.expected_version < 0 ||
      !(
        intent.hash === null ||
        (typeof intent.hash === 'string' && /^[a-f0-9]{64}$/.test(intent.hash))
      ) ||
      !(
        intent.expected_path === null ||
        (typeof intent.expected_path === 'string' && intent.expected_path.length <= 512)
      )
    )
      return reply({ code: '22023' }, 400);
    const authorization = request.headers.get('Authorization') ?? '';
    const userHeaders = {
      apikey: publicKey,
      Authorization: authorization,
      'Content-Type': 'application/json',
    };
    const signal = AbortSignal.timeout(10000);
    const userResponse = await fetch(`${api}/auth/v1/user`, {
      headers: userHeaders,
      signal,
      redirect: 'error',
    });
    if (!userResponse.ok) return reply({ code: '42501' }, 403);
    const user = await userResponse.json();
    if (!user.id || !user.email_confirmed_at || user.is_anonymous || user.role !== 'authenticated')
      return reply({ code: '42501' }, 403);
    const membership = await fetch(
      `${api}/rest/v1/reserve_members?reserve_id=eq.${intent.reserve_id}&user_id=eq.${user.id}&select=user_id`,
      { headers: userHeaders, signal, redirect: 'error' },
    );
    if (!membership.ok) return reply({ code: 'unavailable' }, 503);
    const members = await membership.json();
    if (!Array.isArray(members) || members.length !== 1) return reply({ code: '42501' }, 403);
    if (request.headers.get('Content-Type') !== 'image/jpeg') return reply({ code: '22023' }, 415);
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader) {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > 500000) {
          await reader.cancel();
          return reply({ code: '22023' }, 413);
        }
        chunks.push(part.value);
      }
    }
    const input = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      input.set(chunk, offset);
      offset += chunk.length;
    }
    let processed: ReturnType<typeof sanitizePhoto> | undefined;
    if (length) {
      // Budget applies to decoding, never to receipt recovery or removal.
      const gate = await fetch(`${api}/rest/v1/rpc/claim_product_photo`, {
        method: 'POST',
        headers: userHeaders,
        signal,
        redirect: 'error',
        body: JSON.stringify({ p_reserve_id: intent.reserve_id }),
      });
      if (!gate.ok)
        return reply(
          { code: gate.status === 403 ? '42501' : '23514' },
          gate.status === 403 ? 403 : 429,
        );
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', input)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      if (hash !== intent.hash) return reply({ code: '22023' }, 400);
      try {
        processed = sanitizePhoto(input);
      } catch {
        return reply({ code: '22023' }, 415);
      }
    }
    // Empty body + hash is recovery: return an existing receipt or atomically fence
    // an uncommitted upload. Empty body + null hash is an intentional removal.
    const response = await fetch(`${api}/rest/v1/rpc/commit_product_photo`, {
      method: 'POST',
      signal,
      redirect: 'error',
      headers: {
        apikey: processorKey,
        Authorization: `Bearer ${processorKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_actor: user.id,
        p_request_id: intent.request_id,
        p_reserve_id: intent.reserve_id,
        p_product_id: intent.product_id,
        p_expected_path: intent.expected_path,
        p_expected_version: intent.expected_version,
        p_hash: intent.hash,
        p_data: processed
          ? btoa(Array.from(processed.bytes, (b) => String.fromCharCode(b)).join(''))
          : null,
        p_width: processed?.width ?? null,
        p_height: processed?.height ?? null,
      }),
    });
    const result = await response.json();
    const status = !response.ok && result.code === 'P0002' ? 404 : response.status;
    return reply(response.ok ? result : { code: result.code }, status);
  } catch {
    // Never reflect tokens, photograph bytes, SQL details or processor diagnostics.
    return reply({ code: 'unavailable' }, 503);
  }
});
