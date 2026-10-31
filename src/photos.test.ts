import { afterEach, expect, it, vi } from 'vitest';
import jpeg from 'jpeg-js';
import { sanitizePhoto } from './photoServer';
import { preparePhoto, stagePhoto, photoDraft, clearPhotoDrafts } from './photos';
import { SharedPantryStore } from './backend/store';
import { BackendError } from './backend/errors';
import { SupabaseBackend } from './backend/adapter';
import type { Client } from './backend/client';
import type { ReserveBackend, ReserveSnapshot } from './backend/contracts';

const image = (width = 2, height = 2) =>
  jpeg.encode({ width, height, data: new Uint8Array(width * height * 4).fill(255) }, 80).data;
afterEach(() => {
  clearPhotoDrafts('account', 'reserve');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('sends photograph bytes once and resolves the identical intention without re-decoding after network loss', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:55321');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  const hash = await stagePhoto(
    'account',
    'reserve',
    `data:image/jpeg;base64,${Buffer.from(image()).toString('base64')}`,
  );
  const transport = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error('network lost'))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ revision: 2, product_id: 'p' }), { status: 200 }),
    );
  vi.stubGlobal('fetch', transport);
  const backend = new SupabaseBackend({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'fixture-token', user: { id: 'account' } } },
      }),
    },
  } as unknown as Client);
  const command = {
    action: 'photo',
    payload: { product_id: 'p', expected_path: null, expected_version: 0, hash },
  } as const;
  await expect(backend.execute('request', 'reserve', command)).rejects.toMatchObject({
    kind: 'uncertain',
  });
  expect(photoDraft('account', 'reserve', hash)).toBeUndefined();
  expect(await backend.execute('request', 'reserve', command)).toEqual({
    revision: 2,
    product_id: 'p',
  });
  expect(transport.mock.calls[0][1]?.body).toBeInstanceOf(Blob);
  expect(transport.mock.calls[1][1]?.body).toBeUndefined();
  expect(transport.mock.calls[1][1]?.headers).toEqual(transport.mock.calls[0][1]?.headers);
});
it('decodes actual JPEG bytes, strips comments/EXIF and retains bounded pixels', () => {
  const raw = {
    width: 2,
    height: 2,
    data: new Uint8Array(16).fill(255),
    comments: ['private GPS text'],
    exifBuffer: Buffer.from('private GPS'),
  };
  const input = jpeg.encode(raw, 80).data;
  const result = sanitizePhoto(input);
  expect(result.width).toBe(2);
  expect(result.height).toBe(2);
  expect(result.bytes.length).toBeLessThanOrEqual(500000);
  expect(Buffer.from(result.bytes).includes(Buffer.from('private GPS'))).toBe(false);
  const decoded = jpeg.decode(result.bytes);
  expect(decoded.comments ?? []).toHaveLength(0);
  expect('exifBuffer' in decoded && decoded.exifBuffer).toBeFalsy();
});
it('rejects malformed, oversized, non-raster and excessive-dimension server input', () => {
  for (const bytes of [
    new Uint8Array(),
    new TextEncoder().encode('<svg onload="evil"/>'),
    new Uint8Array(500001),
    new Uint8Array([255, 216, ...new Array(200).fill(0)]),
    image(1025, 1),
  ])
    expect(() => sanitizePhoto(bytes)).toThrow();
});
it('rejects HEIC/HEIF, wrong types and large input without touching the existing draft', async () => {
  for (const file of [
    new File(['heic'], 'phone.heic', { type: 'image/heic' }),
    new File(['svg'], 'x.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(20000001)], 'large.jpg', { type: 'image/jpeg' }),
  ])
    await expect(preparePhoto(file)).rejects.toThrow();
});
it('keeps upload bodies in one account/reserve memory scope and clears them', async () => {
  const bytes = image();
  const hash = await stagePhoto(
    'account',
    'reserve',
    `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`,
  );
  expect(photoDraft('account', 'reserve', hash)).toEqual(new Uint8Array(bytes));
  expect(photoDraft('other', 'reserve', hash)).toBeUndefined();
  expect(photoDraft('account', 'other', hash)).toBeUndefined();
  clearPhotoDrafts('account', 'reserve');
  expect(photoDraft('account', 'reserve', hash)).toBeUndefined();
});
it('cannot repopulate upload memory when logout happens during hashing', async () => {
  const pending = stagePhoto(
    'account',
    'reserve',
    `data:image/jpeg;base64,${Buffer.from(image()).toString('base64')}`,
  );
  clearPhotoDrafts('account', 'reserve');
  await expect(pending).rejects.toThrow('Impossible de lire');
});
it('does not recreate or rescan a product when retrying a refused photo after earlier steps committed', async () => {
  const data = new Map<string, string>();
  const snapshot: ReserveSnapshot = {
    reserve: {
      id: 'reserve',
      name: 'Pantry',
      owner_id: 'account',
      revision: 0,
      created_at: '',
      updated_at: '',
    },
    products: [],
    members: [],
    shopping: [],
  };
  let refuse = true;
  const execute = vi
    .fn<ReserveBackend['execute']>()
    .mockImplementation(async (_id, _reserve, command) => {
      if (command.action === 'photo' && refuse) {
        refuse = false;
        throw new BackendError('Photo refused', 'rejected');
      }
      snapshot.reserve.revision++;
      if (command.action === 'create_product')
        snapshot.products.push({
          id: 'p',
          reserve_id: 'reserve',
          name: 'Created',
          barcode: null,
          brand: null,
          size: null,
          unit: null,
          category: null,
          photo_path: null,
          off_barcode: null,
          off_image_url: null,
          updated_at: '',
          quantity: 0,
          minimum: null,
          stock_version: 1,
        });
      return { revision: snapshot.reserve.revision, product_id: 'p' };
    });
  const store = new SharedPantryStore(
    { execute, getSnapshot: async () => structuredClone(snapshot) } as unknown as ReserveBackend,
    'account',
    'reserve',
    {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        data.set(k, v);
      },
      removeItem: (k) => {
        data.delete(k);
      },
    },
    () => true,
  );
  await store.refresh();
  const product = {
    id: 'p',
    name: 'Created',
    quantity: 1,
    updatedAt: '',
    photoChange: `data:image/jpeg;base64,${Buffer.from(image()).toString('base64')}`,
  };
  expect(await store.saveProduct(product, false, true)).toBe(false);
  expect(store.getSnapshot().error).toContain('La fiche a été enregistrée');
  expect(await store.saveProduct(product, false, true)).toBe(true);
  expect(execute.mock.calls.filter((c) => c[2].action === 'create_product')).toHaveLength(1);
  expect(execute.mock.calls.filter((c) => c[2].action === 'scan')).toHaveLength(1);
  store.dispose();
});
it('journals only the photo intention, preserves its UUID on uncertainty and clears bytes on disposal', async () => {
  const journal = new Map<string, string>();
  const snapshot: ReserveSnapshot = {
    reserve: {
      id: 'reserve',
      name: 'Pantry',
      owner_id: 'account',
      revision: 1,
      created_at: '',
      updated_at: '',
    },
    products: [],
    members: [],
    shopping: [],
  };
  const execute = vi
    .fn<ReserveBackend['execute']>()
    .mockImplementation(async (_id, _reserve, command) => {
      if (command.action === 'photo') throw new BackendError('uncertain', 'uncertain');
      return { revision: 1 };
    });
  const store = new SharedPantryStore(
    { execute, getSnapshot: async () => snapshot } as unknown as ReserveBackend,
    'account',
    'reserve',
    {
      getItem: (k) => journal.get(k) ?? null,
      setItem: (k, v) => {
        journal.set(k, v);
      },
      removeItem: (k) => {
        journal.delete(k);
      },
    },
    () => true,
  );
  await store.refresh();
  const data = `data:image/jpeg;base64,${Buffer.from(image()).toString('base64')}`;
  expect(
    await store.saveProduct(
      { id: 'p', name: 'Photo', quantity: 0, updatedAt: '', photoChange: data },
      true,
    ),
  ).toBe(false);
  const saved = JSON.parse([...journal.values()][0]);
  expect(JSON.stringify(saved)).not.toContain('base64');
  expect(JSON.stringify(saved)).not.toContain(data.split(',')[1]);
  const step = saved.steps[1];
  expect(photoDraft('account', 'reserve', step.command.payload.hash)).toBeDefined();
  await store.resume();
  expect(execute.mock.calls.at(-1)?.[0]).toBe(step.id);
  store.dispose();
  expect(photoDraft('account', 'reserve', step.command.payload.hash)).toBeUndefined();
});
