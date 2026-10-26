import { describe, expect, it } from 'vitest';
import { demo } from './demo';
import {
  addShopping,
  changeStock,
  deleteProduct,
  MAX_QUANTITY,
  saveProduct,
  selectProducts,
  suggestions,
  undoOperation,
} from './model';

describe('Quantités et catalogue', () => {
  it('ajoute et retire un emballage sans modifier la source', () => {
    const before = demo();
    const after = changeStock(before, 'pates', 1);
    expect(after.products.find((p) => p.id === 'pates')?.quantity).toBe(4);
    expect(before.products.find((p) => p.id === 'pates')?.quantity).toBe(3);
    expect(changeStock(after, 'pates', -1).products.find((p) => p.id === 'pates')?.quantity).toBe(
      3,
    );
  });
  it('refuse un retrait à zéro et conserve la fiche épuisée', () => {
    expect(() => changeStock(demo(), 'thon', -1)).toThrow('épuisé');
    const after = changeStock(demo(), 'pois', -1);
    expect(after.products).toHaveLength(8);
    expect(after.products.find((p) => p.id === 'pois')?.quantity).toBe(0);
  });
  it('réapprovisionne un produit épuisé', () =>
    expect(changeStock(demo(), 'thon', 1).products.find((p) => p.id === 'thon')?.quantity).toBe(1));
  it('refuse quantités négatives, fractionnaires, infinies ou trop grandes', () => {
    const p = demo().products[0];
    for (const quantity of [-1, 1.5, NaN, Infinity, MAX_QUANTITY + 1])
      expect(() => saveProduct(demo(), { ...p, quantity })).toThrow();
    expect(() =>
      changeStock(saveProduct(demo(), { ...p, quantity: MAX_QUANTITY }), p.id, 1),
    ).toThrow();
  });
  it('valide le nom, le code, le conditionnement et les doublons de code', () => {
    const p = demo().products[0];
    expect(() => saveProduct(demo(), { ...p, name: ' ' })).toThrow();
    expect(() => saveProduct(demo(), { ...p, barcode: 'abc' })).toThrow();
    expect(() => saveProduct(demo(), { ...p, size: 0 })).toThrow();
    expect(() => saveProduct(demo(), { ...p, id: 'different' })).toThrow('appartient');
    expect(
      saveProduct(demo(), { ...p, barcode: undefined, id: 'autre', size: 1000 }).products,
    ).toHaveLength(9);
  });
  it('mémorise un produit inconnu et permet les scans suivants', () => {
    const state = saveProduct(demo(), {
      id: 'new',
      name: 'Haricots',
      barcode: '1234567890128',
      quantity: 1,
      updatedAt: new Date().toISOString(),
    });
    const p = state.products.find((p) => p.barcode === '1234567890128')!;
    expect(changeStock(state, p.id, 1, true).products.find((p) => p.id === 'new')?.quantity).toBe(
      2,
    );
  });
  it('classe les épuisés en bas dans les deux tris et recherche sans accents', () => {
    for (const sort of ['name', 'recent'] as const) {
      const result = selectProducts({ ...demo(), sort }, '');
      expect(result.slice(-2).every((p) => p.quantity === 0)).toBe(true);
    }
    expect(selectProducts(demo(), 'PELEES').map((p) => p.id)).toEqual(['tomates']);
    expect(selectProducts(demo(), '', 'Conserves').map((p) => p.id)).toEqual(['tomates', 'thon']);
    const recent = changeStock(demo(), 'pates', 1);
    expect(selectProducts({ ...recent, sort: 'recent' }, '')[0].id).toBe('pates');
  });
});
describe('Courses et scans', () => {
  it('propose seulement les écarts sous seuil, sans ajout automatique', () => {
    const state = demo();
    expect(suggestions(state).map((s) => [s.product.id, s.quantity])).toEqual([
      ['riz', 1],
      ['pois', 2],
    ]);
    expect(state.shopping).toHaveLength(2);
    expect(
      suggestions(addShopping(state, 'Pois chiches', 2, 'pois')).map((s) => s.product.id),
    ).toEqual(['riz']);
  });
  it('ne rapproche jamais un article libre du catalogue par son nom', () => {
    const state = addShopping(demo(), 'Thon au naturel', 5);
    const after = changeStock(state, 'thon', 1, true);
    expect(after.shopping.find((i) => !i.productId && i.name === 'Thon au naturel')?.quantity).toBe(
      5,
    );
    expect(after.shopping.find((i) => i.productId === 'thon')?.quantity).toBe(1);
  });
  it('déduit les courses liées uniquement sur un scan Ajouter, et coche à zéro', () => {
    expect(changeStock(demo(), 'thon', 1).shopping[0].quantity).toBe(2);
    const once = changeStock(demo(), 'thon', 1, true);
    expect(changeStock(once, 'thon', -1, true).shopping[0].quantity).toBe(1);
    const twice = changeStock(once, 'thon', 1, true);
    expect(twice.shopping[0]).toMatchObject({ quantity: 0, checked: true });
    expect(changeStock(twice, 'thon', 1, true).shopping[0].quantity).toBe(0);
  });
  it('annule stock et courses ensemble et refuse une annulation périmée', () => {
    const before = demo();
    const after = { ...changeStock(before, 'thon', 1, true), revision: 1 };
    const restored = undoOperation(after, before, 1);
    expect(restored.products).toEqual(before.products);
    expect(restored.shopping).toEqual(before.shopping);
    expect(restored.revision).toBe(1);
    expect(() => undoOperation({ ...after, revision: 2 }, before, 1)).toThrow('annulée');
  });
  it('regroupe uniquement les articles liés au même produit', () => {
    const after = addShopping(demo(), 'Thon au naturel', 3, 'thon');
    expect(after.shopping).toHaveLength(2);
    expect(after.shopping[0].quantity).toBe(5);
    expect(() => addShopping(demo(), ' ', 1)).toThrow();
    expect(() => addShopping(demo(), 'Test', 0)).toThrow();
  });
  it('détache les courses après suppression et refuse les produits disparus', () => {
    const state = deleteProduct(demo(), 'thon');
    expect(state.shopping[0].productId).toBeUndefined();
    expect(state.shopping[0].name).toBe('Thon au naturel');
    expect(() => changeStock(state, 'thon', 1)).toThrow('existe');
  });
});
