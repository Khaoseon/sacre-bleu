import { t, message, useLanguage } from './i18n';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Settings2 } from 'lucide-react';
import App from './App';
import { Modal } from './components';
import { AppearanceSettings, type ThemeController } from './AppearanceSettings';
import { AppInformation } from './AppInformation';
import { useUpdateBlocker } from './AppUpdates';
import { useThemePreference } from './theme';
import { AUTH_STORAGE_KEY, client } from './backend/client';
import { PrivateReserveCache } from './storage';
import { BackupSettings } from './BackupSettings';
import { SupabaseBackend } from './backend/adapter';
import { ReserveAuth } from './backend/auth';
import { backendError } from './backend/errors';
import { consumeLink, invitationLink, type Invitation, type IncomingLink } from './backend/links';
import { clearPrivateIntents, PENDING_PREFIX, SharedPantryStore } from './backend/store';
import { usePantry } from './backend/usePantry';
import { EdgeProductProvider } from './productLookupClient';
import { PrivatePhotos } from './ui/PrivatePhotos';

const backend = client ? new SupabaseBackend(client) : null;
const auth = client ? new ReserveAuth(client) : null;
const privateCache = new PrivateReserveCache(() => localStorage, AUTH_STORAGE_KEY);
// UI policy only: public signup must also be disabled in Supabase Auth.
const cloudPersonalAccess = import.meta.env.MODE === 'cloud';
// Read and clean BEFORE React's first render; StrictMode must not consume a link twice.
const initialLink = consumeLink(window.location, window.history);
let confirmation: { token: string; promise: Promise<void> } | null = null;

function cachedOfflineSession(): Session | null {
  if (navigator.onLine) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? 'null');
    if (saved?.user?.id && privateCache.read(saved.user.id)) return saved as Session;
  } catch {
    /* No usable private copy. */
  }
  return null;
}

