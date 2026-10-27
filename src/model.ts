export type Unit = 'g' | 'kg' | 'ml' | 'L' | 'pièce';
export type Category = 'Féculents' | 'Conserves' | 'Légumineuses' | 'Épicerie' | 'Autres';
export type Sort = 'name' | 'recent';
export interface Product {
  id: string;
  name: string;
  barcode?: string;
  brand?: string;
  size?: number;
  unit?: Unit;
  photo?: string;
  category?: Category;
  quantity: number;
  minimum?: number;
  updatedAt: string;
}
export interface ShoppingItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  checked: boolean;
}
export interface State {
  version: 1;
  revision: number;
  products: Product[];
  shopping: ShoppingItem[];
  sort: Sort;
}
export class StaleOperationError extends Error {}
export interface ScanOperation {
  id: string;
  productId: string;
  mode: 1 | -1;
  quantity: number;
  revision: number; // Last successfully persisted revision; rebound by the caller after commit.
  baseline: State; // Starting catalogue used to project the absolute processed quantity.
  before: State; // Undo target; excludes the new product when the scan created it.
}
export interface ScanResult {
  state: State;
  operation: ScanOperation;
}
export const categories: Category[] = [
  'Féculents',
  'Conserves',
  'Légumineuses',
  'Épicerie',
  'Autres',
];
export const units: Unit[] = ['g', 'kg', 'ml', 'L', 'pièce'];
export const MAX_QUANTITY = 9999;
export const id = () => crypto.randomUUID();
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
export function integer(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_QUANTITY)
    throw new Error('La quantité doit être un entier entre 0 et 9 999.');
  return value;
}
export function changeStock(state: State, productId: string, delta: 1 | -1, scan = false): State {
  if (scan) return applyScanQuantity(state, productId, delta, 1);
  const product = state.products.find((p) => p.id === productId);
  if (!product) throw new Error('Ce produit n’existe plus.');
  if (delta < 0 && product.quantity === 0) throw new Error('Ce produit est déjà épuisé.');
  integer(product.quantity + delta);
  return {
    ...state,
    products: state.products.map((p) =>
      p.id === productId
        ? { ...p, quantity: p.quantity + delta, updatedAt: new Date().toISOString() }
        : p,
    ),
  };
}
// Project an absolute total from the baseline, never from a previous deduction.
// The caller persists stock and shopping together before publishing the operation.
function applyScanQuantity(state: State, productId: string, mode: 1 | -1, quantity: number): State {
  integer(quantity);
  if (quantity < 1)
    throw new Error(
      'Le dernier scan doit traiter au moins un exemplaire. Utilisez Annuler pour revenir à zéro.',
    );
  const product = state.products.find((p) => p.id === productId);
  if (!product) throw new Error('Ce produit n’existe plus.');
  const stock = product.quantity + mode * quantity;
  if (stock < 0)
    throw new Error(
      product.quantity === 0 ? 'Ce produit est déjà épuisé.' : 'Stock insuffisant pour ce retrait.',
    );
  integer(stock);
  let remaining = mode === 1 ? quantity : 0;
  return {
    ...state,
    products: state.products.map((p) =>
      p.id === productId ? { ...p, quantity: stock, updatedAt: new Date().toISOString() } : p,
    ),
    shopping: state.shopping.map((item) => {
      if (item.productId !== productId || item.checked || remaining === 0) return item;
      const deducted = Math.min(item.quantity, remaining);
      remaining -= deducted;
      return { ...item, quantity: item.quantity - deducted, checked: item.quantity === deducted };
    }),
  };
}
export function startScan(state: State, productId: string, mode: 1 | -1, quantity = 1): ScanResult {
  return {
    state: applyScanQuantity(state, productId, mode, quantity),
    operation: {
      id: id(),
      productId,
      mode,
      quantity,
      revision: state.revision,
      baseline: state,
      before: state,
    },
  };
}
export function scanQuantityLimit(operation: ScanOperation): number {
  const product = operation.baseline.products.find((p) => p.id === operation.productId);
  if (!product) throw new Error('Ce produit n’existe plus.');
  return operation.mode === 1 ? MAX_QUANTITY - product.quantity : product.quantity;
}
export function adjustScan(state: State, operation: ScanOperation, quantity: number): ScanResult {
  if (state.revision !== operation.revision)
    throw new StaleOperationError(
      'Le dernier scan a été invalidé par une autre modification. Scannez à nouveau.',
    );
  integer(quantity);
  if (quantity < 1)
    throw new Error(
      'Le dernier scan doit traiter au moins un exemplaire. Utilisez Annuler pour revenir à zéro.',
    );
  if (quantity === operation.quantity) return { state, operation };
  const projected = applyScanQuantity(
    operation.baseline,
    operation.productId,
    operation.mode,
    quantity,
  );
  return {
    state: { ...state, products: projected.products, shopping: projected.shopping },
    operation: { ...operation, quantity },
  };
}
export function saveProduct(state: State, product: Product): State {
  if (!product.name.trim()) throw new Error('Donnez un nom au produit.');
  integer(product.quantity);
  if (product.minimum !== undefined) integer(product.minimum);
  if (product.size !== undefined && (!Number.isFinite(product.size) || product.size <= 0))
    throw new Error('Le conditionnement doit être supérieur à zéro.');
  const barcode = product.barcode?.trim() || undefined;
  if (barcode && !/^\d{4,32}$/.test(barcode))
    throw new Error('Le code-barres doit contenir de 4 à 32 chiffres.');
  if (barcode && state.products.some((p) => p.id !== product.id && p.barcode === barcode))
    throw new Error('Ce code-barres appartient déjà à un autre produit.');
  const clean = {
    ...product,
    name: product.name.trim(),
    barcode,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...state,
    products: state.products.some((p) => p.id === clean.id)
      ? state.products.map((p) => (p.id === clean.id ? clean : p))
      : [...state.products, clean],
  };
}
export function addShopping(
  state: State,
  name: string,
  quantity: number,
  productId?: string,
): State {
  if (!name.trim()) throw new Error('Saisissez un article.');
  integer(quantity);
  if (quantity === 0) throw new Error('Ajoutez au moins un emballage.');
  const existing = productId && state.shopping.find((i) => i.productId === productId && !i.checked);
  if (existing) {
    integer(existing.quantity + quantity);
    return {
      ...state,
      shopping: state.shopping.map((i) =>
        i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i,
      ),
    };
  }
  return {
    ...state,
    shopping: [
      ...state.shopping,
      { id: id(), name: name.trim(), quantity, productId, checked: false },
    ],
  };
}
export function suggestions(state: State) {
  return state.products
    .filter(
      (p) =>
        p.minimum !== undefined &&
        p.quantity < p.minimum &&
        !state.shopping.some((i) => i.productId === p.id && !i.checked),
    )
    .map((p) => ({ product: p, quantity: p.minimum! - p.quantity }));
}
export function selectProducts(state: State, query: string, category = 'Tout') {
  return state.products
    .filter(
      (p) =>
        normalize(p.name).includes(normalize(query)) &&
        (category === 'Tout' || p.category === category),
    )
    .sort(
      (a, b) =>
        Number(a.quantity === 0) - Number(b.quantity === 0) ||
        (state.sort === 'recent'
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.name.localeCompare(b.name, 'fr')) ||
        a.name.localeCompare(b.name, 'fr'),
    );
}
export function deleteProduct(state: State, productId: string): State {
  return {
    ...state,
    products: state.products.filter((p) => p.id !== productId),
    shopping: state.shopping.map((i) =>
      i.productId === productId ? { ...i, productId: undefined } : i,
    ),
  };
}
export function undoOperation(current: State, before: State, expectedRevision: number): State {
  if (current.revision !== expectedRevision)
    throw new StaleOperationError('Cette opération ne peut plus être annulée.');
  return { ...before, revision: current.revision };
}
/** Camera reads are GTIN-8/12/13 strings; manual catalogue codes keep their existing contract. */
export function validCameraBarcode(code: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13})$/.test(code) || /^0+$/.test(code)) return false;
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight)
    sum += Number(code[i]) * weight;
  return (10 - (sum % 10)) % 10 === Number(code.at(-1));
}

