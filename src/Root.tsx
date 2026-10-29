import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Settings2 } from 'lucide-react';
import App from './App';
import { Modal } from './components';
import { AppearanceSettings, type ThemeController } from './AppearanceSettings';
import { AppInformation } from './AppInformation';
import { useUpdateBlocker } from './AppUpdates';
import { useThemePreference } from './theme';
import { client } from './backend/client';
import { SupabaseBackend } from './backend/adapter';
import { ReserveAuth } from './backend/auth';
import { backendError } from './backend/errors';
import { consumeLink, invitationLink, type Invitation, type IncomingLink } from './backend/links';
import { clearPrivateIntents, PENDING_PREFIX, SharedPantryStore } from './backend/store';
import { usePantry } from './backend/usePantry';
import { EdgeProductProvider } from './productLookupClient';

const backend = client ? new SupabaseBackend(client) : null;
const auth = client ? new ReserveAuth(client) : null;
// Read and clean BEFORE React's first render; StrictMode must not consume a link twice.
const initialLink = consumeLink(window.location, window.history);
let confirmation: { token: string; promise: Promise<void> } | null = null;

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
    <main className="account-shell">
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
          <button className="icon-button" aria-label="Paramètres" onClick={() => setSettings(true)}>
            <Settings2 size={22} />
          </button>
        </header>
        <h1>{title}</h1>
        {children}
        {onDemo && (
          <button className="text-button demo-entry" onClick={onDemo}>
            Essayer la démonstration sur cet appareil
          </button>
        )}
      </section>
      {settings && (
        <Modal title="Paramètres" close={() => setSettings(false)}>
          <AppearanceSettings theme={theme} />
          <AppInformation />
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
}: {
  invitation?: Invitation;
  onDemo: () => void;
  theme: ThemeController;
  linkError?: string;
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
      title={signup ? 'Créer votre compte.' : 'Votre réserve, à deux.'}
      theme={theme}
      onDemo={onDemo}
    >
      <p>
        {invitation
          ? 'Connectez-vous avec l’adresse invitée pour rejoindre la réserve.'
          : 'Connectez-vous pour retrouver votre stock et vos courses.'}
      </p>
      {!auth && (
        <p role="alert" className="form-error">
          Connexion non configurée. Démarrez Supabase puis configurez l’environnement local comme
          indiqué dans le README.
        </p>
      )}
      {linkError && (
        <p role="alert" className="form-error">
          {linkError}
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
            if (signup) {
              await auth.signUp(email.trim(), password, location.origin);
              setSent(true);
            } else await auth.signIn(email.trim(), password);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
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
          Mot de passe
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
        {signup && <small>12 caractères minimum, avec majuscule, minuscule et chiffre.</small>}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {sent && (
          <p role="status">
            Vérifiez votre boîte email pour confirmer votre adresse. Si vous avez une invitation,
            rouvrez son lien après confirmation.
          </p>
        )}
        <button className="primary-button" disabled={busy || !auth}>
          {busy ? 'Veuillez patienter…' : signup ? 'Créer mon compte' : 'Se connecter'}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => {
            setSignup(!signup);
            setError('');
          }}
        >
          {signup ? 'J’ai déjà un compte' : 'Créer un compte'}
        </button>
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
            Renvoyer l’email de confirmation
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
  const [name, setName] = useState('Ma réserve');
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
    backend!
      .listReserves()
      .then((rows) => {
        if (!active) return;
        setReserves(rows);
        if (!invitation && rows.length === 1 && !creation) onSelect(rows[0].id);
      })
      .catch((e) => {
        if (active) setError(backendError(e).message);
      });
    return () => {
      active = false;
    };
  }, [session.user.id, load, invitation, creation, onSelect]);
  async function create() {
    if (busy) return;
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
        : name !== 'Ma réserve'
          ? 'Terminez la saisie du nom de réserve avant d’actualiser.'
          : null,
  );
  return (
    <Gate title="Votre réserve." theme={theme}>
      <p>{session.user.email}</p>
      {reserves === null ? (
        <>
          <p role="status">Chargement de vos réserves…</p>
          {error && (
            <>
              <p role="alert" className="form-error">
                {error}
              </p>
              <button className="secondary-button" onClick={() => setLoad((n) => n + 1)}>
                Réessayer
              </button>
            </>
          )}
        </>
      ) : (
        <>
          {invitation && (
            <section className="account-section">
              <h2>Rejoindre la réserve</h2>
              <p>
                {alreadyMember
                  ? 'Vous faites déjà partie de cette réserve.'
                  : 'L’invitation doit correspondre à votre adresse email confirmée.'}
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
                {alreadyMember ? 'Ouvrir la réserve' : 'Accepter l’invitation'}
              </button>
              <button className="text-button" onClick={clearInvitation} disabled={busy}>
                Ignorer cette invitation
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
          {!invitation && (
            <form
              className="product-form account-section"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <h2>{creation ? 'Création à vérifier' : 'Créer une réserve vide'}</h2>
              <label>
                Nom de la réserve
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
                  ? 'Veuillez patienter…'
                  : creation
                    ? 'Reprendre la création'
                    : 'Créer la réserve'}
              </button>
            </form>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </>
      )}
      <button className="text-button" onClick={logout}>
        Se déconnecter
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
              {m.user_id === session.user.id ? 'Vous' : 'Autre membre'}{' '}
              <span>{m.role === 'owner' ? 'Propriétaire' : 'Membre'}</span>
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
          <h3>Inviter une personne</h3>
          <label>
            Email du destinataire
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
              ? 'Veuillez patienter…'
              : pending
                ? 'Reprendre l’invitation'
                : 'Générer un lien d’invitation'}
          </button>
          <small>Valable 24 h pour cette adresse. Un nouveau lien remplace les précédents.</small>
        </form>
      )}
      {link && (
        <div className="invitation-result">
          <label>
            Lien temporaire
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
            Copier le lien
          </button>
          {!!navigator.share && (
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await navigator.share({ title: 'Rejoindre ma réserve', url: link });
                } catch {
                  /* Cancellation is harmless. */
                }
              }}
            >
              Partager
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <p className="form-note">
        Photos partagées et consultation après fermeture hors ligne à venir. Les quantités sont
        actualisées toutes les cinq secondes lorsque l’application est visible.
      </p>
      <button className="danger-button" onClick={logout}>
        Se déconnecter
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
      <Gate title="Votre réserve." theme={theme}>
        <p role="status">
          {view.status === 'loading' ? 'Chargement du stock…' : 'La réserve est indisponible.'}
        </p>
        {view.error && (
          <p role="alert" className="form-error">
            {view.error}
          </p>
        )}
        <button className="secondary-button" onClick={() => void store.refresh()}>
          Réessayer
        </button>
        <button className="text-button" onClick={logout}>
          Se déconnecter
        </button>
      </Gate>
    );
  return (
    <App
      theme={theme}
      shared={{ store, view }}
      productProvider={productProvider}
      accountSettings={<SharingSettings session={session} store={store} logout={logout} />}
    />
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
    const next = new SharedPantryStore(backend!, session.user.id, reserveId, sessionStorage);
    setStore(next);
    return () => next.dispose();
  }, [session.user.id, reserveId]);
  return store ? (
    <PantryScreen store={store} session={session} theme={theme} logout={logout} />
  ) : null;
}
export default function Root() {
  const theme = useThemePreference();
  const [demo, setDemo] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(client ? undefined : null);
  const [incoming, setIncoming] = useState<IncomingLink>(initialLink);
  const [reserveId, setReserveId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(!!initialLink.confirmation);
  const [confirmationError, setConfirmationError] = useState('');
  const identity = useRef<string | null>(null);
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
      if (identity.current !== (next?.user.id ?? null)) {
        if (identity.current) {
          try {
            clearPrivateIntents(sessionStorage);
          } catch {
            /* No private snapshot cache. */
          }
        }
        identity.current = next?.user.id ?? null;
        setReserveId(null);
      }
      setSession(next);
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && !eventReceived) setSession(error ? null : data.session);
      })
      .catch(() => {
        if (active) setSession(null);
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
    setSession(null);
    setReserveId(null);
    setIncoming({});
    try {
      clearPrivateIntents(sessionStorage);
    } catch {
      /* Private snapshots exist in memory only. */
    }
    void auth?.signOut();
  }
  if (demo) return <App theme={theme} onExitDemo={() => setDemo(false)} />;
  if (incoming.error || confirmationError)
    return (
      <Gate title="Lien indisponible." theme={theme}>
        <p role="alert" className="form-error">
          {incoming.error || confirmationError}
        </p>
        <button
          className="secondary-button"
          onClick={() => {
            setIncoming({});
            setConfirmationError('');
          }}
        >
          Continuer
        </button>
      </Gate>
    );
  if (confirming || session === undefined)
    return (
      <Gate title="Votre réserve." theme={theme}>
        <p role="status">
          {confirming ? 'Confirmation de votre adresse…' : 'Vérification de la session…'}
        </p>
      </Gate>
    );
  if (!session)
    return (
      <AuthForm
        invitation={incoming.invitation}
        linkError={incoming.error ?? confirmationError}
        theme={theme}
        onDemo={() => setDemo(true)}
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
