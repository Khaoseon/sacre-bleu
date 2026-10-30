import { demo } from './demo';
import { categories, MAX_QUANTITY, StaleOperationError, units, type State } from './model';
import { isExternalReference } from './productInfo';
import type { ReserveSnapshot } from './backend/contracts';
import { parseBackup, validateBackup, type UserBackup } from './model';

export function backupSnapshot(snapshot: ReserveSnapshot): UserBackup {
  if (snapshot.products.some((p) => p.photo_path !== null))
    throw new Error(
      'Une photo privée nécessite une sauvegarde administrative. Export utilisateur interrompu pour éviter une copie incomplète.',
    );
  return validateBackup({
    format: 'sacre-bleu',
    version: 1,
    exportedAt: new Date().toISOString(),
    products: snapshot.products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      brand: p.brand,
      size: p.size,
      unit: p.unit,
      category: p.category,
      quantity: p.quantity,
      minimum: p.minimum,
      off_barcode: p.off_barcode,
      off_image_url: p.off_image_url,
      updatedAt: new Date(p.updated_at).toISOString(),
    })),
    shopping: snapshot.shopping.map((s) => ({
      id: s.id,
      product_id: s.product_id,
      name: s.name,
      quantity: s.quantity,
      checked: s.checked,
    })),
  });
}
export function downloadBackup(backup: UserBackup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `sacre-bleu-${backup.exportedAt.replace(/[:.]/g, '-')}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface CachedReserve {
  snapshot: ReserveSnapshot;
  syncedAt: number;
}
export class PrivateReserveCache {
  private prefix: string;
  constructor(
    private providedStorage: Storage | (() => Storage),
    scope: string,
  ) {
    this.prefix = `app-reserve.private.v1:${scope}:`;
  }
  private get storage() {
    return typeof this.providedStorage === 'function'
      ? this.providedStorage()
      : this.providedStorage;
  }
  clear() {
    // Remove the owner first so an old store cannot repopulate this cache.
    this.storage.removeItem(this.prefix + 'owner');
    for (const key of Object.keys(this.storage))
      if (key.startsWith(this.prefix)) this.storage.removeItem(key);
  }
  activate(userId: string) {
    if (this.storage.getItem(this.prefix + 'owner') !== userId) {
      this.clear();
      this.storage.setItem(this.prefix + 'owner', userId);
    }
  }
  read(userId: string, reserveId?: string): CachedReserve | null {
    try {
      if (this.storage.getItem(this.prefix + 'owner') !== userId) return null;
      const value = JSON.parse(this.storage.getItem(this.prefix + userId) ?? 'null');
      if (
        !value ||
        value.version !== 1 ||
        !Number.isSafeInteger(value.syncedAt) ||
        value.syncedAt <= 0 ||
        value.syncedAt > Date.now() + 60000 ||
        typeof value.snapshot.reserve.id !== 'string' ||
        typeof value.snapshot.reserve.name !== 'string' ||
        typeof value.snapshot.reserve.owner_id !== 'string' ||
        !Number.isSafeInteger(value.snapshot.reserve.revision) ||
        value.snapshot.reserve.revision < 0 ||
        value.snapshot.reserve.id !== (reserveId ?? value.snapshot.reserve.id) ||
        !value.snapshot.members.some((m: { user_id: string }) => m.user_id === userId) ||
        [...value.snapshot.products, ...value.snapshot.shopping, ...value.snapshot.members].some(
          (row: { reserve_id: string }) => row.reserve_id !== value.snapshot.reserve.id,
        )
      )
        return null;
      // Validate the portable domain and its links before displaying local bytes.
      parseBackup(JSON.stringify(backupSnapshot(value.snapshot)));
      return { snapshot: value.snapshot, syncedAt: value.syncedAt };
    } catch {
      return null;
    }
  }
  write(userId: string, snapshot: ReserveSnapshot, syncedAt: number) {
    if (this.storage.getItem(this.prefix + 'owner') !== userId) return;
    // Detect an unreadable/unsupported copy before claiming it was saved.
    parseBackup(JSON.stringify(backupSnapshot(snapshot)));
    const previous = this.read(userId, snapshot.reserve.id);
    if (previous && previous.snapshot.reserve.revision > snapshot.reserve.revision) return;
    this.storage.setItem(this.prefix + userId, JSON.stringify({ version: 1, snapshot, syncedAt }));
  }
}
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
