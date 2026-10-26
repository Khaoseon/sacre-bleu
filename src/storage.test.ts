import { beforeEach, describe, expect, it, vi } from 'vitest';
import { demo } from './demo';
import { adjustScan, changeStock, startScan, undoOperation } from './model';
import { load, parseState, persist, STORAGE_KEY } from './storage';
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
describe('Sauvegarde locale', () => {
  it('fournit la démo au premier lancement', () => expect(load()).toEqual(demo()));
  it('sauvegarde puis relit produits, courses et tri', () => {
    const next = persist({ ...changeStock(demo(), 'thon', 1, true), sort: 'recent' }, 0);
    expect(next.revision).toBe(1);
    expect(load()).toEqual(next);
  });
  it('refuse une écriture depuis une révision périmée', () => {
    persist(demo(), 0);
    expect(() => persist(demo(), 0)).toThrow('autre onglet');
    expect(load().revision).toBe(1);
  });
  it('refuse aussi une sauvegarde supprimée par un autre onglet', () => {
    const saved = persist(demo(), 0);
    values.delete(STORAGE_KEY);
    expect(() => persist(saved, saved.revision)).toThrow('autre onglet');
    expect(values.has(STORAGE_KEY)).toBe(false);
  });
  it('sauvegarde stock et courses ensemble après plusieurs ajustements puis annulation', () => {
    const before = demo();
    before.shopping[0].quantity = 5;
    let result = startScan(before, 'thon', 1);
    let saved = persist(result.state, 0);
    let operation = { ...result.operation, revision: saved.revision };
    for (const quantity of [5, 3, 7, 2]) {
      result = adjustScan(saved, operation, quantity);
      saved = persist(result.state, saved.revision);
      operation = { ...result.operation, revision: saved.revision };
      expect(load().products.find((p) => p.id === 'thon')?.quantity).toBe(quantity);
      expect(load().shopping[0].quantity).toBe(Math.max(0, 5 - quantity));
      expect(load().shopping[0].checked).toBe(quantity >= 5);
    }
    persist(undoOperation(saved, operation.before, operation.revision), saved.revision);
    expect(load().products).toEqual(before.products);
    expect(load().shopping).toEqual(before.shopping);
  });
  it('un échec de sauvegarde d’ajustement préserve la dernière opération validée', () => {
    const result = startScan(demo(), 'thon', 1);
    const saved = persist(result.state, 0);
    const operation = { ...result.operation, revision: saved.revision };
    const raw = values.get(STORAGE_KEY);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    });
    expect(() => persist(adjustScan(saved, operation, 2).state, saved.revision)).toThrow();
    expect(values.get(STORAGE_KEY)).toBe(raw);
    expect(load()).toEqual(saved);
    expect(operation.quantity).toBe(1);
  });
  it('un ajustement préparé ne remplace pas une sauvegarde plus récente', () => {
    const result = startScan(demo(), 'thon', 1);
    const saved = persist(result.state, 0);
    const prepared = adjustScan(saved, { ...result.operation, revision: saved.revision }, 3);
    const newer = persist(changeStock(saved, 'pates', 1), saved.revision);
    expect(() => persist(prepared.state, saved.revision)).toThrow('autre onglet');
    expect(load()).toEqual(newer);
  });
  it('remonte les échecs sans modifier les données de départ', () => {
    const before = demo();
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    });
    expect(() => persist(changeStock(before, 'pates', 1), 0)).toThrow();
    expect(before).toEqual(demo());
  });
  it('ne remplace pas silencieusement une sauvegarde corrompue', () => {
    values.set(STORAGE_KEY, 'broken');
    expect(() => load()).toThrow();
    expect(values.get(STORAGE_KEY)).toBe('broken');
    expect(() => parseState(JSON.stringify({ ...demo(), products: [null] }))).toThrow();
    expect(() => parseState(JSON.stringify({ ...demo(), version: 2 }))).toThrow();
    const state = demo();
    state.products[0].quantity = -1;
    expect(() => parseState(JSON.stringify(state))).toThrow();
  });
  it('refuse les doublons et les références cassées', () => {
    const duplicate = demo();
    duplicate.products.push(duplicate.products[0]);
    expect(() => parseState(JSON.stringify(duplicate))).toThrow();
    const broken = demo();
    broken.shopping[0].productId = 'missing';
    expect(() => parseState(JSON.stringify(broken))).toThrow();
  });
});
