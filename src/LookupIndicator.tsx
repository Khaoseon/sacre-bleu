import { t, message, locale } from './i18n';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { LookupStatus, ProductProvider } from './productInfo';
const empty: LookupStatus = { reason: 'unknown', until: 0 };
const noSubscribe = () => () => {};
const noStatus = () => empty;

/** Countdown is local; this component never makes a request or claims a slot. */
export function LookupIndicator({ provider }: { provider?: ProductProvider }) {
  const status = useSyncExternalStore(
    provider?.subscribe ?? noSubscribe,
    provider?.getStatus ?? noStatus,
    provider?.getStatus ?? noStatus,
  );
  const [, tick] = useState(0);
  useEffect(() => {
    if (status.until <= Date.now()) return;
    const timer = window.setInterval(() => {
      tick((value) => value + 1);
      if (Date.now() >= status.until) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [status.until]);
  const seconds = Math.max(0, Math.ceil((status.until - Date.now()) / 1000));
  const statusLabel = !provider
    ? 'OFF · désactivé dans la démonstration'
    : status.reason === 'auth'
      ? 'OFF · connexion à vérifier'
      : status.reason === 'network'
        ? 'Dernière recherche OFF indisponible'
        : seconds > 0 && status.reason === 'rate-limit'
          ? 'Open Food Facts temporairement limité'
          : seconds > 0
            ? 'Recherche OFF dans'
            : status.until
              ? 'OFF · aucun délai connu'
              : 'OFF · délai vérifié à la recherche';
  return (
    <p
      className="lookup-indicator"
      title={t(
        'Le créneau est commun aux deux appareils et vérifié par le serveur à chaque recherche. Un produit connu ne dépend pas d’OFF.',
      )}
    >
      <span role="status">{message(statusLabel)}</span>
      {seconds > 0 && (
        <>
          {' '}
          <time
            dateTime={new Date(status.until).toISOString()}
            aria-label={t('Reprise estimée à {0}', {
              0: new Date(status.until).toLocaleTimeString(locale()),
            })}
          >
            ~{seconds} s
          </time>
        </>
      )}
    </p>
  );
}
