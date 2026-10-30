import { isLookupBarcode, record, type ProductProvider, type LookupSlot } from './productInfo.ts';
export class LookupAuthError extends Error {}

/** Authorization is injected; the HTTP handler never receives a service-role client. */
export function createLookupHandler(options: {
  provider: ProductProvider;
  origins: string[];
  authorize: (token: string, signal: AbortSignal) => Promise<boolean>;
  claim?: (token: string, signal: AbortSignal) => Promise<boolean | LookupSlot>;
  defer?: (token: string, signal: AbortSignal) => Promise<void | LookupSlot>;
  retryAfterSeconds?: () => number;
}) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      ...(origin && options.origins.includes(origin)
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Expose-Headers': 'Retry-After',
          }
        : {}),
    };
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers });
    if (origin && !options.origins.includes(origin))
      return reply(403, { error: 'Origine refusée.' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'Méthode refusée.' });
    const auth = request.headers.get('Authorization');
    if (!auth?.match(/^Bearer [A-Za-z0-9._-]+$/))
      return reply(401, { error: 'Connexion requise.' });
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5500)]);
    try {
      if (!(await options.authorize(auth.slice(7), signal)))
        return reply(401, { error: 'Accès refusé.' });
      if (!request.headers.get('Content-Type')?.startsWith('application/json'))
        return reply(400, { error: 'JSON requis.' });
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: 'Code requis.' });
      let body = '';
      let length = 0;
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > 128) {
            await reader.cancel();
            return reply(400, { error: 'Requête trop grande.' });
          }
          body += decoder.decode(chunk.value, { stream: true });
        }
      } finally {
        reader.releaseLock();
      }
      const data = record(JSON.parse(body + decoder.decode()));
      if (
        !data ||
        Object.keys(data).length !== 1 ||
        typeof data.barcode !== 'string' ||
        !isLookupBarcode(data.barcode)
      )
        return reply(400, { error: 'Code invalide.' });
      const claimedAt = Date.now();
      const decision = options.claim ? await options.claim(auth.slice(7), signal) : true;
      const budget: LookupSlot =
        typeof decision === 'boolean'
          ? { allowed: decision, reason: 'cooldown', retryAfterSeconds: 6 }
          : decision;
      if (!budget.allowed) {
        headers['Retry-After'] = String(budget.retryAfterSeconds);
        return reply(429, { status: 'unavailable', reason: budget.reason, budget });
      }
      const result = await options.provider.lookup(data.barcode, signal);
      if (result.status === 'unavailable' && result.reason === 'rate-limit') {
        let deferred: void | LookupSlot = undefined;
        try {
          deferred = await options.defer?.(auth.slice(7), signal);
        } catch {
          console.warn('OFF_SHARED_COOLDOWN_UNCONFIRMED');
        }
        const blocked = deferred ?? {
          allowed: false,
          reason: 'rate-limit',
          retryAfterSeconds: options.retryAfterSeconds?.() ?? 60,
        };
        headers['Retry-After'] = String(blocked.retryAfterSeconds);
        return reply(429, { ...result, budget: blocked });
      }
      const remaining = Math.max(
        1,
        budget.retryAfterSeconds - Math.floor((Date.now() - claimedAt) / 1000),
      );
      return reply(200, { ...result, budget: { ...budget, retryAfterSeconds: remaining } });
    } catch (error) {
      if (error instanceof LookupAuthError) return reply(401, { error: 'Accès refusé.' });
      return reply(200, { status: 'unavailable', reason: 'network' });
    }
  };
}
