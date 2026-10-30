import { describe, expect, it, vi } from 'vitest';
import { parseBackup, validateBackup, type UserBackup } from './model';
import { backupSnapshot, downloadBackup, PrivateReserveCache } from './storage';
import type { ReserveSnapshot } from './backend/contracts';
import { SharedPantryStore } from './backend/store';
import type { ReserveBackend } from './backend/contracts';
import { BackendError } from './backend/errors';
import { SupabaseBackend } from './backend/adapter';
import type { Client } from './backend/client';

const id = '00000000-0000-0000-0000-000000000101';
const item = '00000000-0000-0000-0000-000000000102';
export const backupFixture = (): UserBackup => ({
  format: 'sacre-bleu',
  version: 1,
  exportedAt: '2026-10-30T10:00:00.000Z',
  products: [
    {
      id,
      name: 'Riz',
      barcode: '00123456',
      brand: null,
      size: 500,
      unit: 'g',
      category: 'Féculents',
      quantity: 0,
      minimum: 2,
      off_barcode: null,
      off_image_url: null,
      updatedAt: '2026-10-30T09:00:00.000Z',
    },
  ],
  shopping: [{ id: item, product_id: id, name: 'Riz', quantity: 3, checked: false }],
});
const snapshotFixture = (): ReserveSnapshot => ({
  reserve: { id: 'r', name: 'Réserve', owner_id: 'u', revision: 3, created_at: '', updated_at: '' },
  members: [{ reserve_id: 'r', user_id: 'u', role: 'owner', joined_at: '' }],
  products: backupFixture().products.map((p) => ({
    ...p,
    reserve_id: 'r',
    photo_path: null,
    updated_at: p.updatedAt,
    stock_version: 1,
  })),
  shopping: backupFixture().shopping.map((s) => ({
    ...s,
    reserve_id: 'r',
    version: 1,
    created_at: '',
    updated_at: '',
  })),
});
function storageFixture(): Storage {
  const result = {} as Storage;
  Object.defineProperties(result, {
    getItem: { value: (k: string) => (Object.hasOwn(result, k) ? String(result[k]) : null) },
    setItem: {
      value: (k: string, v: string) => {
        result[k] = v;
      },
    },
    removeItem: {
      value: (k: string) => {
        delete result[k];
      },
    },
  });
  return result;
}
describe('portable user backup', () => {
  it('never downloads a file too large to restore', () => {
    const b = backupFixture();
    b.products[0].name = 'é'.repeat(1_000_001);
    expect(() => downloadBackup(b)).toThrow(/volumineux/);
  });
  it('roundtrips exhausted products, leading zero barcodes, quantities and links without Auth', () => {
    const b = backupSnapshot(snapshotFixture());
    expect(parseBackup(JSON.stringify(b)).products).toEqual(backupFixture().products);
    expect(b.shopping).toEqual(backupFixture().shopping);
    expect(Object.keys(b)).toEqual(['format', 'version', 'exportedAt', 'products', 'shopping']);
  });
  const invalid: [string, (b: UserBackup) => void][] = [
    [
      'future version',
      (b) => {
        Object.assign(b, { version: 2 });
      },
    ],
    [
      'extra field',
      (b) => {
        Object.assign(b, { auth: {} });
      },
    ],
    [
      'missing field',
      (b) => {
        delete (b.products[0] as Partial<UserBackup['products'][number]>).brand;
      },
    ],
    [
      'fraction',
      (b) => {
        b.products[0].quantity = 1.5;
      },
    ],
    [
      'negative',
      (b) => {
        b.products[0].quantity = -1;
      },
    ],
    [
      'overflow',
      (b) => {
        b.products[0].quantity = 10000;
      },
    ],
    [
      'duplicate id',
      (b) => {
        b.products.push({ ...b.products[0], barcode: null });
      },
    ],
    [
      'duplicate barcode',
      (b) => {
        b.products.push({ ...b.products[0], id: item });
      },
    ],
    [
      'duplicate shopping id',
      (b) => {
        b.shopping.push({ ...b.shopping[0], checked: true });
      },
    ],
    [
      'duplicate active linked shopping',
      (b) => {
        b.shopping.push({ ...b.shopping[0], id: '00000000-0000-0000-0000-000000000103' });
      },
    ],
    [
      'broken link',
      (b) => {
        b.shopping[0].product_id = item;
      },
    ],
    [
      'string boolean',
      (b) => {
        Object.assign(b.shopping[0], { checked: 'false' });
      },
    ],
    [
      'unchecked zero',
      (b) => {
        b.shopping[0].quantity = 0;
      },
    ],
    [
      'invalid unit pair',
      (b) => {
        b.products[0].size = null;
      },
    ],
    [
      'unsafe image',
      (b) => {
        b.products[0].off_image_url = 'https://evil.test/a.jpg';
      },
    ],
    [
      'path as image',
      (b) => {
        b.products[0].off_barcode = '1234';
        b.products[0].off_image_url = 'https://images.openfoodfacts.org/images/products/../a.jpg';
      },
    ],
    [
      'malformed date',
      (b) => {
        b.products[0].updatedAt = '2026-02-30T10:00:00.000Z';
      },
    ],
    [
      'too many rows',
      (b) => {
        b.products = Array(2001).fill(b.products[0]);
      },
    ],
    [
      'oversized name',
      (b) => {
        b.products[0].name = 'é'.repeat(121);
      },
    ],
  ];
  it.each(invalid)('rejects %s without modifying input', (_name, change) => {
    const b = backupFixture();
    change(b);
    const raw = JSON.stringify(b);
    expect(() => parseBackup(raw)).toThrow();
    expect(JSON.stringify(b)).toBe(raw);
  });
  it('rejects malformed and oversized JSON and null', () => {
    expect(() => parseBackup('{')).toThrow();
    expect(() => parseBackup(' '.repeat(2_000_001))).toThrow();
    expect(() => validateBackup(null)).toThrow();
  });
  it('refuses an incomplete private photo export', () => {
    const s = snapshotFixture();
    s.products[0].photo_path = 'r/p/a.webp';
    expect(() => backupSnapshot(s)).toThrow(/photo privée/);
  });
});
describe('private offline copy', () => {
  it('never sends an anonymous RPC when an expired session is temporarily unavailable', async () => {
    const rpc = vi.fn();
    const client = {
      auth: { getSession: async () => ({ data: { session: null }, error: new Error('network') }) },
      rpc,
    } as unknown as Client;
    const backend = new SupabaseBackend(client);
    await expect(backend.getSnapshot('r')).rejects.toMatchObject({ kind: 'unavailable' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('removes private memory on revoked access even if disk cleanup fails', async () => {
    const storage = storageFixture(),
      cache = new PrivateReserveCache(() => {
        throw new Error('blocked');
      }, 'A');
    let revoked = false;
    const backend = {
      getSnapshot: async () => {
        if (revoked) throw new BackendError('refus', 'rejected', '42501');
        return snapshotFixture();
      },
    } as unknown as ReserveBackend;
    const store = new SharedPantryStore(backend, 'u', 'r', storage, () => true, 100, cache);
    await store.refresh();
    revoked = true;
    await store.refresh();
    expect(store.getSnapshot().snapshot).toBeNull();
    expect(store.getSnapshot().cacheError).toMatch(/effacement/);
    expect(store.writable).toBe(false);
  });
  it('keeps the latest confirmed revision across two clients', () => {
    const storage = storageFixture(),
      cache = new PrivateReserveCache(storage, 'A');
    cache.activate('u');
    const latest = snapshotFixture();
    latest.reserve.revision = 5;
    cache.write('u', latest, Date.now());
    cache.write('u', snapshotFixture(), Date.now());
    expect(cache.read('u')?.snapshot.reserve.revision).toBe(5);
  });
  it('reports quota failure while keeping the confirmed online result', async () => {
    const storage = storageFixture(),
      cache = new PrivateReserveCache(storage, 'A');
    cache.activate('u');
    const broken = new PrivateReserveCache(() => {
      throw new Error('quota');
    }, 'A');
    const backend = { getSnapshot: async () => snapshotFixture() } as unknown as ReserveBackend;
    const store = new SharedPantryStore(backend, 'u', 'r', storage, () => true, 100, broken);
    await store.refresh();
    expect(store.getSnapshot().snapshot?.reserve.revision).toBe(3);
    expect(store.getSnapshot().cacheError).toMatch(/pas pu/);
    expect(store.writable).toBe(true);
  });
  it('isolates projects, accounts and reserves and erases old copies on account switch', () => {
    const storage = storageFixture(),
      a = new PrivateReserveCache(storage, 'A'),
      b = new PrivateReserveCache(storage, 'B');
    a.activate('u');
    a.write('u', snapshotFixture(), Date.now());
    expect(a.read('u', 'r')?.snapshot.products[0].quantity).toBe(0);
    expect(a.read('u', 'other')).toBeNull();
    expect(a.read('v')).toBeNull();
    expect(b.read('u')).toBeNull();
    a.activate('v');
    expect(a.read('u')).toBeNull();
    a.write('u', snapshotFixture(), Date.now());
    expect(a.read('u')).toBeNull();
    a.clear();
    expect(Object.keys(storage)).toHaveLength(0);
  });
  it('ignores corrupt or incoherent local bytes', () => {
    const storage = storageFixture(),
      cache = new PrivateReserveCache(storage, 'A');
    cache.activate('u');
    cache.write('u', snapshotFixture(), Date.now());
    const key = Object.keys(storage).find((k) => k.endsWith(':u'))!;
    storage.setItem(key, '{');
    expect(cache.read('u')).toBeNull();
    const s = snapshotFixture();
    s.shopping[0].product_id = 'missing';
    expect(() => cache.write('u', s, Date.now())).toThrow();
    storage.setItem(key, JSON.stringify({ version: 1, snapshot: s, syncedAt: Date.now() }));
    expect(cache.read('u')).toBeNull();
  });
  it('loads offline after reopening, blocks all writes, then refreshes successfully', async () => {
    const storage = storageFixture(),
      cache = new PrivateReserveCache(storage, 'A');
    cache.activate('u');
    cache.write('u', snapshotFixture(), Date.now());
    let online = false,
      calls = 0;
    const backend = {
      getSnapshot: async () => snapshotFixture(),
      execute: async () => {
        calls++;
        return { revision: 4 };
      },
    } as unknown as ReserveBackend;
    const store = new SharedPantryStore(backend, 'u', 'r', storage, () => online, 100, cache);
    expect(store.getSnapshot().status).toBe('offline');
    expect(store.getSnapshot().snapshot?.products).toHaveLength(1);
    expect(await store.restore(backupFixture(), 3)).toBe(false);
    expect(calls).toBe(0);
    expect(store.getSnapshot().pending).toBeNull();
    online = true;
    await store.refresh();
    expect(store.writable).toBe(true);
  });
  it('does not recreate a purged cache from a late response after disposal', async () => {
    const storage = storageFixture(),
      cache = new PrivateReserveCache(storage, 'A');
    cache.activate('u');
    let done!: (s: ReserveSnapshot) => void;
    const backend = {
      getSnapshot: () =>
        new Promise<ReserveSnapshot>((r) => {
          done = r;
        }),
    } as unknown as ReserveBackend;
    const store = new SharedPantryStore(backend, 'u', 'r', storage, () => true, 100, cache),
      read = store.refresh();
    store.dispose();
    cache.clear();
    done(snapshotFixture());
    await read;
    expect(Object.keys(storage)).toHaveLength(0);
    expect(store.getSnapshot().snapshot).toBeNull();
  });
});