// UPC-A and its EAN-13 representation identify the same item. Never rewrite stored codes.
export function barcodeIdentity(code: string): string {
  return code.length === 12 ? `0${code}` : code;
}

export function findProductByBarcode(products: Product[], code: string): Product | undefined {
  return (
    products.find((product) => product.barcode === code) ??
    (validCameraBarcode(code)
      ? products.find(
          (product) =>
            product.barcode && barcodeIdentity(product.barcode) === barcodeIdentity(code),
        )
      : undefined)
  );
}

/** One presentation, one intention. Timing alone never releases a code still being read. */
export class ScanRecognition {
  private held = '';
  private candidate = '';
  private hits = 0;
  private first = 0;
  private last = 0;
  private missingSince: number | null = null;
  private misses = 0;

  suspend() {
    this.candidate = '';
    this.hits = 0;
    this.missingSince = null;
    this.misses = 0;
  }

  hold(code: string) {
    this.held = barcodeIdentity(code);
    this.suspend();
  }

  observe(code: string | null, now: number): string | null {
    if (code === null) {
      this.candidate = '';
      this.hits = 0;
      this.missingSince ??= now;
      this.misses++;
      if (this.misses >= 5 && now - this.missingSince >= 1000) this.held = '';
      return null;
    }
    if (!validCameraBarcode(code)) {
      this.suspend();
      return null;
    }
    this.missingSince = null;
    this.misses = 0;
    const identity = barcodeIdentity(code);
    if (identity === this.held) {
      this.candidate = '';
      this.hits = 0;
      return null;
    }
    if (identity !== this.candidate || now - this.last > 500) {
      this.candidate = identity;
      this.hits = 0;
      this.first = now;
    }
    this.last = now;
    this.hits++;
    if (this.hits < 3 || now - this.first < 240) return null;
    this.hold(code);
    return code;
  }
}
