import { describe, expect, it, vi } from 'vitest';
import { relistShopping, StaleOperationError, type ShoppingItem, type State } from './model';
import { SharedPantryStore } from './backend/store';
import { BackendError } from './backend/errors';
import type { ReserveBackend, ReserveSnapshot } from './backend/contracts';
import { actionCatalog, actionLabel } from './i18n/actions';
import { chooseLanguage } from './i18n';

const item: ShoppingItem = {
  id: 'deleted',
  productId: 'product',
  name: 'Riz',
  quantity: 0,
  checked: true,
};
const state: State = {
  version: 1,
  revision: 5,
  sort: 'name',
  products: [{ id: 'product', name: 'Riz', quantity: 7, updatedAt: '' }],
  shopping: [{ id: 'other', name: 'Autre', quantity: 2, checked: false }],
};

describe('put a removed item back on the current shopping list', () => {
  it('distinguishes Undo from form cancellation in both languages', () => {
    expect(actionCatalog.undoShoppingDeletion).toEqual({ fr: 'Annuler', en: 'Undo' });
    chooseLanguage('en');
    expect(actionLabel('undoShoppingDeletion')).toBe('Undo');
    chooseLanguage('fr');
    expect(actionLabel('undoShoppingDeletion')).toBe('Annuler');
  });
  it('retains the product association and current stock, restoring zero as one unchecked package', () => {
    const result = relistShopping(state, item);
    expect(result.products).toBe(state.products);
    expect(result.revision).toBe(5);
    expect(result.shopping[0]).toBe(state.shopping[0]);
    expect(result.shopping[1]).toMatchObject({
      productId: 'product',
      name: 'Riz',
      quantity: 1,
      checked: false,
    });
    expect(result.shopping[1].id).not.toBe(item.id);
  });
  it('accumulates a concurrent linked addition instead of replacing it or checking it', () => {
    const existing = { ...item, id: 'concurrent', quantity: 4, checked: false };
    const result = relistShopping(
      { ...state, shopping: [...state.shopping, existing] },
      { ...item, quantity: 3 },
    );
    expect(result.shopping).toHaveLength(2);
    expect(result.shopping[1]).toEqual({ ...existing, quantity: 7 });
  });
  it('keeps free text independent and refuses a deleted product rather than detaching the link', () => {
    expect(
      relistShopping(state, { ...item, productId: undefined }).shopping.at(-1)?.productId,
    ).toBeUndefined();
    expect(() => relistShopping({ ...state, products: [] }, item)).toThrow(
      'Le produit associé n’existe plus.',
    );
    expect(() => relistShopping({ ...state, shopping: [...state.shopping, item] }, item)).toThrow(
      StaleOperationError,
    );
    for (const quantity of [-1, 0.5, 10000])
      expect(() => relistShopping(state, { ...item, quantity })).toThrow();
  });
});

describe('shared re-add uses the existing atomic addition and idempotent intention', () => {
  function setup() {
    const snapshot: ReserveSnapshot = {
      reserve: {
        id: 'r',
        name: 'Fixture',
        owner_id: 'u',
        revision: 1,
        created_at: '',
        updated_at: '',
      },
      members: [],
      products: [],
      shopping: [],
    };
    const execute = vi.fn<ReserveBackend['execute']>().mockResolvedValue({ revision: 1 });
    const getSnapshot = vi.fn<ReserveBackend['getSnapshot']>().mockResolvedValue(snapshot);
    const journal = new Map<string, string>();
    const store = new SharedPantryStore(
      { execute, getSnapshot } as unknown as ReserveBackend,
      'u',
      'r',
      {
        getItem: (k) => journal.get(k) ?? null,
        setItem: (k, v) => {
          journal.set(k, v);
        },
        removeItem: (k) => {
          journal.delete(k);
        },
      },
      () => true,
    );
    return { store, execute, getSnapshot };
  }
  it('sends the product link in one addition, with no check or stock write', async () => {
    const f = setup();
    await f.store.refresh();
    expect(await f.store.addShopping(item.name, Math.max(1, item.quantity), item.productId)).toBe(
      true,
    );
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.execute.mock.calls[0][2]).toEqual({
      action: 'add_shopping',
      payload: { name: 'Riz', quantity: 1, product_id: 'product' },
    });
    expect(f.getSnapshot).toHaveBeenCalledTimes(2);
  });
  it('keeps an uncertain addition blocked and resumes its exact UUID, without a second intention', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockRejectedValueOnce(new BackendError('Interruption', 'uncertain'));
    expect(await f.store.addShopping(item.name, 1, item.productId)).toBe(false);
    expect(f.store.getSnapshot().completed).toBe(0);
    expect(f.store.writable).toBe(false);
    expect(await f.store.resume()).toBe(true);
    expect(f.execute.mock.calls[1]).toEqual(f.execute.mock.calls[0]);
    expect(f.store.getSnapshot().completed).toBe(1);
  });
});
