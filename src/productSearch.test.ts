import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductSearch } from './productSearch';
import type { LookupResult } from './productInfo';
import { demo } from './demo';
import { saveProduct } from './model';

afterEach(() => vi.useRealTimers());
describe('catalogue priority and lifecycle of product recognition', () => {
  it('returns known catalogue products synchronously without any provider call', () => {
    const lookup = vi.fn();
    const p = { ...demo().products[0], barcode: '0036000291452', name: 'Mon nom personnalisé' };
    expect(new ProductSearch({ lookup }).start([p], '036000291452')).toEqual({
      status: 'known',
      product: p,
    });
    expect(lookup).not.toHaveBeenCalled();
  });
  it.each([
    {
      status: 'found',
      product: { name: 'Externe', external: { provider: 'open-food-facts', barcode: '00123456' } },
    },
    { status: 'missing' },
    { status: 'unavailable', reason: 'rate-limit' },
  ] satisfies LookupResult[])('returns %j only for unknown products', async (expected) => {
    const lookup = vi.fn().mockResolvedValue(expected);
    const result = new ProductSearch({ lookup }).start([], '00123456');
    if (result.status !== 'loading') throw new Error();
    expect(await result.result).toEqual(expected);
    expect(lookup.mock.calls[0][0]).toBe('00123456');
  });
  it('ignores a late result after closing even if the provider ignores abort', async () => {
    let finish!: (result: LookupResult) => void;
    const search = new ProductSearch({
      lookup: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    const result = search.start([], '00123456');
    if (result.status !== 'loading') throw new Error();
    search.cancel();
    expect(await result.result).toBeNull();
    finish({ status: 'missing' });
  });
  it('isolates successive codes and stops an old lookup from replacing the new form', async () => {
    let finish!: (result: LookupResult) => void;
    const lookup = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({ status: 'missing' });
    const search = new ProductSearch({ lookup });
    const first = search.start([], '00001234');
    const second = search.start([], '00005678');
    if (first.status !== 'loading' || second.status !== 'loading') throw new Error();
    expect(await second.result).toEqual({ status: 'missing' });
    finish({ status: 'unavailable', reason: 'network' });
    expect(await first.result).toBeNull();
  });
  it('falls back after a deadline or rejection and always permits a manual product', async () => {
    vi.useFakeTimers();
    const search = new ProductSearch({ lookup: () => new Promise(() => {}) });
    const result = search.start([], '00001234');
    if (result.status !== 'loading') throw new Error();
    await vi.advanceTimersByTimeAsync(6500);
    expect(await result.result).toEqual({ status: 'unavailable', reason: 'network' });
    const rejected = new ProductSearch({
      lookup: async () => {
        throw new Error();
      },
    }).start([], '00001234');
    if (rejected.status !== 'loading') throw new Error();
    expect(await rejected.result).toEqual({ status: 'unavailable', reason: 'network' });
  });
  it('recognizes a manually corrected saved product on the next scan without another external call', async () => {
    const lookup = vi.fn().mockResolvedValue({
      status: 'found',
      product: {
        name: 'Proposition',
        external: { provider: 'open-food-facts', barcode: '00001234' },
      },
    });
    const search = new ProductSearch({ lookup });
    const first = search.start([], '00001234');
    if (first.status !== 'loading') throw new Error();
    await first.result;
    const state = saveProduct(
      { ...demo(), products: [], shopping: [] },
      {
        id: 'p',
        barcode: '00001234',
        name: 'Nom corrigé',
        brand: 'Ma marque',
        size: 500,
        unit: 'g',
        quantity: 1,
        updatedAt: new Date().toISOString(),
      },
    );
    expect(search.start(state.products, '00001234')).toMatchObject({
      status: 'known',
      product: { name: 'Nom corrigé', quantity: 1 },
    });
    expect(lookup).toHaveBeenCalledOnce();
  });
});
