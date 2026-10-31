import { describe, expect, it } from 'vitest';
import { adjustScan, scanQuantityLimit, startScan, StaleOperationError } from './model';
import { fixtures } from '../explorations/7a/src/fixtures';
import {
  adjustStockBy,
  errorKey,
  replenishment,
  restoreRemoved,
  SimulationFailure,
} from '../explorations/7a/src/operations';
import { phase7a2Catalog } from './i18n/phase7a2';

describe('7A.2 isolated proposals and confirmed defects', () => {
  it.each([1, -1] as const)('uses real total limits in scan mode %s', (mode) => {
    const s = fixtures(),
      r = startScan(s, 'pasta', mode);
    expect(scanQuantityLimit(r.operation)).toBe(mode === 1 ? 9995 : 4);
    expect(() => adjustScan(r.state, r.operation, 0)).toThrow('au moins un');
    expect(() => adjustScan(r.state, r.operation, scanQuantityLimit(r.operation) + 1)).toThrow();
    const at = adjustScan(r.state, r.operation, scanQuantityLimit(r.operation));
    expect(at.state.products.find((p) => p.id === 'pasta')?.quantity).toBe(mode === 1 ? 9999 : 0);
  });
  it('applies one multi-unit stock change without changing shopping and refuses invalid proposals', () => {
    const s = fixtures(),
      next = adjustStockBy(s, 'pasta', 17);
    expect(next.products.find((p) => p.id === 'pasta')?.quantity).toBe(21);
    expect(next.shopping).toBe(s.shopping);
    expect(s.products.find((p) => p.id === 'pasta')?.quantity).toBe(4);
    for (const q of [-5, 10000, 0.5, NaN]) expect(() => adjustStockBy(s, 'pasta', q)).toThrow();
  });
  it('classifies validation, insufficient stock, conflicts, explicit simulation and unexpected failures', () => {
    expect(errorKey(new Error('Donnez un nom au produit.'))).toBe('Donnez un nom au produit.');
    expect(errorKey(new Error('Ce produit est déjà épuisé.'))).toBe(
      'Stock insuffisant pour ce retrait.',
    );
    expect(errorKey(new StaleOperationError())).toMatch(/^Conflit/);
    expect(errorKey(new SimulationFailure())).toMatch(/^Échec simulé/);
    expect(errorKey(new Error('secret internal value'))).toMatch(/^Erreur inattendue/);
    expect(errorKey(null)).toMatch(/^Erreur inattendue/);
  });
  it('restores only the removed row, preserves unrelated changes, and refuses linked duplicate races', () => {
    const s = fixtures(),
      item = s.shopping[0],
      after = {
        ...s,
        products: s.products.map((p) => ({ ...p, quantity: 7 })),
        shopping: s.shopping.slice(1),
      };
    const restored = restoreRemoved(after, item);
    expect(restored.products).toBe(after.products);
    expect(restored.shopping).toContainEqual(item);
    expect(() => restoreRemoved(s, item)).toThrow(StaleOperationError);
    expect(() =>
      restoreRemoved(
        { ...after, shopping: [...after.shopping, { ...item, id: 'concurrent' }] },
        item,
      ),
    ).toThrow(StaleOperationError);
    expect(
      restoreRemoved({ ...after, products: [] }, item).shopping.at(-1)?.productId,
    ).toBeUndefined();
  });
  it('separates minimum shortages from zero stock without minimum and marks existing linked entries', () => {
    const s = fixtures();
    s.products.push({ id: 'zero', name: 'Zero without threshold', quantity: 0, updatedAt: '' });
    const candidates = replenishment(s);
    expect(candidates.map((c) => c.product.id)).toEqual(['tomato', 'rice']);
    expect(candidates.map((c) => c.quantity)).toEqual([1, 1]);
    expect(candidates.every((c) => c.linked)).toBe(true);
  });
  it('keeps all convergence presentation entries in both languages', () => {
    for (const [key, pair] of Object.entries(phase7a2Catalog)) {
      expect(pair.fr).toBe(key);
      expect(pair.en.trim().length).toBeGreaterThan(0);
    }
  });
});
