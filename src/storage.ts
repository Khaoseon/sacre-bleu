import { demo } from './demo';
import { categories, MAX_QUANTITY, StaleOperationError, units, type State } from './model';
import { isExternalReference } from './productInfo';
export const STORAGE_KEY = 'app-reserve.local.v1';
export function load(): State {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return demo();
  return parseState(raw);
}
export function parseState(raw: string): State {
  const state = JSON.parse(raw);
  const count = (v: unknown) =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= MAX_QUANTITY;
  const optionalText = (v: unknown) => v === undefined || typeof v === 'string';
  if (
    !state ||
    state.version !== 1 ||
    !Array.isArray(state.products) ||
    !Array.isArray(state.shopping) ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 0 ||
    !['name', 'recent'].includes(state.sort)
  )
    throw new Error('La sauvegarde locale est illisible.');
  const ids = new Set<string>();
  const barcodes = new Set<string>();
  for (const p of state.products) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      !p.id ||
      ids.has(p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      !count(p.quantity) ||
      !optionalText(p.brand) ||
      (p.external !== undefined && !isExternalReference(p.external)) ||
      (p.barcode !== undefined &&
        (typeof p.barcode !== 'string' ||
          !/^\d{4,32}$/.test(p.barcode) ||
          barcodes.has(p.barcode))) ||
      (p.size !== undefined &&
        (typeof p.size !== 'number' || !Number.isFinite(p.size) || p.size <= 0)) ||
      (p.unit !== undefined && !units.includes(p.unit)) ||
      (p.category !== undefined && !categories.includes(p.category)) ||
      (p.minimum !== undefined && !count(p.minimum)) ||
      typeof p.updatedAt !== 'string' ||
      !Number.isFinite(Date.parse(p.updatedAt)) ||
      (p.photo !== undefined &&
        (typeof p.photo !== 'string' ||
          !/^data:image\/(jpeg|png|webp);base64,/.test(p.photo) ||
          p.photo.length > 700_000))
    )
      throw new Error('La sauvegarde contient un produit invalide.');
    ids.add(p.id);
    if (p.barcode) barcodes.add(p.barcode);
  }
  const itemIds = new Set<string>();
  for (const item of state.shopping) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      !item.id ||
      itemIds.has(item.id) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      !count(item.quantity) ||
      typeof item.checked !== 'boolean' ||
      (!item.checked && item.quantity === 0) ||
      (item.productId !== undefined && !ids.has(item.productId))
    )
      throw new Error('La sauvegarde contient un article de courses invalide.');
    itemIds.add(item.id);
  }
  return state as State;
}
export function persist(next: State, expectedRevision: number): State {
  const raw = localStorage.getItem(STORAGE_KEY);
  if ((!raw && expectedRevision !== 0) || (raw && JSON.parse(raw).revision !== expectedRevision))
    throw new StaleOperationError(
      'Les données ont changé dans un autre onglet. Rechargez la page.',
    );
  const saved = { ...next, revision: expectedRevision + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return saved;
}
