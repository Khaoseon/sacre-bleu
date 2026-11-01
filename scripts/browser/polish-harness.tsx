import { createRoot } from 'react-dom/client';
import { useSyncExternalStore } from 'react';
import App from '../../src/App';
import { demo } from '../../src/demo';
import { useThemePreference } from '../../src/theme';
import { SharedPantryStore } from '../../src/backend/store';
import type { ReserveBackend, ReserveSnapshot } from '../../src/backend/contracts';
import { BackendError } from '../../src/backend/errors';
import '../../src/style.css';

// Entirely synthetic in-memory transport. Never initializes a Supabase client.
const state = demo();
const stamp = '2026-10-30T12:00:00Z';
let snapshot: ReserveSnapshot = {
  reserve: {
    id: 'reserve',
    name: 'Réserve de test',
    revision: 1,
    owner_id: 'tester',
    created_at: stamp,
    updated_at: stamp,
  },
  members: [],
  products: state.products.map((p) => ({
    id: p.id,
    reserve_id: 'reserve',
    name: p.name,
    barcode: p.barcode ?? null,
    brand: p.brand ?? null,
    size: p.size ?? null,
    unit: p.unit ?? null,
    category: p.category ?? null,
    photo_path: null,
    photo_version: 0,
    off_barcode: null,
    off_image_url: null,
    stock_version: 1,
    quantity: p.quantity,
    minimum: p.minimum ?? null,
    version: 1,
    created_at: stamp,
    updated_at: stamp,
  })),
  shopping: state.shopping.map((i) => ({
    id: i.id,
    reserve_id: 'reserve',
    product_id: i.productId ?? null,
    name: i.name,
    quantity: i.quantity,
    checked: i.checked,
    version: 1,
    created_at: stamp,
    updated_at: stamp,
  })),
};
let online = true;
let failure: 'none' | 'rejected' | 'uncertain' = 'none';
let finish: (() => void) | null = null;
const backend = {
  createReserve: async () => {
    throw Error('Outside fixture scope');
  },
  inviteMember: async () => {
    throw Error('Outside fixture scope');
  },
  acceptInvitation: async () => {
    throw Error('Outside fixture scope');
  },
  getSnapshot: async () => {
    if (!online) throw new BackendError('Hors ligne.', 'unavailable');
    return structuredClone(snapshot);
  },
  execute: async (_request, _reserve, command) => {
    if (finish)
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    if (failure !== 'none')
      throw new BackendError('La réserve a changé. Actualisez avant de réessayer.', failure);
    if (command.action === 'delete_shopping')
      snapshot.shopping = snapshot.shopping.filter((i) => i.id !== command.payload.shopping_id);
    if (command.action === 'update_shopping')
      snapshot.shopping = snapshot.shopping.map((i) =>
        i.id === command.payload.shopping_id ? { ...i, ...command.payload } : i,
      );
    if (command.action === 'add_shopping') {
      const existing =
        command.payload.product_id &&
        snapshot.shopping.find((i) => i.product_id === command.payload.product_id && !i.checked);
      if (existing) existing.quantity += command.payload.quantity;
      else
        snapshot.shopping.push({
          id: command.payload.id ?? crypto.randomUUID(),
          reserve_id: 'reserve',
          product_id: command.payload.product_id ?? null,
          name: command.payload.name ?? '',
          quantity: command.payload.quantity,
          checked: false,
          version: 1,
          created_at: stamp,
          updated_at: stamp,
        });
    }
    snapshot = {
      ...snapshot,
      reserve: { ...snapshot.reserve, revision: snapshot.reserve.revision + 1 },
    };
    return { revision: snapshot.reserve.revision };
  },
} satisfies ReserveBackend;
const store = new SharedPantryStore(backend, 'tester', 'reserve', sessionStorage, () => online);
const shared = new URLSearchParams(location.search).has('shared');
declare global {
  interface Window {
    polish: {
      store: SharedPantryStore;
      fail: (kind: typeof failure) => void;
      online: (connected: boolean) => Promise<void>;
      hold: () => void;
      finish: () => void;
      snapshot: () => ReserveSnapshot;
    };
  }
}
window.polish = {
  store,
  fail: (kind) => {
    failure = kind;
  },
  online: async (connected) => {
    online = connected;
    await store.refresh();
  },
  hold: () => {
    finish = () => {};
  },
  finish: () => {
    const resolve = finish;
    finish = null;
    resolve?.();
  },
  snapshot: () => structuredClone(snapshot),
};
if (shared) await store.refresh();
else localStorage.setItem('app-reserve.local.v1', JSON.stringify(state));
function Harness() {
  const theme = useThemePreference();
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <App theme={theme} shared={shared ? { store, view } : undefined} />;
}
createRoot(document.getElementById('root')!).render(<Harness />);
