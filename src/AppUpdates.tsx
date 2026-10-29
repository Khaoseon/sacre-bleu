import { useEffect, useRef, useSyncExternalStore } from 'react';
import { appUpdates, registerUpdateBlocker } from './pwaUpdateController';

export function useUpdateBlocker(check: () => string | null) {
  const latest = useRef(check);
  latest.current = check;
  useEffect(() => registerUpdateBlocker(() => latest.current()), []);
}
export function UpdateControls() {
  const state = useSyncExternalStore(appUpdates.subscribe, appUpdates.getSnapshot);
  return (
    <div className="update-controls">
      <button
        className="text-button"
        disabled={state.checking || state.applying}
        onClick={() => void appUpdates.check()}
      >
        {state.checking ? 'Vérification…' : 'Vérifier les mises à jour'}
      </button>
      {state.available && (
        <button
          className="secondary-button"
          disabled={state.checking || state.applying}
          onClick={() => void appUpdates.apply()}
        >
          Actualiser
        </button>
      )}
      {state.message && <p role="status">{state.message}</p>}
    </div>
  );
}
export function AppUpdateHost() {
  const state = useSyncExternalStore(appUpdates.subscribe, appUpdates.getSnapshot);
  const progress = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    void appUpdates.check(false);
  }, []);
  useEffect(() => {
    if (state.applying) progress.current?.showModal();
    else progress.current?.close();
  }, [state.applying]);
  return (
    <>
      {state.available && !state.deferred && !state.applying && (
        <aside className="app-update-banner" aria-label="Mise à jour de l’application">
          <p role="status">{state.message || 'Nouvelle version disponible.'}</p>
          <div>
            <button
              className="primary-button"
              disabled={state.checking}
              onClick={() => void appUpdates.apply()}
            >
              Actualiser
            </button>
            <button className="text-button" onClick={appUpdates.defer}>
              Plus tard
            </button>
          </div>
        </aside>
      )}
      <dialog
        ref={progress}
        className="modal update-progress"
        aria-label="Actualisation de l’application"
        onCancel={(event) => event.preventDefault()}
      >
        <p role="status">Actualisation en cours…</p>
      </dialog>
    </>
  );
}
