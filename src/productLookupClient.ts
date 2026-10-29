import {
  isLookupBarcode,
  parseLookupResult,
  record,
  type LookupResult,
  type ProductProvider,
  type LookupStatus,
} from './productInfo';

/** Public metadata only. Refusals/auth/network errors are never cached per barcode. */
export class EdgeProductProvider implements ProductProvider {
  private cache = new Map<string, { until: number; result: LookupResult }>();
  private state: LookupStatus = { reason: 'unknown', until: 0 };
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getStatus = () => this.state;
  private publish(reason: LookupStatus['reason'], until = 0) {
    this.state = { reason, until };
    this.listeners.forEach((listener) => listener());
  }
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
    if (
      this.state.until > Date.now() &&
      (this.state.reason === 'cooldown' || this.state.reason === 'rate-limit')
    )
      return { status: 'unavailable', reason: this.state.reason };
    let result: LookupResult;
    try {
      const token = await this.options.token();
      if (signal.aborted) return { status: 'unavailable', reason: 'network' };
      if (!token) {
        this.publish('auth');
        return { status: 'unavailable', reason: 'auth' };
      }
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
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (signal.aborted) return { status: 'unavailable', reason: 'network' };
      const raw = record(body);
      const budget = record(raw?.budget);
      const seconds = budget?.retryAfterSeconds;
      const validBudget =
        budget &&
        typeof budget.allowed === 'boolean' &&
        ['cooldown', 'rate-limit'].includes(String(budget.reason)) &&
        typeof seconds === 'number' &&
        Number.isInteger(seconds) &&
        seconds >= 1 &&
        seconds <= 86400;
      if (validBudget)
        this.publish(budget.reason as 'cooldown' | 'rate-limit', Date.now() + seconds * 1000);
      if (response.status === 401 || response.status === 403) {
        this.publish('auth');
        result = { status: 'unavailable', reason: 'auth' };
      } else if (response.status === 429) {
        const reason = raw?.reason === 'cooldown' ? 'cooldown' : 'rate-limit';
        if (!validBudget) {
          const retry = response.headers.get('Retry-After');
          const value =
            retry && /^\d+$/.test(retry)
              ? Number(retry)
              : retry
                ? (Date.parse(retry) - Date.now()) / 1000
                : reason === 'cooldown'
                  ? 6
                  : 60;
          this.publish(
            reason,
            Date.now() +
              Math.min(86400000, Math.max(1000, Number.isFinite(value) ? value * 1000 : 60000)),
          );
        }
        result = { status: 'unavailable', reason };
      } else {
        result = response.ok
          ? parseLookupResult(body, barcode)
          : { status: 'unavailable', reason: 'network' };
        if (result.status === 'unavailable' && result.reason === 'network') this.publish('network');
        else if (!validBudget) this.publish('unknown');
      }
    } catch {
      result = { status: 'unavailable', reason: 'network' };
      if (!signal.aborted) this.publish('network');
    }
    if (!signal.aborted && result.status !== 'unavailable') {
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(barcode, {
        until: Date.now() + (result.status === 'found' ? 86400000 : 600000),
        result,
      });
    }
    return result;
  }
}
