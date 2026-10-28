import type { MutationReceipt, ReserveBackend, ReserveCommand, ReserveSnapshot } from './contracts';
import { backendError, BackendError } from './errors';
import { MAX_QUANTITY, type Product, type Sort, type State } from '../model';

export const PENDING_PREFIX = 'app-reserve.pending.v1:';
export interface PendingIntent {
  version: 1;
  steps: { id: string; command: ReserveCommand }[];
  index: number;
  label: string;
  productId?: string;
  scanMode?: 1 | -1;
}
export interface SharedScan {
  id: string;
  version: number;
  quantity: number;
  mode: 1 | -1;
  limit: number;
  revision: number;
}
export interface SharedView {
  snapshot: ReserveSnapshot | null;
  status: 'loading' | 'ready' | 'stale' | 'offline' | 'error';
  busy: boolean;
  pending: PendingIntent | null;
  error: string;
  notice: string;
  syncedAt: number | null;
  scan: SharedScan | null;
  scanInvalidation: string;
  lastProductId: string | null;
  completed: number;
  completionLabel: string;
}
type Journal = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function snapshotState(snapshot: ReserveSnapshot, sort: Sort): State {
  return {
    version: 1,
    revision: snapshot.reserve.revision,
    sort,
    products: snapshot.products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode ?? undefined,
      brand: p.brand ?? undefined,
      size: p.size ?? undefined,
      unit: p.unit ?? undefined,
      category: p.category ?? undefined,
      quantity: p.quantity,
      minimum: p.minimum ?? undefined,
      updatedAt: p.updated_at,
      external: p.off_barcode
        ? {
            provider: 'open-food-facts',
            barcode: p.off_barcode,
            imageUrl: p.off_image_url ?? undefined,
          }
        : undefined,
    })),
    shopping: snapshot.shopping.map((i) => ({
      id: i.id,
      productId: i.product_id ?? undefined,
      name: i.name,
      quantity: i.quantity,
      checked: i.checked,
    })),
  };
}
export function clearPrivateIntents(storage: Storage) {
  for (const key of Object.keys(storage))
    if (key.startsWith(PENDING_PREFIX)) storage.removeItem(key);
}
export class SharedPantryStore {
  private view: SharedView;
  private listeners = new Set<() => void>();
  private disposed = false;
  private journalBroken = false;
  private reading: Promise<void> | null = null;
  private readonly key: string;
  constructor(
    readonly backend: ReserveBackend,
    readonly userId: string,
    readonly reserveId: string,
    private journal: Journal,
    private connected: () => boolean = () => navigator.onLine,
  ) {
    this.key = `${PENDING_PREFIX}${userId}:${reserveId}`;
    let pending: PendingIntent | null = null;
    let error = '';
    try {
      const raw = journal.getItem(this.key);
      if (raw) {
        const saved = JSON.parse(raw) as PendingIntent;
        if (
          saved.version !== 1 ||
          !Array.isArray(saved.steps) ||
          !saved.steps.length ||
          !Number.isInteger(saved.index) ||
          saved.index < 0 ||
          saved.index >= saved.steps.length ||
          saved.steps.some((s) => typeof s.id !== 'string' || !s.command?.action)
        )
          throw new Error();
        pending = saved;
        error = 'Une demande reste à vérifier. Reprenez-la avant toute nouvelle modification.';
      }
    } catch {
      this.journalBroken = true;
      error =
        'La demande en attente est illisible. Déconnectez-vous puis reconnectez-vous pour consulter le stock confirmé.';
    }
    this.view = {
      snapshot: null,
      status: 'loading',
      busy: false,
      pending,
      error,
      notice: '',
      syncedAt: null,
      scan: null,
      scanInvalidation: '',
      lastProductId: pending?.productId ?? null,
      completed: 0,
      completionLabel: '',
    };
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<SharedView>) {
    if (this.disposed) return;
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  get writable() {
    return (
      !this.disposed &&
      !this.journalBroken &&
      this.connected() &&
      this.view.status === 'ready' &&
      !this.view.busy &&
      !this.view.pending
    );
  }
  private invalidate(snapshot: ReserveSnapshot) {
    if (this.view.scan && snapshot.reserve.revision !== this.view.scan.revision)
      return {
        scan: null,
        scanInvalidation:
          'Une autre modification a invalidé ce scan. Scannez à nouveau pour ajuster.',
      };
    return {};
  }
  private async readConfirmed() {
    const snapshot = await this.backend.getSnapshot(this.reserveId);
    if (!snapshot)
      throw new BackendError('Vous n’avez plus accès à cette réserve.', 'rejected', '42501');
    return snapshot;
  }
  refresh = async () => {
    if (this.disposed || this.view.busy) return;
    if (!this.connected()) {
      this.publish({ status: 'offline', error: 'Hors ligne. Les modifications sont suspendues.' });
      return;
    }
    if (this.reading) return this.reading;
    this.reading = (async () => {
      try {
        const snapshot = await this.readConfirmed();
        if (this.view.busy) return;
        if (this.view.snapshot && snapshot.reserve.revision < this.view.snapshot.reserve.revision)
          return;
        this.publish({
          snapshot,
          status: 'ready',
          syncedAt: Date.now(),
          ...this.invalidate(snapshot),
          error: this.view.pending || this.journalBroken ? this.view.error : '',
        });
      } catch (error) {
        const failure = backendError(error);
        this.publish({
          status: this.view.snapshot ? 'stale' : 'error',
          error: failure.message,
          ...(failure.code === '42501' ? { snapshot: null, scan: null } : {}),
        });
      } finally {
        this.reading = null;
      }
    })();
    return this.reading;
  };
  offline = () =>
    this.publish({ status: 'offline', error: 'Hors ligne. Les modifications sont suspendues.' });
  dispose() {
    this.disposed = true;
    this.listeners.clear();
    this.view = { ...this.view, snapshot: null, scan: null, pending: null };
  }
  private savePending(pending: PendingIntent | null) {
    if (pending) this.journal.setItem(this.key, JSON.stringify(pending));
    else this.journal.removeItem(this.key);
    this.publish({ pending });
  }
  async mutate(
    commands: ReserveCommand[],
    label: string,
    meta: Pick<PendingIntent, 'productId' | 'scanMode'> = {},
  ): Promise<boolean> {
    if (!this.writable) {
      this.publish({
        error: this.view.pending
          ? 'Reprenez la demande en attente avant une nouvelle action.'
          : 'Actualisez la réserve et attendez la fin de la demande avant de la modifier.',
      });
      return false;
    }
    if (!commands.length) return true;
    try {
      this.savePending({
        version: 1,
        steps: commands.map((command) => ({ id: crypto.randomUUID(), command })),
        index: 0,
        label,
        ...meta,
      });
    } catch {
      this.publish({
        error:
          'Impossible de conserver la clé de reprise sur cet appareil. Aucune demande envoyée.',
      });
      return false;
    }
    return this.resume();
  }
  resume = async (): Promise<boolean> => {
    const pending = this.view.pending;
    if (this.disposed || !pending || this.view.busy) return false;
    if (!this.connected()) {
      this.offline();
      return false;
    }
    this.publish({ busy: true, error: '', notice: '' });
    // A read already in flight must finish before publishing a mutation's snapshot.
    if (this.reading) await this.reading;
    try {
      let receipt: MutationReceipt | undefined;
      let snapshot: ReserveSnapshot | undefined;
      for (let index = pending.index; index < pending.steps.length; index++) {
        if (this.disposed) return false;
        const step = pending.steps[index];
        receipt = await this.backend.execute(step.id, this.reserveId, step.command);
        if (this.disposed) return false;
        // Even a replayed receipt is followed by a CURRENT snapshot, never a historical projection.
        try {
          snapshot = await this.readConfirmed();
          if (snapshot.reserve.revision < receipt.revision)
            throw new Error('Snapshot older than confirmed receipt');
        } catch {
          throw new BackendError(
            'Demande reçue, mais actualisation interrompue. Reprenez pour vérifier le résultat.',
            'uncertain',
          );
        }
        if (this.disposed) return false;
        this.publish({
          snapshot,
          status: 'ready',
          syncedAt: Date.now(),
          ...this.invalidate(snapshot),
        });
        if (index + 1 < pending.steps.length) this.savePending({ ...pending, index: index + 1 });
      }
      if (!receipt || !snapshot) return false;
      let scan: SharedScan | null = null;
      let scanInvalidation = this.view.scan
        ? 'Une autre modification a invalidé ce scan. Scannez à nouveau pour ajuster.'
        : this.view.scanInvalidation;
      if (receipt.scan_id && receipt.cancelled)
        scanInvalidation = 'Dernier scan annulé. Scannez à nouveau pour traiter des exemplaires.';
      else if (
        receipt.scan_id &&
        pending.scanMode &&
        receipt.processed !== undefined &&
        receipt.stock !== undefined &&
        receipt.scan_version !== undefined
      ) {
        if (receipt.revision === snapshot.reserve.revision) {
          const initial = receipt.stock - pending.scanMode * receipt.processed;
          scan = {
            id: receipt.scan_id,
            version: receipt.scan_version,
            quantity: receipt.processed,
            mode: pending.scanMode,
            limit: pending.scanMode === 1 ? MAX_QUANTITY - initial : initial,
            revision: receipt.revision,
          };
          scanInvalidation = '';
        } else
          scanInvalidation =
            'La réserve a déjà changé depuis ce scan. Son ajustement est désactivé.';
      }
      this.savePending(null);
      this.publish({
        busy: false,
        scan,
        scanInvalidation,
        error: '',
        notice: pending.label,
        lastProductId: pending.productId ?? this.view.lastProductId,
        completed: this.view.completed + 1,
        completionLabel: pending.label,
      });
      return true;
    } catch (error) {
      const failure = backendError(error, true);
      if (failure.kind === 'rejected') {
        const message =
          (this.view.pending?.index ?? 0) > 0 &&
          pending.steps[0].command.action === 'create_product'
            ? `${failure.message} La fiche créée est conservée. Fermez ce formulaire puis scannez son code pour réessayer le mouvement.`
            : failure.message;
        try {
          this.savePending(null);
        } catch {
          /* Keep retry information if storage is unavailable. */
        }
        this.publish({
          busy: false,
          error: message,
          scan: null,
          scanInvalidation: failure.code === '40001' ? failure.message : this.view.scanInvalidation,
        });
        await this.refresh();
        this.publish({ error: message });
      } else this.publish({ busy: false, status: 'stale', error: failure.message });
      return false;
    }
  };
  changeStock(p: Product, delta: 1 | -1) {
    return this.mutate(
      [{ action: 'stock', payload: { product_id: p.id, delta } }],
      'Quantité mise à jour.',
    );
  }
  scanProduct(productId: string, mode: 1 | -1) {
    return this.mutate(
      [{ action: 'scan', payload: { product_id: productId, delta: mode } }],
      mode === 1 ? 'Un exemplaire ajouté.' : 'Un exemplaire retiré.',
      { productId, scanMode: mode },
    );
  }
  adjustScan(delta: 1 | -1) {
    const scan = this.view.scan;
    if (!scan) return Promise.resolve(false);
    return this.mutate(
      [
        {
          action: 'adjust_scan',
          payload: {
            scan_id: scan.id,
            expected_version: scan.version,
            quantity: scan.quantity + delta,
          },
        },
      ],
      'Quantité du scan mise à jour.',
      { productId: this.view.lastProductId ?? undefined, scanMode: scan.mode },
    );
  }
  undoScan() {
    const scan = this.view.scan;
    if (!scan) return Promise.resolve(false);
    return this.mutate(
      [{ action: 'undo_scan', payload: { scan_id: scan.id, expected_version: scan.version } }],
      'Dernier scan annulé.',
      { productId: this.view.lastProductId ?? undefined },
    );
  }
  saveProduct(product: Product, existing: boolean, fromScan = false, mode: 1 | -1 = 1) {
    const fields = {
      name: product.name.trim(),
      barcode: product.barcode ?? null,
      brand: product.brand ?? null,
      size: product.size ?? null,
      unit: product.size ? (product.unit ?? null) : null,
      category: product.category ?? null,
      minimum: product.minimum ?? null,
      // Omit new fields for legacy/manual products: compatible with phase 3 Cloud until approval.
      ...(product.external
        ? {
            off_barcode: product.external.barcode,
            off_image_url: product.external.imageUrl ?? null,
          }
        : {}),
    };
    const commands: ReserveCommand[] = existing
      ? [{ action: 'update_product', payload: { product_id: product.id, ...fields } }]
      : [
          {
            action: 'create_product',
            payload: {
              id: product.id,
              ...fields,
              initial_quantity: fromScan && mode === 1 ? 0 : product.quantity,
            },
          },
        ];
    if (!existing && fromScan && mode === 1 && product.quantity > 0)
      commands.push({
        action: 'scan',
        payload: { product_id: product.id, delta: product.quantity },
      });
    return this.mutate(commands, 'Produit enregistré.', {
      productId: product.id,
      scanMode: fromScan && mode === 1 && product.quantity > 0 ? mode : undefined,
    });
  }
  deleteProduct(id: string) {
    return this.mutate(
      [{ action: 'delete_product', payload: { product_id: id } }],
      'Produit supprimé.',
    );
  }
  addShopping(name: string, quantity: number, productId?: string) {
    return this.mutate(
      [{ action: 'add_shopping', payload: { name, quantity, product_id: productId ?? null } }],
      'Article ajouté aux courses.',
    );
  }
  updateShopping(id: string, patch: { checked?: boolean; quantity?: number }) {
    return this.mutate(
      [{ action: 'update_shopping', payload: { shopping_id: id, ...patch } }],
      'Courses mises à jour.',
    );
  }
  deleteShopping(id: string) {
    return this.mutate(
      [{ action: 'delete_shopping', payload: { shopping_id: id } }],
      'Article supprimé.',
    );
  }
  clearChecked() {
    return this.mutate(
      (this.view.snapshot?.shopping ?? [])
        .filter((i) => i.checked)
        .map((i) => ({ action: 'delete_shopping' as const, payload: { shopping_id: i.id } })),
      'Articles cochés retirés.',
    );
  }
}
