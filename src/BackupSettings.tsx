import { useState, useSyncExternalStore } from 'react';
import { BACKUP_MAX_BYTES, parseBackup, type UserBackup } from './model';
import { backupSnapshot, downloadBackup } from './storage';
import type { SharedPantryStore } from './backend/store';
import { useUpdateBlocker } from './AppUpdates';

export function BackupSettings({ store }: { store: SharedPantryStore }) {
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [preview, setPreview] = useState<{
    backup: UserBackup;
    before: UserBackup;
    revision: number;
  } | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const snapshot = view.snapshot;
  useUpdateBlocker(() =>
    reading || preview ? 'Terminez ou fermez l’aperçu de restauration avant d’actualiser.' : null,
  );
  const owner = snapshot?.reserve.owner_id === store.userId;
  const stale = preview && snapshot?.reserve.revision !== preview.revision;
  function exportCurrent() {
    try {
      if (snapshot) downloadBackup(backupSnapshot(snapshot));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="account-section backup-settings">
      <h3>Sauvegarde de la réserve</h3>
      <p>
        Export privé des produits, quantités, codes et courses. Sans comptes ni secrets. Conservez
        le fichier hors de Supabase, dans un emplacement personnel protégé : le JSON n’est pas
        chiffré.
      </p>
      <p>
        Les images Open Food Facts restent des références en ligne ; aucune copie d’image n’est
        incluse. Les photos privées ne sont pas encore disponibles.
      </p>
      <button
        className="secondary-button"
        disabled={!snapshot || view.busy || !!view.pending}
        onClick={exportCurrent}
      >
        Exporter la réserve JSON
      </button>
      {view.status !== 'ready' && (
        <p className="form-note">
          Cet export utilise la dernière copie synchronisée, qui peut être ancienne.
        </p>
      )}
      {owner && (
        <>
          <label className="backup-file">
            Préparer une restauration JSON
            <input
              type="file"
              accept=".json,application/json"
              disabled={!store.writable || reading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                setPreview(null);
                setConfirmed(false);
                setRecoverySaved(false);
                setError('');
                if (!file) return;
                setReading(true);
                try {
                  if (file.size > BACKUP_MAX_BYTES)
                    throw new Error('Fichier trop volumineux (2 Mo maximum).');
                  const backup = parseBackup(await file.text());
                  const current = store.getSnapshot();
                  if (!store.writable || !current.snapshot)
                    throw new Error('Actualisez la réserve avant de préparer l’aperçu.');
                  setPreview({
                    backup,
                    before: backupSnapshot(current.snapshot),
                    revision: current.snapshot.reserve.revision,
                  });
                } catch (e) {
                  setError(
                    e instanceof DOMException
                      ? 'Lecture du fichier impossible. Aucun changement appliqué.'
                      : (e as Error).message,
                  );
                } finally {
                  setReading(false);
                }
              }}
            />
          </label>
          <small>
            En ligne, propriétaire uniquement. 2 Mo, 2 000 produits et 2 000 articles maximum.
          </small>
        </>
      )}
      {!owner && <p>La restauration est réservée au propriétaire de la réserve.</p>}
      {reading && <p role="status">Lecture du fichier…</p>}
      {preview && (
        <div className="restore-preview">
          <h4>Aperçu de remplacement</h4>
          <p>
            Le catalogue et toutes les courses actuels seront remplacés. Les quantités seront posées
            exactement, sans scan ni déduction automatique. Aucun compte ou membre ne sera modifié.
          </p>
          <p>Fichier du {new Date(preview.backup.exportedAt).toLocaleString('fr-FR')}.</p>
          <table>
            <caption>Avant et après restauration</caption>
            <thead>
              <tr>
                <th>Données</th>
                <th>Avant</th>
                <th>Après</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Produits</th>
                <td>{preview.before.products.length}</td>
                <td>{preview.backup.products.length}</td>
              </tr>
              <tr>
                <th>Emballages</th>
                <td>{preview.before.products.reduce((n, p) => n + p.quantity, 0)}</td>
                <td>{preview.backup.products.reduce((n, p) => n + p.quantity, 0)}</td>
              </tr>
              <tr>
                <th>Articles de courses</th>
                <td>{preview.before.shopping.length}</td>
                <td>{preview.backup.shopping.length}</td>
              </tr>
            </tbody>
          </table>
          <details>
            <summary>Produits et courses qui seront remplacés</summary>
            <ul>
              {preview.before.products.map((p) => (
                <li key={p.id}>
                  {p.name} · stock {p.quantity}
                </li>
              ))}
            </ul>
            <ul>
              {preview.before.shopping.map((s) => (
                <li key={s.id}>
                  {s.name} · à acheter {s.quantity} · {s.checked ? 'coché' : 'non coché'}
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>Détail des données à restaurer</summary>
            <ul>
              {preview.backup.products.map((p) => (
                <li key={p.id}>
                  {p.name} ·{' '}
                  {[p.brand, p.size && `${p.size} ${p.unit}`, p.barcode]
                    .filter(Boolean)
                    .join(' · ')}{' '}
                  · stock {p.quantity} · seuil {p.minimum ?? 'désactivé'}
                </li>
              ))}
            </ul>
            <ul>
              {preview.backup.shopping.map((s) => (
                <li key={s.id}>
                  {s.name} · à acheter {s.quantity} · {s.checked ? 'coché' : 'non coché'} ·{' '}
                  {s.product_id ? 'lié au catalogue' : 'libre'}
                </li>
              ))}
            </ul>
          </details>
          <p>
            Tous les identifiants de produits et courses seront recréés ; les liens seront
            conservés. Un fichier répété remplace les données, il ne les additionne pas.
          </p>
          <button
            className="secondary-button"
            disabled={view.busy || !!view.pending || !!stale}
            onClick={() => {
              try {
                downloadBackup(preview.before);
                setRecoverySaved(true);
              } catch {
                setError('Téléchargement impossible. Restauration bloquée.');
              }
            }}
          >
            Télécharger la sauvegarde avant remplacement
          </button>
          {recoverySaved && (
            <p>Vérifiez que le fichier de récupération est bien enregistré avant de continuer.</p>
          )}
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={view.busy || !!view.pending}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            J’ai conservé la sauvegarde et je confirme le remplacement complet des produits et
            courses.
          </label>
          {stale && (
            <p role="alert">
              La réserve a changé. Fermez cet aperçu puis sélectionnez à nouveau le fichier.
            </p>
          )}
          <button
            className="danger-button"
            disabled={!store.writable || !confirmed || !recoverySaved || !!stale}
            onClick={async () => {
              setError('');
              if (await store.restore(preview.backup, preview.revision)) setPreview(null);
              else
                setError(
                  store.getSnapshot().pending
                    ? 'Résultat à vérifier : utilisez Reprendre la demande, sans lancer un nouvel import.'
                    : 'Restauration refusée. Actualisez puis préparez un nouvel aperçu.',
                );
            }}
          >
            Remplacer et restaurer la réserve
          </button>
          <button
            className="text-button"
            disabled={view.busy || !!view.pending}
            onClick={() => {
              setPreview(null);
              setError('');
            }}
          >
            Fermer l’aperçu
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
