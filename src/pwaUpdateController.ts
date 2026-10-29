import { PENDING_PREFIX } from './backend/store';

type UpdateState = {
  available: boolean;
  deferred: boolean;
  checking: boolean;
  applying: boolean;
  supported: boolean;
  message: string;
};
const blockers = new Map<symbol, () => string | null>();
export function registerUpdateBlocker(check: () => string | null) {
  const key = Symbol();
  blockers.set(key, check);
  return () => {
    blockers.delete(key);
  };
}
function blockedReason(): string | null {
  for (const check of blockers.values()) {
    const reason = check();
    if (reason) return reason;
  }
  try {
    if (Object.keys(sessionStorage).some((key) => key.startsWith(PENDING_PREFIX)))
      return 'Terminez ou vérifiez la demande en attente avant d’actualiser.';
  } catch {
    return 'Impossible de vérifier les demandes en attente. Réessayez après avoir rouvert l’application.';
  }
  // Password managers can fill inputs without updating React's form state.
  if (
    Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="password"], input[type="email"]'),
    ).some((input) => !input.readOnly && input.value)
  )
    return 'Terminez ou effacez la saisie du compte avant d’actualiser.';
  return null;
}
function timeout<T>(promise: Promise<T>, milliseconds = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

class AppUpdates {
  private state: UpdateState = {
    available: false,
    deferred: false,
    checking: false,
    applying: false,
    supported: false,
    message: '',
  };
  private listeners = new Set<() => void>();
  private registration: Promise<ServiceWorkerRegistration> | null = null;
  private lastCheck = 0;
  private reloaded = false;
  private listening = false;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  private publish(patch: Partial<UpdateState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  start() {
    if (this.registration || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    this.publish({ supported: true });
    if (!this.listening) {
      this.listening = true;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Another tab's activation must never force this window to reload.
        if (this.state.applying && !this.reloaded) {
          this.reloaded = true;
          window.location.reload();
        }
      });
      const automatic = () => {
        if (document.visibilityState === 'visible') void this.check(false);
      };
      document.addEventListener('visibilitychange', automatic);
      window.addEventListener('online', automatic);
      window.setInterval(automatic, 30 * 60 * 1000);
    }
    this.registration = navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    void this.registration
      .then((registration) => {
        const ready = () => {
          if (registration.waiting && registration.active)
            this.publish({ available: true, message: 'Nouvelle version disponible.' });
        };
        const installing = () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', ready);
        };
        registration.addEventListener('updatefound', installing);
        installing();
        ready();
      })
      .catch(() => {
        this.publish({ message: 'Les mises à jour sont momentanément indisponibles. Réessayez.' });
        this.registration = null;
      });
  }
  async check(manual = true) {
    this.start();
    if (!this.state.supported) {
      if (manual)
        this.publish({ message: 'Vérification disponible dans la version installable publiée.' });
      return;
    }
    if (
      this.state.checking ||
      this.state.applying ||
      (!manual && Date.now() - this.lastCheck < 60000)
    )
      return;
    if (!navigator.onLine) {
      if (manual)
        this.publish({ message: 'Connexion Internet nécessaire pour vérifier les mises à jour.' });
      return;
    }
    this.lastCheck = Date.now();
    this.publish({
      checking: true,
      ...(manual ? { message: 'Recherche d’une mise à jour…' } : {}),
    });
    try {
      if (!this.registration) throw new Error('registration');
      const registration = await timeout(this.registration);
      await timeout(registration.update());
      const worker = registration.installing;
      if (worker)
        await timeout(
          new Promise<void>((resolve, reject) => {
            const changed = () => {
              if (worker.state === 'installed' || worker.state === 'activated') {
                worker.removeEventListener('statechange', changed);
                resolve();
              } else if (worker.state === 'redundant') {
                worker.removeEventListener('statechange', changed);
                reject(new Error('installation'));
              }
            };
            worker.addEventListener('statechange', changed);
            changed();
          }),
        );
      const available = !!registration.waiting && !!registration.active;
      this.publish({
        available,
        ...(manual ? { deferred: false } : {}),
        message: available
          ? 'Nouvelle version disponible.'
          : manual
            ? 'Aucune nouvelle version disponible.'
            : this.state.message,
      });
    } catch {
      if (manual)
        this.publish({
          message: 'Vérification impossible. Vérifiez votre connexion puis réessayez.',
        });
    } finally {
      this.publish({ checking: false });
    }
  }
  defer = () => {
    this.publish({ deferred: true });
  };
  async apply() {
    if (this.state.applying || this.state.checking) return;
    const reason = blockedReason();
    if (reason) {
      this.publish({ message: reason });
      return;
    }
    if (!navigator.onLine) {
      this.publish({ message: 'Rétablissez la connexion Internet avant d’actualiser.' });
      return;
    }
    try {
      if (!this.registration) throw new Error('registration');
      const registration = await timeout(this.registration);
      const worker = registration.waiting;
      if (!worker) {
        await this.check();
        return;
      }
      // Recheck after the asynchronous registration lookup, then freeze interaction
      // until activation succeeds or fails. No reload is queued for later.
      const currentReason = blockedReason();
      if (currentReason) {
        this.publish({ message: currentReason });
        return;
      }
      this.publish({ applying: true, message: 'Actualisation en cours…' });
      const channel = new MessageChannel();
      try {
        const status = await timeout(
          new Promise<string>((resolve) => {
            channel.port1.onmessage = (event: MessageEvent<{ status: string }>) =>
              resolve(event.data.status);
            worker.postMessage({ type: 'APPLY_APP_UPDATE' }, [channel.port2]);
          }),
        );
        if (status === 'other-windows') {
          this.publish({
            applying: false,
            message: 'Fermez les autres fenêtres de Sacré bleu, puis touchez Actualiser à nouveau.',
          });
          return;
        }
        if (status !== 'activating') throw new Error('activation');
        // A bounded failure also recovers the interface if controllerchange never arrives.
        window.setTimeout(() => {
          if (!this.reloaded)
            this.publish({
              applying: false,
              message: 'L’actualisation n’a pas abouti. Réessayez.',
            });
        }, 12000);
      } finally {
        channel.port1.close();
        channel.port2.close();
      }
    } catch {
      this.publish({
        applying: false,
        message: 'Actualisation impossible. Réessayez sans effacer les données.',
      });
    }
  }
}
export const appUpdates = new AppUpdates();
