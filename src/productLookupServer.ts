import {
  isLookupBarcode,
  parseOffProduct,
  type LookupResult,
  type ProductProvider,
} from './productInfo.ts';
import { isOffUserAgent } from './offIdentity.ts';

export const OFF_FIELDS =
  'code,product_name_fr,product_name,brands,quantity,categories_tags,image_front_url';
/** An isolate-local guard, not a provider quota. Production deployment limits are documented. */
export class OpenFoodFactsProvider implements ProductProvider {
  private cache = new Map<string, { until: number; result: LookupResult }>();
  private busy = false;
  private next = 0;
  private limited = false;
  get retryAfterSeconds() {
    return Math.max(1, Math.ceil((this.next - (this.options.now ?? Date.now)()) / 1000));
  }
  constructor(
    private options: {
      userAgent: string;
      fetch?: typeof fetch;
      now?: () => number;
      intervalMs?: number;
      staging?: boolean;
    },
  ) {}
  async lookup(barcode: string, signal: AbortSignal): Promise<LookupResult> {
    if (!isLookupBarcode(barcode)) return { status: 'unavailable', reason: 'invalid' };
    if (!isOffUserAgent(this.options.userAgent))
      return { status: 'unavailable', reason: 'disabled' };
    const now = this.options.now ?? Date.now;
    const cached = this.cache.get(barcode);
    if (cached && cached.until > now()) return cached.result;
    if (this.busy || this.next > now())
      return { status: 'unavailable', reason: this.limited ? 'rate-limit' : 'cooldown' };
    this.busy = true;
    this.limited = false;
    this.next =
      now() +
      Math.max(6000, Number.isFinite(this.options.intervalMs) ? this.options.intervalMs! : 6000);
    const timeout = AbortSignal.timeout(4500);
    let result: LookupResult;
    try {
      const url = new URL(
        `/api/v3.6/product/${barcode}`,
        this.options.staging
          ? 'https://world.openfoodfacts.net'
          : 'https://world.openfoodfacts.org',
      );
      url.searchParams.set('fields', OFF_FIELDS);
      url.searchParams.set('lc', 'fr');
      url.searchParams.set('cc', 'ch');
      const response = await (this.options.fetch ?? fetch)(url, {
        signal: AbortSignal.any([signal, timeout]),
        redirect: 'error',
        headers: {
          'User-Agent': this.options.userAgent,
          Accept: 'application/json',
          ...(this.options.staging ? { Authorization: 'Basic b2ZmOm9mZg==' } : {}),
        },
      });
      if (response.status === 404) result = { status: 'missing' };
      else if (response.status === 429) {
        const retry = response.headers.get('Retry-After');
        const seconds =
          retry && /^\d+$/.test(retry)
            ? Number(retry)
            : retry
              ? Math.ceil((Date.parse(retry) - now()) / 1000)
              : 60;
        this.next = Math.max(
          this.next,
          now() +
            Math.min(86400000, Math.max(1000, Number.isFinite(seconds) ? seconds * 1000 : 60000)),
        );
        this.limited = true;
        result = { status: 'unavailable', reason: 'rate-limit' };
      } else if (!response.ok) result = { status: 'unavailable', reason: 'network' };
      else {
        // Bound streamed bodies even when Content-Length is absent or inaccurate.
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Missing body');
        let size = 0;
        let body = '';
        const decoder = new TextDecoder();
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > 100000) {
              await reader.cancel();
              throw new Error('Oversized body');
            }
            body += decoder.decode(chunk.value, { stream: true });
          }
          body += decoder.decode();
          result = parseOffProduct(JSON.parse(body), barcode);
        } finally {
          reader.releaseLock();
        }
      }
    } catch {
      result = { status: 'unavailable', reason: 'network' };
    } finally {
      this.busy = false;
    }
    if (!signal.aborted && result.status !== 'unavailable') {
      if (this.cache.size >= 200) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(barcode, {
        until:
          now() +
          (result.status === 'found' ? 86400000 : result.status === 'missing' ? 600000 : 30000),
        result,
      });
    }
    return result;
  }
}
