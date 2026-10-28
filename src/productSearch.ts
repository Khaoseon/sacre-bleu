import { findProductByBarcode, type Product } from './model';
import type { LookupResult, ProductProvider } from './productInfo';

/** Catalogue lookup is synchronous; known codes never reach the provider. */
export class ProductSearch {
  private controller?: AbortController;
  constructor(private provider?: ProductProvider) {}
  cancel() {
    this.controller?.abort();
    this.controller = undefined;
  }
  start(
    products: Product[],
    barcode: string,
  ):
    | { status: 'known'; product: Product }
    | { status: 'loading'; result: Promise<LookupResult | null> } {
    this.cancel();
    const known = findProductByBarcode(products, barcode);
    if (known) return { status: 'known', product: known };
    const controller = new AbortController();
    this.controller = controller;
    const result = (async (): Promise<LookupResult | null> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const aborted = new Promise<null>((resolve) =>
        controller.signal.addEventListener('abort', () => resolve(null), { once: true }),
      );
      const timeout = new Promise<LookupResult>((resolve) => {
        timer = setTimeout(() => resolve({ status: 'unavailable', reason: 'network' }), 6500);
      });
      try {
        const lookup = this.provider
          ? this.provider
              .lookup(barcode, controller.signal)
              .catch((): LookupResult => ({ status: 'unavailable', reason: 'network' }))
          : Promise.resolve<LookupResult>({ status: 'unavailable', reason: 'disabled' });
        const value = await Promise.race([lookup, timeout, aborted]);
        if (controller !== this.controller || controller.signal.aborted) return null;
        this.controller = undefined;
        controller.abort();
        return value;
      } finally {
        clearTimeout(timer);
      }
    })();
    return { status: 'loading', result };
  }
}