function Gate({
  title,
  children,
  theme,
  onDemo,
}: {
  title: string;
  children: ReactNode;
  theme: ThemeController;
  onDemo?: () => void;
}) {
  const [settings, setSettings] = useState(false);
  return (
    <main className="account-shell sb-foundation">
      <section className="account-card">
        <header>
          <a className="brand" href="/" aria-label="Sacré bleu">
            <span className="brand-icon">
              <img src="/logo.png" width="40" height="40" alt="" />
            </span>
            Sacré bleu
            <span className="brand-dot" aria-hidden="true">
              .
            </span>
          </a>
          <button
            className="icon-button"
            aria-label={t('Paramètres')}
            onClick={() => setSettings(true)}
          >
            <Settings2 size={22} />
          </button>
        </header>
        <h1>{title}</h1>
        {children}
        {onDemo && (
          <button className="text-button demo-entry" onClick={onDemo}>
            {t('Essayer la démonstration sur cet appareil')}
          </button>
        )}
      </section>
      {settings && (
        <Modal title={t('Paramètres')} close={() => setSettings(false)}>
          <div className="settings-content">
            <AppearanceSettings theme={theme} />
            <AppInformation />
          </div>
        </Modal>
      )}
    </main>
  );
}
function AuthForm({
  invitation,
  onDemo,
  theme,
  linkError,
  onConnected,
}: {
  invitation?: Invitation;
  onDemo: () => void;
  theme: ThemeController;
  linkError?: string;
  onConnected: () => Promise<void>;
}) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  useUpdateBlocker(() =>
    busy
      ? 'Attendez la fin de la connexion avant d’actualiser.'
      : email || password
        ? 'Terminez ou effacez la saisie du compte avant d’actualiser.'
        : null,
  );
  return (
    <Gate
      title={signup ? t('Créer votre compte.') : t('Votre réserve, à deux.')}
      theme={theme}
      onDemo={onDemo}
    >
      <p>
        {invitation
          ? t('Connectez-vous avec l’adresse invitée pour rejoindre la réserve.')
          : t('Connectez-vous pour retrouver votre stock et vos courses.')}
      </p>
      {!auth && (
        <p role="alert" className="form-error">
          {t(
            'Connexion non configurée. Démarrez Supabase puis configurez l’environnement local comme indiqué dans le README.',
          )}
        </p>
      )}
      {linkError && (
        <p role="alert" className="form-error">
          {message(linkError)}
        </p>
      )}
      <form
        className="product-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!auth || busy) return;
          setBusy(true);
          setError('');
          try {
            if (signup && !cloudPersonalAccess) {
              await auth.signUp(email.trim(), password, location.origin);
              setSent(true);
            } else {
              await auth.signIn(email.trim(), password);
              await onConnected();
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t('Email')}{' '}
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          {t('Mot de passe')}{' '}
          <input
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            required
            minLength={signup ? 12 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </label>
        {signup && (
          <small>{t('12 caractères minimum, avec majuscule, minuscule et chiffre.')}</small>
        )}
        {error && (
          <p role="alert" className="form-error">
            {message(error)}
          </p>
        )}
        {sent && (
          <p role="status">
            {t(
              'Vérifiez votre boîte email pour confirmer votre adresse. Si vous avez une invitation, rouvrez son lien après confirmation.',
            )}
          </p>
        )}
        <button className="primary-button" disabled={busy || !auth}>
          {busy ? t('Veuillez patienter…') : signup ? t('Créer mon compte') : t('Se connecter')}
        </button>
        {!cloudPersonalAccess && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setSignup(!signup);
              setError('');
            }}
          >
            {signup ? t('J’ai déjà un compte') : t('Créer un compte')}
          </button>
        )}
        {cloudPersonalAccess && <small>{t('Accès réservé aux comptes autorisés.')}</small>}
        {(sent || error) && (
          <button
            type="button"
            className="text-button"
            disabled={busy || !email || !auth}
            onClick={async () => {
              if (!auth) return;
              setBusy(true);
              setError('');
              try {
                await auth.resend(email, location.origin);
                setSent(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('Renvoyer l’email de confirmation')}
          </button>
        )}
      </form>
    </Gate>
  );
}
type ReserveChoice = { id: string; name: string };
function Membership({
  session,
  invitation,
  onSelect,
  clearInvitation,
  theme,
  logout,
}: {
  session: Session;
  invitation?: Invitation;
  onSelect: (id: string) => void;
  clearInvitation: () => void;
  theme: ThemeController;
  logout: () => void;
}) {
  const [reserves, setReserves] = useState<ReserveChoice[] | null>(null);
  const [error, setError] = useState('');
  const [defaultName] = useState(() => t('Ma réserve'));
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [load, setLoad] = useState(0);
  const acceptId = useRef(crypto.randomUUID());
  const createKey = `${PENDING_PREFIX}${session.user.id}:create-reserve`;
  const [creation, setCreation] = useState<{ id: string; name: string } | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(createKey) ?? 'null');
    } catch {
      return null;
    }
  });
  useEffect(() => {
    let active = true;
    setError('');
    setReserves(null);
    if (!navigator.onLine && !invitation && !creation) {
      const cached = privateCache.read(session.user.id);
      if (cached) {
        onSelect(cached.snapshot.reserve.id);
        return;
      }
    }
    backend!
      .listReserves()
      .then((rows) => {
        if (!active) return;
        setReserves(rows);
        if (!invitation && rows.length === 1 && !creation) onSelect(rows[0].id);
      })
      .catch((e) => {
        if (active) {
          const cached = privateCache.read(session.user.id);
          if (!invitation && !creation && cached) onSelect(cached.snapshot.reserve.id);
          else setError(backendError(e).message);
        }
      });
    return () => {
      active = false;
    };
  }, [session.user.id, load, invitation, creation, onSelect]);
  async function create() {
    if (busy) return;
    if (cloudPersonalAccess && !creation) {
      setError('La création de réserve est réservée à l’administration du projet.');
      return;
    }
    setBusy(true);
    setError('');
    const intent = creation ?? { id: crypto.randomUUID(), name: name.trim() };
    try {
      sessionStorage.setItem(createKey, JSON.stringify(intent));
      setCreation(intent);
      const result = await backend!.createReserve(intent.id, intent.name);
      sessionStorage.removeItem(createKey);
      onSelect(result.reserve_id);
    } catch (e) {
      const failure = backendError(e, true);
      setError(failure.message);
      if (failure.kind === 'rejected') {
        sessionStorage.removeItem(createKey);
        setCreation(null);
      }
    } finally {
      setBusy(false);
    }
  }
  const alreadyMember = invitation && reserves?.some((r) => r.id === invitation.reserveId);
  useUpdateBlocker(() =>
    busy || creation
      ? 'Terminez ou vérifiez la demande de réserve avant d’actualiser.'
      : invitation
        ? 'Traitez l’invitation ouverte avant d’actualiser.'
        : name !== defaultName
          ? 'Terminez la saisie du nom de réserve avant d’actualiser.'
          : null,
  );
  return (
    <Gate title={t('Votre réserve.')} theme={theme}>
      <p>{session.user.email}</p>
      {reserves === null ? (
        <>
          <p role="status">{t('Chargement de vos réserves…')}</p>
          {error && (
            <>
              <p role="alert" className="form-error">
                {message(error)}
              </p>
              <button className="secondary-button" onClick={() => setLoad((n) => n + 1)}>
                {t('Réessayer')}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          {invitation && (
            <section className="account-section">
              <h2>{t('Rejoindre la réserve')}</h2>
              <p>
                {alreadyMember
                  ? t('Vous faites déjà partie de cette réserve.')
                  : t('L’invitation doit correspondre à votre adresse email confirmée.')}
              </p>
              <button
                className="primary-button"
                disabled={busy}
                onClick={async () => {
                  if (alreadyMember) {
                    clearInvitation();
                    onSelect(invitation.reserveId);
                    return;
                  }
                  setBusy(true);
                  setError('');
                  try {
                    const result = await backend!.acceptInvitation(
                      acceptId.current,
                      invitation.id,
                      invitation.token,
                    );
                    clearInvitation();
                    onSelect(result.reserve_id);
                  } catch (e) {
                    const failure = backendError(e, true);
                    setError(failure.message);
                    if (failure.kind === 'rejected') acceptId.current = crypto.randomUUID();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {alreadyMember ? t('Ouvrir la réserve') : t('Accepter l’invitation')}
              </button>
              <button className="text-button" onClick={clearInvitation} disabled={busy}>
                {t('Ignorer cette invitation')}
              </button>
            </section>
          )}
          {!invitation &&
            reserves.map((reserve) => (
              <button
                className="secondary-button"
                key={reserve.id}
                onClick={() => onSelect(reserve.id)}
              >
                {reserve.name}
              </button>
            ))}
          {!invitation && (!cloudPersonalAccess || !!creation) && (
            <form
              className="product-form account-section"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <h2>{creation ? t('Création à vérifier') : t('Créer une réserve vide')}</h2>
              <label>
                {t('Nom de la réserve')}{' '}
                <input
                  required
                  maxLength={120}
                  value={creation?.name ?? name}
                  disabled={busy || !!creation}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="primary-button" disabled={busy}>
                {busy
                  ? t('Veuillez patienter…')
                  : creation
                    ? t('Reprendre la création')
                    : t('Créer la réserve')}
              </button>
            </form>
          )}
          {!invitation && cloudPersonalAccess && !creation && reserves.length === 0 && (
            <p role="status">
              {t('Aucune réserve accessible. Contactez la personne qui administre votre réserve.')}
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {message(error)}
            </p>
          )}
        </>
      )}
      <button className="text-button" onClick={logout}>
        {t('Se déconnecter')}
      </button>
    </Gate>
  );
}
function SharingSettings({
  session,
  store,
  logout,
}: {
  session: Session;
  store: SharedPantryStore;
  logout: () => void;
}) {
  const view = usePantrySettings(store);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [notice, setNotice] = useState('');
  const pendingKey = `${PENDING_PREFIX}${session.user.id}:${store.reserveId}:invite`;
  const [pending, setPending] = useState<{ id: string; email: string } | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null');
    } catch {
      return null;
    }
  });
  const snapshot = view.snapshot;
  useUpdateBlocker(() =>
    busy || pending
      ? 'Terminez ou vérifiez l’invitation avant d’actualiser.'
      : email || link
        ? 'Terminez l’invitation ou fermez les réglages avant d’actualiser.'
        : null,
  );
  const owner = snapshot?.reserve.owner_id === session.user.id;
  return (
    <>
      <section className="account-section">
        <h3>{snapshot?.reserve.name}</h3>
        <p>{session.user.email}</p>
        <ul className="member-list">
          {snapshot?.members.map((m) => (
            <li key={m.user_id}>
              {m.user_id === session.user.id ? t('Vous') : t('Autre membre')}{' '}
              <span>{m.role === 'owner' ? t('Propriétaire') : t('Membre')}</span>
            </li>
          ))}
        </ul>
      </section>
      {owner && snapshot && snapshot.members.length < 2 && (
        <form
          className="product-form account-section"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const intent = pending ?? { id: crypto.randomUUID(), email: email.trim() };
            setBusy(true);
            setError('');
            setLink('');
            setNotice('');
            try {
              sessionStorage.setItem(pendingKey, JSON.stringify(intent));
              setPending(intent);
              const result = await backend!.inviteMember(intent.id, store.reserveId, intent.email);
              sessionStorage.removeItem(pendingKey);
              setPending(null);
              if (result.token)
                setLink(
                  invitationLink(location.origin, {
                    reserveId: result.reserve_id,
                    id: result.invitation_id,
                    token: result.token,
                  }),
                );
              else
                setNotice(
                  'L’invitation a été créée, mais son lien n’est plus disponible. Générez un nouveau lien pour remplacer le précédent.',
                );
            } catch (e) {
              const failure = backendError(e, true);
              setError(failure.message);
              if (failure.kind === 'rejected') {
                sessionStorage.removeItem(pendingKey);
                setPending(null);
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>{t('Inviter une personne')}</h3>
          <label>
            {t('Email du destinataire')}{' '}
            <input
              type="email"
              required
              disabled={busy || !!pending}
              value={pending?.email ?? email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button
            className="secondary-button"
            disabled={busy || !navigator.onLine || !!view.pending}
          >
            {busy
              ? t('Veuillez patienter…')
              : pending
                ? t('Reprendre l’invitation')
                : t('Générer un lien d’invitation')}
          </button>
          <small>
            {t('Valable 24 h pour cette adresse. Un nouveau lien remplace les précédents.')}
          </small>
        </form>
      )}
      {link && (
        <div className="invitation-result">
          <label>
            {t('Lien temporaire')}{' '}
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
          <button
            className="secondary-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setNotice('Lien copié.');
              } catch {
                setError('Copie impossible. Sélectionnez et copiez le lien.');
              }
            }}
          >
            {t('Copier le lien')}
          </button>
          {!!navigator.share && (
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await navigator.share({ title: t('Rejoindre ma réserve'), url: link });
                } catch {
                  /* Cancellation is harmless. */
                }
              }}
            >
              {t('Partager')}
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {message(error)}
        </p>
      )}
      {notice && <p role="status">{message(notice)}</p>}
      <BackupSettings store={store} />
      <p className="form-note">
        {t(
          'Le dernier stock et les courses sont conservés dans ce navigateur pour consultation hors ligne, sans modification possible. Sur un appareil partagé, déconnectez-vous pour effacer cette copie privée. Les données locales ne sont pas chiffrées par l’application.',
        )}
      </p>
      <button className="danger-button" onClick={logout}>
        {t('Se déconnecter')}
      </button>
    </>
  );
}
// Settings observe the existing store without installing another polling timer.
function usePantrySettings(store: SharedPantryStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
function PantryScreen({
  store,
  session,
  theme,
  logout,
}: {
  store: SharedPantryStore;
  session: Session;
  theme: ThemeController;
  logout: () => void;
}) {
  const view = usePantry(store);
  useUpdateBlocker(() => {
    const current = store.getSnapshot();
    return current.busy || current.pending
      ? 'Terminez ou vérifiez la demande en attente avant d’actualiser.'
      : null;
  });
  const [productProvider] = useState(
    () =>
      new EdgeProductProvider({
        url: import.meta.env.VITE_SUPABASE_URL,
        publicKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        token: async () => (await client?.auth.getSession())?.data.session?.access_token,
      }),
  );
  if (!view.snapshot)
    return (
      <Gate title={t('Votre réserve.')} theme={theme}>
        <p role="status">
          {view.status === 'loading'
            ? t('Chargement du stock…')
            : t('La réserve est indisponible.')}
        </p>
        {view.error && (
          <p role="alert" className="form-error">
            {message(view.error)}
          </p>
        )}
        <button className="secondary-button" onClick={() => void store.refresh()}>
          {t('Réessayer')}
        </button>
        <button className="text-button" onClick={logout}>
          {t('Se déconnecter')}
        </button>
      </Gate>
    );
  return (
    <PrivatePhotos
      scope={{
        client: client!,
        account: session.user.id,
        reserve: store.reserveId,
        online: view.status === 'ready',
      }}
    >
      <App
        theme={theme}
        shared={{ store, view }}
        productProvider={productProvider}
        accountSettings={<SharingSettings session={session} store={store} logout={logout} />}
      />
    </PrivatePhotos>
  );
}
function SharedScope({
  session,
  reserveId,
  theme,
  logout,
}: {
  session: Session;
  reserveId: string;
  theme: ThemeController;
  logout: () => void;
}) {
  const [store, setStore] = useState<SharedPantryStore | null>(null);
  useEffect(() => {
    const next = new SharedPantryStore(
      backend!,
      session.user.id,
      reserveId,
      sessionStorage,
      () => navigator.onLine,
      12000,
      privateCache,
    );
    setStore(next);
    return () => next.dispose();
  }, [session.user.id, reserveId]);
  return store ? (
    <PantryScreen store={store} session={session} theme={theme} logout={logout} />
  ) : null;
}
export default function Root() {
  useLanguage();
  const theme = useThemePreference();
  const [demo, setDemo] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(() => {
    if (!client) return null;
    return cachedOfflineSession() ?? undefined;
  });
  const [privacyError, setPrivacyError] = useState('');
  const [incoming, setIncoming] = useState<IncomingLink>(initialLink);
  const [reserveId, setReserveId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(!!initialLink.confirmation);
  const [confirmationError, setConfirmationError] = useState('');
  const identity = useRef<string | null>(null);
  const signedOutLocally = useRef(false);
  useUpdateBlocker(() =>
    confirming || session === undefined
      ? 'Attendez la vérification du compte avant d’actualiser.'
      : incoming.invitation || incoming.confirmation
        ? 'Terminez le traitement du lien ouvert avant d’actualiser.'
        : null,
  );
  useEffect(() => {
    const update = () => {
      const next = consumeLink(location, history);
      setIncoming(next);
      if (next.invitation) {
        setDemo(false);
        setReserveId(null);
      }
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    if (!client) return;
    let active = true;
    let eventReceived = false;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      eventReceived = true;
      if (!active) return;
      // A late init/refresh response cannot undo an explicit local logout.
      if (signedOutLocally.current && next) return;
      // Retryable refresh errors emit INITIAL_SESSION/null without deleting the
      // stored session. Keep the known account's read-only copy during an outage.
      if (!next && _event === 'INITIAL_SESSION' && !signedOutLocally.current)
        next = cachedOfflineSession();
      if (identity.current !== (next?.user.id ?? null)) {
        if (identity.current) {
          try {
            clearPrivateIntents(sessionStorage);
            privateCache.clear();
          } catch {
            setPrivacyError(
              'L’effacement local a échoué. Effacez les données de ce site dans le navigateur avant de partager cet appareil.',
            );
          }
        }
        identity.current = next?.user.id ?? null;
        setReserveId(null);
      }
      try {
        if (next) privateCache.activate(next.user.id);
        else privateCache.clear();
      } catch {
        setPrivacyError('Le stockage privé est indisponible sur cet appareil.');
      }
      setSession(next);
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !eventReceived && !signedOutLocally.current) {
          const next = error ? cachedOfflineSession() : (data.session ?? cachedOfflineSession());
          try {
            if (next) privateCache.activate(next.user.id);
            else privateCache.clear();
          } catch {
            /* Store reports cache writes. */
          }
          identity.current = next?.user.id ?? null;
          setSession(next);
        }
      })
      .catch(() => {
        if (active && !signedOutLocally.current) setSession(cachedOfflineSession());
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!incoming.confirmation || !auth) {
      setConfirming(false);
      return;
    }
    let active = true;
    setConfirming(true);
    if (confirmation?.token !== incoming.confirmation)
      confirmation = { token: incoming.confirmation, promise: auth.confirm(incoming.confirmation) };
    confirmation.promise
      .then(() => {
        if (active) {
          setConfirming(false);
          setIncoming((i) => ({ invitation: i.invitation }));
        }
      })
      .catch((error) => {
        if (active) {
          setConfirmationError((error as Error).message);
          setConfirming(false);
        }
      });
    return () => {
      active = false;
    };
  }, [incoming.confirmation]);
  function logout() {
    signedOutLocally.current = true;
    setSession(null);
    setReserveId(null);
    setIncoming({});
    try {
      clearPrivateIntents(sessionStorage);
    } catch {
      setPrivacyError(
        'L’effacement local a échoué. Effacez les données de ce site dans le navigateur avant de partager cet appareil.',
      );
    }
    try {
      privateCache.clear();
    } catch {
      setPrivacyError(
        'L’effacement local a échoué. Effacez les données de ce site dans le navigateur avant de partager cet appareil.',
      );
    }
    void auth?.signOut();
  }
  if (demo) return <App theme={theme} onExitDemo={() => setDemo(false)} />;
  if (incoming.error || confirmationError)
    return (
      <Gate title={t('Lien indisponible.')} theme={theme}>
        <p role="alert" className="form-error">
          {message(incoming.error || confirmationError)}
        </p>
        <button
          className="secondary-button"
          onClick={() => {
            setIncoming({});
            setConfirmationError('');
          }}
        >
          {t('Continuer')}
        </button>
      </Gate>
    );
  if (confirming || session === undefined)
    return (
      <Gate title={t('Votre réserve.')} theme={theme}>
        <p role="status">
          {confirming ? t('Confirmation de votre adresse…') : t('Vérification de la session…')}
        </p>
      </Gate>
    );
  if (!session)
    return (
      <AuthForm
        invitation={incoming.invitation}
        linkError={privacyError || incoming.error || confirmationError}
        theme={theme}
        onDemo={() => setDemo(true)}
        onConnected={async () => {
          if (!signedOutLocally.current) return;
          const { data, error } = await client!.auth.getSession();
          if (error || !data.session) throw new Error('Connexion à vérifier. Réessayez.');
          signedOutLocally.current = false;
          try {
            privateCache.activate(data.session.user.id);
          } catch {
            /* Store reports persistence failure. */
          }
          identity.current = data.session.user.id;
          setReserveId(null);
          setSession(data.session);
        }}
      />
    );
  if (!reserveId || incoming.invitation)
    return (
      <Membership
        key={session.user.id}
        session={session}
        invitation={incoming.invitation}
        onSelect={setReserveId}
        clearInvitation={() => setIncoming({})}
        theme={theme}
        logout={logout}
      />
    );
  return (
    <SharedScope
      key={`${session.user.id}:${reserveId}`}
      session={session}
      reserveId={reserveId}
      theme={theme}
      logout={logout}
    />
  );
}
