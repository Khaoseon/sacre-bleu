import {
  isLookupBarcode,
  parseLookupResult,
  type LookupResult,
  type ProductProvider,
} from './productInfo';
export class EdgeProductProvider implements ProductProvider {
  private cache = new Map<string, { until: number; result: LookupResult }>();
  private blockedUntil = 0;
  constructor(
    private options: {
      url: string;
      publicKey: string;
      token: () => Promise<string | undefined>;
      fetch?: typeof fetch;
    },
  ) {}
  async lookup(barcode: string, signal: AbortSignal): Promise<LookupResult> {
    if (!isLookupBarcode(barcode)) return { status: 'unavailable', reason: 'invalid' };
    const cached = this.cache.get(barcode);
    if (cached && cached.until > Date.now()) return cached.result;
    if (this.blockedUntil > Date.now()) return { status: 'unavailable', reason: 'rate-limit' };
    let result: LookupResult;
    try {
      const token = await this.options.token();
      if (!token || signal.aborted) return { status: 'unavailable', reason: 'disabled' };
      const response = await (this.options.fetch ?? fetch)(
        `${this.options.url}/functions/v1/product-lookup`,
        {
          method: 'POST',
          signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: this.options.publicKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ barcode }),
        },
      );
      if (response.status === 429) {
        const retry = response.headers.get('Retry-After');
        const seconds =
          retry && /^\d+$/.test(retry)
            ? Number(retry)
            : retry
              ? (Date.parse(retry) - Date.now()) / 1000
              : 60;
        this.blockedUntil =
          Date.now() +
          Math.min(86400000, Math.max(60000, Number.isFinite(seconds) ? seconds * 1000 : 60000));
      }
      result =
        response.status === 429
          ? { status: 'unavailable', reason: 'rate-limit' }
          : response.ok
            ? parseLookupResult(await response.json(), barcode)
            : { status: 'unavailable', reason: 'network' };
    } catch {
      result = { status: 'unavailable', reason: 'network' };
    }
    if (!signal.aborted) {
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(barcode, {
        until:
          Date.now() +
          (result.status === 'found' ? 86400000 : result.status === 'missing' ? 600000 : 30000),
        result,
      });
    }
    return result;
  }
}
