import { createRoot } from 'react-dom/client';
import { useSyncExternalStore } from 'react';
import App from '../../src/App';
import { BackupSettings } from '../../src/BackupSettings';
import { SharedPantryStore } from '../../src/backend/store';
import { BackendError } from '../../src/backend/errors';
import type { ReserveBackend, ReserveSnapshot } from '../../src/backend/contracts';
import { useThemePreference } from '../../src/theme';
import { useLanguage } from '../../src/i18n';
import { AppUpdateHost } from '../../src/AppUpdates';
import '../../src/style.css';

// Disposable presentation fixture. No Auth, provider, private data or remote backend.
const snapshot: ReserveSnapshot = {
  reserve: {
    id: 'r',
    name: 'Réserve exemple',
    owner_id: 'u',
    revision: 1,
    created_at: '',
    updated_at: '',
  },
  members: [],
  products: [],
  shopping: [],
};
let online = true;
const unavailable = async (): Promise<never> => {
  throw Error('Fixture only');
};
const backend: ReserveBackend = {
  getSnapshot: async () => snapshot,
  execute: async () => {
    throw new BackendError(
      'Réponse interrompue. Reprenez la demande pour vérifier son résultat sans la doubler.',
      'uncertain',
    );
  },
  createReserve: unavailable,
  inviteMember: unavailable,
  acceptInvitation: unavailable,
};
const store = new SharedPantryStore(backend, 'u', 'r', sessionStorage, () => online);
await store.refresh();
Object.assign(window, {
  finishingFixture: {
    offline: async () => {
      online = false;
      await store.refresh();
    },
    uncertain: async () => {
      online = true;
      await store.refresh();
      await store.scanProduct('p', 1);
    },
  },
});
function Harness() {
  useLanguage();
  const theme = useThemePreference();
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return (
    <>
      <App
        theme={theme}
        shared={{ store, view }}
        accountSettings={<BackupSettings store={store} />}
      />
      <AppUpdateHost />
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Harness />);
