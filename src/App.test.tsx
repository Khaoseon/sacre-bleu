import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { SharedPantryStore } from './backend/store';
import { BackendError } from './backend/errors';
import type { MutationReceipt, ReserveBackend, ReserveSnapshot } from './backend/contracts';

const initial: ReserveSnapshot = {
  reserve: { id: 'r', name: 'Recette', owner_id: 'u', revision: 1, created_at: '', updated_at: '' },
  members: [],
  products: [],
  shopping: [],
};

async function setup() {
  const execute = vi.fn<ReserveBackend['execute']>();
  const getSnapshot = vi.fn<ReserveBackend['getSnapshot']>().mockResolvedValue(initial);
  const journal = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const store = new SharedPantryStore(
    { execute, getSnapshot } as unknown as ReserveBackend,
    'u',
    'r',
    journal,
    () => true,
  );
  await store.refresh();
  const render = () =>
    renderToStaticMarkup(
      <App
        theme={{ preference: 'auto', chooseTheme: () => {}, error: '' }}
        shared={{ store, view: store.getSnapshot() }}
      />,
    );
  return { store, execute, getSnapshot, render };
}

describe('shared saving feedback without moving the page content', () => {
  it('keeps saving feedback in the header through receipt and snapshot waits', async () => {
    const f = await setup();
    let receipt!: (value: MutationReceipt) => void;
    let snapshot!: (value: ReserveSnapshot) => void;
    f.execute.mockImplementationOnce(() => new Promise((resolve) => (receipt = resolve)));
    f.getSnapshot.mockImplementationOnce(() => new Promise((resolve) => (snapshot = resolve)));
    expect(f.render()).not.toContain('sync-message');
    expect(f.render()).not.toContain('Dernière synchronisation :');
    const saving = f.store.scanProduct('p', 1);
    const during = f.render();
    expect(during).toContain('<span role="status">Enregistrement…</span>');
    expect(during).not.toContain('sync-message');
    expect(f.store.writable).toBe(false);
    expect(f.store.getSnapshot().completed).toBe(0);
    receipt({ revision: 2 });
    await vi.waitFor(() => expect(snapshot).toBeTypeOf('function'));
    expect(f.render()).not.toContain('sync-message');
    expect(f.store.getSnapshot().completed).toBe(0);
    snapshot({ ...initial, reserve: { ...initial.reserve, revision: 2 } });
    await saving;
    expect(f.render()).toContain('<span role="status">Synchronisé</span>');
    expect(f.render()).not.toContain('sync-message');
    expect(f.store.getSnapshot().completed).toBe(1);
  });

  it('still exposes recovery after an uncertain write without showing success', async () => {
    const f = await setup();
    f.execute.mockRejectedValueOnce(
      new BackendError(
        'Réponse interrompue. Reprenez la demande pour vérifier son résultat sans la doubler.',
        'uncertain',
      ),
    );
    await f.store.scanProduct('p', 1);
    const html = f.render();
    expect(html).toContain('sync-message sync-error');
    expect(html).toContain(
      'Réponse interrompue. Reprenez la demande pour vérifier son résultat sans la doubler.',
    );
    expect(html).toContain('Reprendre la demande');
    expect(f.store.writable).toBe(false);
    expect(f.store.getSnapshot().completed).toBe(0);
  });
  it('keeps offline and cache errors visible without a permanent successful sync date', async () => {
    const f = await setup();
    const view = {
      ...f.store.getSnapshot(),
      status: 'offline' as const,
      cacheError: 'La copie hors ligne n’a pas pu être conservée sur cet appareil.',
    };
    const html = renderToStaticMarkup(
      <App
        theme={{ preference: 'auto', chooseTheme: () => {}, error: '' }}
        shared={{ store: f.store, view }}
      />,
    );
    expect(html).toContain('Hors ligne · lecture seule');
    expect(html).toContain('consultation uniquement');
    expect(html).toContain('La copie hors ligne');
    expect(html).toContain('sync-message');
    expect(html).not.toContain('Dernière synchronisation :');
  });
});
