import { describe, expect, it } from 'vitest';
import { demo } from './demo';
import {
  adjustScan,
  changeStock,
  MAX_QUANTITY,
  saveProduct,
  scanQuantityLimit,
  startScan,
  StaleOperationError,
  undoOperation,
  type ScanResult,
  type State,
} from './model';

function fixture(): State {
  const state = demo();
  state.shopping = [
    { id: 'linked', productId: 'thon', name: 'Thon au naturel', quantity: 5, checked: false },
    { id: 'free', name: 'Thon au naturel', quantity: 7, checked: false },
    { id: 'checked', productId: 'thon', name: 'Thon au naturel', quantity: 3, checked: true },
  ];
  return state;
}
function adjust(result: ScanResult, quantity: number) {
  return adjustScan(result.state, result.operation, quantity);
}
function quantities(result: ScanResult) {
  return {
    stock: result.state.products.find((p) => p.id === result.operation.productId)!.quantity,
    shopping: result.state.shopping[0].quantity,
    checked: result.state.shopping[0].checked,
  };
}

describe('Quantité traitée par le dernier scan', () => {
  it('ajoute un exemplaire automatiquement puis traite cinq exemplaires au total', () => {
    const first = startScan(fixture(), 'thon', 1);
    expect(quantities(first)).toEqual({ stock: 1, shopping: 4, checked: false });
    const fifth = adjust(first, 5);
    expect(quantities(fifth)).toEqual({ stock: 5, shopping: 0, checked: true });
    expect(fifth.operation.id).toBe(first.operation.id);
    expect(fifth.operation.quantity).toBe(5);
  });
  it('réduit un ajout et restaure la quantité réellement déduite ainsi que le cochage', () => {
    const result = adjust(adjust(startScan(fixture(), 'thon', 1), 5), 3);
    expect(quantities(result)).toEqual({ stock: 3, shopping: 2, checked: false });
  });
  it('gère les allers-retours au-delà des courses sans créer de courses supplémentaires', () => {
    let result = startScan(fixture(), 'thon', 1);
    const cases = [
      [7, 7, 0],
      [6, 6, 0],
      [4, 4, 1],
      [9, 9, 0],
      [2, 2, 3],
      [5, 5, 0],
      [1, 1, 4],
    ];
    for (const [target, stock, shopping] of cases) {
      result = adjust(result, target);
      expect(quantities(result)).toEqual({ stock, shopping, checked: shopping === 0 });
    }
  });
  it('ne touche ni aux articles libres homonymes ni aux articles déjà cochés', () => {
    const before = fixture();
    const result = adjust(adjust(startScan(before, 'thon', 1), 8), 2);
    expect(result.state.shopping.slice(1)).toEqual(before.shopping.slice(1));
  });
  it('ne déduit chaque exemplaire qu’une fois si plusieurs lignes sont liées au même produit', () => {
    const before = fixture();
    before.shopping.splice(1, 0, {
      id: 'linked-2',
      productId: 'thon',
      name: 'Thon',
      quantity: 4,
      checked: false,
    });
    const result = adjust(startScan(before, 'thon', 1), 6);
    expect(result.state.shopping.slice(0, 2).map((i) => i.quantity)).toEqual([0, 3]);
    expect(
      adjust(result, 2)
        .state.shopping.slice(0, 2)
        .map((i) => i.quantity),
    ).toEqual([3, 4]);
  });
  it('ne crée aucune ligne de courses lorsqu’il n’existe pas d’article lié', () => {
    const before = fixture();
    before.shopping = before.shopping.slice(1);
    expect(adjust(startScan(before, 'thon', 1), 5).state.shopping).toEqual(before.shopping);
  });
  it('refuse zéro, les nombres négatifs et les quantités invalides sans altérer le dernier état', () => {
    const result = startScan(fixture(), 'thon', 1);
    for (const quantity of [0, -1, 1.5, NaN, Infinity, MAX_QUANTITY + 1]) {
      expect(() => adjust(result, quantity)).toThrow();
    }
    expect(quantities(result)).toEqual({ stock: 1, shopping: 4, checked: false });
  });
  it('Annuler revient à zéro traité après plusieurs ajustements et restaure les courses exactement', () => {
    const before = fixture();
    const result = adjust(adjust(startScan(before, 'thon', 1), 8), 3);
    const restored = undoOperation(
      result.state,
      result.operation.before,
      result.operation.revision,
    );
    expect(restored).toEqual(before);
  });
  it('rejouer le même total ne change ni les données ni la date de modification', () => {
    const result = adjust(startScan(fixture(), 'thon', 1), 4);
    expect(adjust(result, 4).state).toBe(result.state);
    expect(adjust(result, 4).operation).toBe(result.operation);
  });
  it('borne les ajouts selon la place restante dans le stock', () => {
    const before = fixture();
    before.products.find((p) => p.id === 'thon')!.quantity = MAX_QUANTITY - 2;
    const first = startScan(before, 'thon', 1);
    expect(scanQuantityLimit(first.operation)).toBe(2);
    expect(quantities(adjust(first, 2)).stock).toBe(MAX_QUANTITY);
    expect(() => adjust(first, 3)).toThrow();
  });
  it('les boutons de Stock restent indépendants des courses', () => {
    const before = fixture();
    expect(changeStock(before, 'thon', 1).shopping).toEqual(before.shopping);
  });
});

