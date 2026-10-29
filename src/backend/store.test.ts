import { describe, expect, it, vi } from 'vitest';
import { clearPrivateIntents, PENDING_PREFIX, SharedPantryStore } from './store';
import { BackendError } from './errors';
import type { ReserveBackend, ReserveSnapshot } from './contracts';
import { ScanRecognition } from '../model';
const snapshot = (revision = 1): ReserveSnapshot => ({
  reserve: { id: 'r', name: 'Réserve', owner_id: 'u', revision, created_at: '', updated_at: '' },
  members: [],
  products: [],
  shopping: [],
});
function setup(requestTimeoutMs = 12000) {
  const data = new Map<string, string>();
  const journal = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  const execute = vi.fn<ReserveBackend['execute']>().mockResolvedValue({ revision: 2 });
  const getSnapshot = vi.fn<ReserveBackend['getSnapshot']>().mockResolvedValue(snapshot());
  const backend = { execute, getSnapshot } as unknown as ReserveBackend;
  let online = true;
  const store = new SharedPantryStore(backend, 'u', 'r', journal, () => online, requestTimeoutMs);
  return {
    store,
    backend,
    execute,
    getSnapshot,
    data,
    journal,
    disconnect: () => {
      online = false;
    },
  };
}
const command = { action: 'stock', payload: { product_id: 'p', delta: 1 } } as const;
describe('camera intentions through the existing shared store', () => {
  it('bounds a hung polling read, ignores its late result and resumes scanning without a reload', async () => {
    const f = setup(20);
    await f.store.refresh();
    let late!: (value: ReserveSnapshot) => void;
    f.getSnapshot.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          late = resolve;
        }),
    );
    const polling = f.store.refresh();
    f.execute.mockResolvedValue({ revision: 2, product_id: 'local' });
    f.getSnapshot.mockResolvedValue(snapshot(2));
    const mutation = f.store.scanProduct('local', 1);
    await polling;
    expect(await mutation).toBe(true);
    late(snapshot(1));
    await Promise.resolve();
    expect(f.store.getSnapshot().snapshot?.reserve.revision).toBe(2);
    expect(f.store.getSnapshot().lastProductId).toBe('local');
    expect(f.store.writable).toBe(true);
  });
  it('keeps the local scan identity after a remote revision and a local catalogue edit', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockResolvedValue({
      revision: 2,
      product_id: 'local',
      scan_id: 'scan',
      processed: 1,
      stock: 1,
      scan_version: 1,
    });
    f.getSnapshot.mockResolvedValue(snapshot(3));
    expect(await f.store.scanProduct('local', 1)).toBe(true);
    expect(f.store.getSnapshot().scan).toBeNull();
    expect(f.store.getSnapshot().lastProductId).toBe('local');
    f.execute.mockResolvedValue({ revision: 3, product_id: 'edited' });
    await f.store.saveProduct(
      { id: 'edited', name: 'Autre produit', quantity: 0, updatedAt: '' },
      true,
    );
    expect(f.store.getSnapshot().lastProductId).toBe('local');
  });
  it('does not publish a mismatched receipt as a different local product', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockResolvedValue({ revision: 2, product_id: 'remote' });
    expect(await f.store.scanProduct('local', 1)).toBe(false);
    expect(f.store.getSnapshot().lastProductId).toBeNull();
    expect(f.store.getSnapshot().completed).toBe(0);
    expect(f.store.getSnapshot().pending).not.toBeNull();
  });
  it('retains an uncertain write key after timeout; late receipt cannot trigger a second success', async () => {
    const f = setup(20);
    await f.store.refresh();
    let late!: (value: { revision: number; product_id: string }) => void;
    f.execute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          late = resolve;
        }),
    );
    expect(await f.store.scanProduct('local', 1)).toBe(false);
    const key = f.execute.mock.calls[0][0];
    expect(f.store.getSnapshot().pending).not.toBeNull();
    late({ revision: 2, product_id: 'local' });
    await Promise.resolve();
    expect(f.store.getSnapshot().completed).toBe(0);
    f.execute.mockResolvedValue({ revision: 2, product_id: 'local' });
    f.getSnapshot.mockResolvedValue(snapshot(2));
    expect(await f.store.resume()).toBe(true);
    expect(f.execute.mock.calls[1][0]).toBe(key);
    expect(f.store.getSnapshot().completed).toBe(1);
  });
  it('blocks duplicates until both the receipt AND coherent stock/shopping are available', async () => {
    const f = setup();
    await f.store.refresh();
    let releaseReceipt!: (value: { revision: number }) => void;
    let releaseSnapshot!: (value: ReserveSnapshot) => void;
    f.execute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseReceipt = resolve;
        }),
    );
    f.getSnapshot.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseSnapshot = resolve;
        }),
    );
    const first = f.store.scanProduct('p', 1);
    expect(f.store.getSnapshot().busy).toBe(true);
    expect(f.store.getSnapshot().notice).toBe('');
    expect(await f.store.scanProduct('p', 1)).toBe(false);
    expect(f.execute).toHaveBeenCalledOnce();
    releaseReceipt({ revision: 2 });
    await vi.waitFor(() => expect(releaseSnapshot).toBeTypeOf('function'));
    expect(f.store.getSnapshot().completed).toBe(0);
    expect(f.store.getSnapshot().snapshot?.reserve.revision).toBe(1);
    expect(f.store.writable).toBe(false);
    const confirmed = snapshot(2);
    confirmed.shopping = [
      {
        id: 's',
        reserve_id: 'r',
        product_id: 'p',
        name: 'Produit',
        quantity: 0,
        checked: true,
        version: 2,
        created_at: '',
        updated_at: '',
      },
    ];
    releaseSnapshot(confirmed);
    expect(await first).toBe(true);
    expect(f.store.getSnapshot().snapshot).toBe(confirmed);
    expect(f.store.getSnapshot().snapshot?.shopping[0]).toMatchObject({
      quantity: 0,
      checked: true,
    });
    expect(f.store.getSnapshot().completed).toBe(1);
  });
  it('recovers an uncertain scan with the same key; mode changes only affect the next intention', async () => {
    const f = setup();
    await f.store.refresh();
    const recognition = new ScanRecognition();
    const code = '4006381333931';
    [0, 150, 300].forEach((time) => recognition.observe(code, time));
    f.execute.mockRejectedValueOnce(new BackendError('Réponse perdue', 'uncertain'));
    expect(await f.store.scanProduct('p', 1)).toBe(false);
    const pendingId = f.execute.mock.calls[0][0];
    expect(await f.store.scanProduct('p', -1)).toBe(false);
    expect(f.execute).toHaveBeenCalledOnce();
    recognition.suspend();
    f.execute.mockResolvedValue({
      revision: 2,
      scan_id: 'scan',
      scan_version: 1,
      processed: 1,
      stock: 1,
    });
    f.getSnapshot.mockResolvedValue(snapshot(2));
    expect(await f.store.resume()).toBe(true);
    expect(f.execute.mock.calls[1]).toEqual([
      pendingId,
      'r',
      { action: 'scan', payload: { product_id: 'p', delta: 1 } },
    ]);
    expect(f.store.getSnapshot().scan?.mode).toBe(1);
    for (let time = 6000; time < 9000; time += 150)
      expect(recognition.observe(code, time)).toBeNull();
    // Explicit repeat bypasses camera recognition, with its own idempotency key and current mode.
    recognition.hold(code);
    await f.store.scanProduct('p', -1);
    expect(f.execute.mock.calls[2][0]).not.toBe(pendingId);
    expect(f.execute.mock.calls[2][2]).toEqual({
      action: 'scan',
      payload: { product_id: 'p', delta: -1 },
    });
  });
});
describe('shared store: confirmation and idempotent recovery', () => {
  it('does not announce success before both RPC and current snapshot', async () => {
    const f = setup();
    await f.store.refresh();
    let release!: (value: { revision: number }) => void;
    f.execute.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const result = f.store.mutate([command], 'Fait');
    expect(f.store.getSnapshot().busy).toBe(true);
    expect(f.store.getSnapshot().notice).toBe('');
    release({ revision: 2 });
    f.getSnapshot.mockResolvedValue(snapshot(2));
    expect(await result).toBe(true);
    expect(f.store.getSnapshot().snapshot?.reserve.revision).toBe(2);
    expect(f.store.getSnapshot().notice).toBe('Fait');
    expect(f.data.size).toBe(0);
  });
  it('keeps the exact UUID and parameters after an uncertain write, including reload', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockRejectedValueOnce(new BackendError('Interrupted', 'uncertain'));
    expect(await f.store.mutate([command], 'Fait')).toBe(false);
    expect(f.store.getSnapshot().notice).toBe('');
    expect(f.store.writable).toBe(false);
    expect(await f.store.mutate([command], 'Autre')).toBe(false);
    const restored = new SharedPantryStore(f.backend, 'u', 'r', f.journal, () => true);
    await restored.refresh();
    f.getSnapshot.mockResolvedValue(snapshot(2));
    expect(await restored.resume()).toBe(true);
    expect(f.execute.mock.calls[1]).toEqual(f.execute.mock.calls[0]);
    expect(f.execute).toHaveBeenCalledTimes(2);
  });
  it('replays the same request if snapshot reload failed after a successful RPC', async () => {
    const f = setup();
    await f.store.refresh();
    f.getSnapshot.mockRejectedValueOnce(new Error('network'));
    expect(await f.store.mutate([command], 'Fait')).toBe(false);
    expect(f.store.getSnapshot().pending).not.toBeNull();
    f.getSnapshot.mockResolvedValue(snapshot(2));
    expect(await f.store.resume()).toBe(true);
    expect(f.execute.mock.calls[1]).toEqual(f.execute.mock.calls[0]);
  });
  it('does not announce success if the snapshot is older than the committed receipt', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockResolvedValue({ revision: 3 });
    f.getSnapshot.mockResolvedValue(snapshot(2));
    expect(await f.store.mutate([command], 'Fait')).toBe(false);
    expect(f.store.getSnapshot().notice).toBe('');
    expect(f.store.getSnapshot().snapshot?.reserve.revision).toBe(1);
    expect(f.store.getSnapshot().pending).not.toBeNull();
    f.getSnapshot.mockResolvedValue(snapshot(3));
    expect(await f.store.resume()).toBe(true);
    expect(f.execute.mock.calls[1]).toEqual(f.execute.mock.calls[0]);
  });
  it('does not repeat confirmed earlier steps of an unknown product chain', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute
      .mockResolvedValueOnce({ revision: 2 })
      .mockRejectedValueOnce(new BackendError('interrupted', 'uncertain'))
      .mockResolvedValueOnce({ revision: 3 });
    f.getSnapshot.mockResolvedValue(snapshot(2));
    const create = {
      action: 'create_product',
      payload: { id: 'p', name: 'Inconnu', initial_quantity: 0 },
    } as const;
    expect(await f.store.mutate([create, command], 'Produit enregistré.')).toBe(false);
    expect(f.store.getSnapshot().snapshot?.reserve.revision).toBe(2);
    expect(f.store.getSnapshot().pending?.index).toBe(1);
    await f.store.resume();
    expect(f.execute.mock.calls.map((call) => call[2].action)).toEqual([
      'create_product',
      'stock',
      'stock',
    ]);
    expect(f.execute.mock.calls[1][0]).toBe(f.execute.mock.calls[2][0]);
  });
  it('invalidates a scan when another revision arrives, without changing quantities itself', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockResolvedValue({
      revision: 2,
      scan_id: 'scan',
      scan_version: 1,
      processed: 1,
      stock: 4,
    });
    f.getSnapshot.mockResolvedValue(snapshot(2));
    await f.store.scanProduct('p', 1);
    expect(f.store.getSnapshot().scan?.limit).toBe(9996);
    f.getSnapshot.mockResolvedValue(snapshot(3));
    await f.store.refresh();
    expect(f.store.getSnapshot().scan).toBeNull();
    expect(f.store.getSnapshot().scanInvalidation).toContain('invalidé');
  });
  it('uses absolute adjusted totals and the latest server scan version', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute
      .mockResolvedValueOnce({
        revision: 2,
        scan_id: 'scan',
        scan_version: 1,
        processed: 1,
        stock: 4,
      })
      .mockResolvedValueOnce({
        revision: 3,
        scan_id: 'scan',
        scan_version: 2,
        processed: 2,
        stock: 5,
      })
      .mockResolvedValueOnce({
        revision: 4,
        scan_id: 'scan',
        scan_version: 3,
        processed: 1,
        stock: 4,
      })
      .mockResolvedValueOnce({ revision: 5, scan_id: 'scan', cancelled: true });
    f.getSnapshot
      .mockResolvedValueOnce(snapshot(2))
      .mockResolvedValueOnce(snapshot(3))
      .mockResolvedValueOnce(snapshot(4))
      .mockResolvedValueOnce(snapshot(5));
    await f.store.scanProduct('p', 1);
    await f.store.adjustScan(1);
    await f.store.adjustScan(-1);
    await f.store.undoScan();
    expect(f.execute.mock.calls.slice(1).map((call) => call[2].payload)).toEqual([
      { scan_id: 'scan', expected_version: 1, quantity: 2 },
      { scan_id: 'scan', expected_version: 2, quantity: 1 },
      { scan_id: 'scan', expected_version: 3 },
    ]);
    expect(new Set(f.execute.mock.calls.map((call) => call[0])).size).toBe(4);
    expect(f.store.getSnapshot().scan).toBeNull();
  });
  it('refuses offline writes and keeps last success timestamp when a read fails', async () => {
    const f = setup();
    await f.store.refresh();
    const time = f.store.getSnapshot().syncedAt;
    f.getSnapshot.mockRejectedValue(new Error('network'));
    await f.store.refresh();
    expect(f.store.getSnapshot().status).toBe('stale');
    expect(f.store.getSnapshot().syncedAt).toBe(time);
    f.disconnect();
    expect(await f.store.mutate([command], 'Fait')).toBe(false);
    expect(f.execute).not.toHaveBeenCalled();
  });
  it('keeps pending intents isolated by user and reserve', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockRejectedValueOnce(new Error('network'));
    await f.store.mutate([command], 'Fait');
    expect(
      new SharedPantryStore(f.backend, 'other', 'r', f.journal).getSnapshot().pending,
    ).toBeNull();
    expect(
      new SharedPantryStore(f.backend, 'u', 'other', f.journal).getSnapshot().pending,
    ).toBeNull();
  });
  it('does not publish a delayed private read after disposal', async () => {
    const f = setup();
    let release!: (value: ReserveSnapshot) => void;
    f.getSnapshot.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const listener = vi.fn();
    f.store.subscribe(listener);
    const read = f.store.refresh();
    f.store.dispose();
    release(snapshot());
    await read;
    expect(f.store.getSnapshot().snapshot).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });
  it('coalesces simultaneous refreshes', async () => {
    const f = setup();
    await Promise.all([f.store.refresh(), f.store.refresh(), f.store.refresh()]);
    expect(f.getSnapshot).toHaveBeenCalledTimes(1);
  });
  it('removes private retry intents at sign-out without touching demo, theme or sort', () => {
    const entries: Record<string, unknown> = {
      [PENDING_PREFIX + 'u:r']: '{}',
      'app-reserve.local.v1': 'demo',
      'app-reserve.theme.v1': 'dark',
      'app-reserve.sort.v1': 'recent',
    };
    entries.removeItem = (key: string) => {
      delete entries[key];
    };
    clearPrivateIntents(entries as unknown as Storage);
    expect(entries[PENDING_PREFIX + 'u:r']).toBeUndefined();
    expect(entries['app-reserve.local.v1']).toBe('demo');
    expect(entries['app-reserve.theme.v1']).toBe('dark');
    expect(entries['app-reserve.sort.v1']).toBe('recent');
  });
  it('blocks new writes with an unreadable retry journal, even after a successful refresh', async () => {
    const f = setup();
    f.journal.setItem(`${PENDING_PREFIX}u:r`, 'broken');
    const store = new SharedPantryStore(f.backend, 'u', 'r', f.journal, () => true);
    await store.refresh();
    expect(store.writable).toBe(false);
    expect(store.getSnapshot().error).toContain('illisible');
    expect(await store.mutate([command], 'Fait')).toBe(false);
    expect(f.execute).not.toHaveBeenCalled();
  });
  it('removes the previous snapshot when access is explicitly denied', async () => {
    const f = setup();
    await f.store.refresh();
    f.getSnapshot.mockRejectedValue(new BackendError('Accès refusé', 'rejected', '42501'));
    await f.store.refresh();
    expect(f.store.getSnapshot().snapshot).toBeNull();
    expect(f.store.writable).toBe(false);
  });
  it('does not write if the recovery journal cannot be saved', async () => {
    const f = setup();
    const broken = {
      ...f.journal,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const store = new SharedPantryStore(f.backend, 'u', 'r', broken, () => true);
    await store.refresh();
    expect(await store.mutate([command], 'Fait')).toBe(false);
    expect(f.execute).not.toHaveBeenCalled();
  });
  it('clears rejected commands, refreshes and explicitly invalidates a conflicting scan', async () => {
    const f = setup();
    await f.store.refresh();
    f.execute.mockRejectedValueOnce(new BackendError('Scan périmé', 'rejected', '40001'));
    expect(await f.store.mutate([command], 'Fait')).toBe(false);
    expect(f.store.getSnapshot().pending).toBeNull();
    expect(f.store.getSnapshot().error).toBe('Scan périmé');
    expect(f.store.getSnapshot().scanInvalidation).toBe('Scan périmé');
  });
});
