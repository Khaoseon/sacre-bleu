import { isLookupBarcode, record, type ProductProvider } from './productInfo.ts';

/** Authorization is injected; the HTTP handler never receives a service-role client. */
export function createLookupHandler(options: {
  provider: ProductProvider;
  origins: string[];
  authorize: (token: string, signal: AbortSignal) => Promise<boolean>;
  claim?: (token: string, signal: AbortSignal) => Promise<boolean>;
  defer?: (token: string, signal: AbortSignal) => Promise<void>;
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
      if (options.claim && !(await options.claim(auth.slice(7), signal))) {
        headers['Retry-After'] = '60';
        return reply(429, { status: 'unavailable', reason: 'rate-limit' });
      }
      const result = await options.provider.lookup(data.barcode, signal);
      if (result.status === 'unavailable' && result.reason === 'rate-limit') {
        await options.defer?.(auth.slice(7), signal);
        headers['Retry-After'] = '60';
        return reply(429, result);
      }
      return reply(200, result);
    } catch {
      return reply(200, { status: 'unavailable', reason: 'network' });
    }
  };
}