describe('Retraits, nouveaux scans et invalidation', () => {
  function removable() {
    const before = fixture();
    before.products.find((p) => p.id === 'thon')!.quantity = 5;
    return before;
  }
  it('augmente puis réduit le nombre retiré et conserve les courses', () => {
    const before = removable();
    let result = startScan(before, 'thon', -1);
    expect(quantities(result).stock).toBe(4);
    expect(scanQuantityLimit(result.operation)).toBe(5);
    result = adjust(result, 5);
    expect(quantities(result).stock).toBe(0);
    result = adjust(result, 2);
    expect(quantities(result).stock).toBe(3);
    expect(result.state.shopping).toEqual(before.shopping);
    expect(undoOperation(result.state, result.operation.before, result.operation.revision)).toEqual(
      before,
    );
  });
  it('refuse un retrait supérieur au stock initial ou un premier retrait à zéro', () => {
    const result = startScan(removable(), 'thon', -1);
    expect(() => adjust(result, 6)).toThrow('insuffisant');
    expect(() => startScan(fixture(), 'thon', -1)).toThrow('épuisé');
    expect(quantities(result).stock).toBe(4);
  });
  it('un nouveau scan repart de un et son annulation conserve le scan précédent ajusté', () => {
    const first = adjust(startScan(fixture(), 'thon', 1), 3);
    const second = startScan(first.state, 'thon', 1);
    expect(second.operation.quantity).toBe(1);
    expect(second.operation.id).not.toBe(first.operation.id);
    const secondAdjusted = adjust(second, 4);
    expect(quantities(secondAdjusted)).toEqual({ stock: 7, shopping: 0, checked: true });
    expect(
      undoOperation(
        secondAdjusted.state,
        secondAdjusted.operation.before,
        secondAdjusted.operation.revision,
      ),
    ).toEqual(first.state);
  });
  it('un changement du mode de saisie ne change pas le sens du scan déjà réalisé', () => {
    const added = startScan(removable(), 'thon', 1);
    const removed = startScan(added.state, 'thon', -1);
    expect(quantities(adjust(added, 3)).stock).toBe(8);
    expect(quantities(adjust(removed, 3)).stock).toBe(3);
    expect(adjust(removed, 3).state.shopping).toEqual(added.state.shopping);
  });
  it('refuse ajustement, rejeu et annulation après une modification extérieure', () => {
    const result = startScan(fixture(), 'thon', 1);
    const newer = { ...changeStock(result.state, 'pates', 1), revision: result.state.revision + 1 };
    expect(() => adjustScan(newer, result.operation, 2)).toThrow(StaleOperationError);
    expect(() => adjustScan(newer, result.operation, 1)).toThrow(StaleOperationError);
    expect(() => undoOperation(newer, result.operation.before, result.operation.revision)).toThrow(
      StaleOperationError,
    );
    expect(newer.products.find((p) => p.id === 'pates')?.quantity).toBe(4);
  });
  it('permet l’ajustement et l’annulation d’une création issue du scanner', () => {
    const before = fixture();
    const catalog = saveProduct(before, {
      id: 'new',
      name: 'Inconnu',
      barcode: '1234567890128',
      quantity: 0,
      updatedAt: new Date().toISOString(),
    });
    let result = startScan(catalog, 'new', 1, 2);
    result.operation = { ...result.operation, before };
    result = adjust(result, 5);
    expect(quantities(result).stock).toBe(5);
    expect(result.state.products.find((p) => p.barcode === '1234567890128')?.id).toBe('new');
    expect(undoOperation(result.state, result.operation.before, result.operation.revision)).toEqual(
      before,
    );
  });
  it('conserve les baselines immuables pendant les ajustements', () => {
    const before = fixture();
    const expected = structuredClone(before);
    const first = startScan(before, 'thon', 1);
    adjust(adjust(first, 5), 2);
    expect(before).toEqual(expected);
    expect(first.operation.quantity).toBe(1);
  });
});
