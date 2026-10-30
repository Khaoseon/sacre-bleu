import { t, message, locale } from './i18n';

import { useEffect, useState } from 'react';
import { UpdateControls } from './AppUpdates';

const displayQueries = ['fullscreen', 'standalone', 'minimal-ui'] as const;
function currentDisplay(): string {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return 'Indéterminé';
  if (document.fullscreenElement) return 'Plein écran temporaire';
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'Plein écran';
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone
  )
    return 'Application installée · standard';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'Interface réduite';
  return 'Onglet du navigateur';
}

export function AppInformation() {
  const [display, setDisplay] = useState(currentDisplay);
  useEffect(() => {
    const update = () => setDisplay(currentDisplay());
    if (typeof window.matchMedia !== 'function') return;
    const queries = displayQueries.map((value) => window.matchMedia(`(display-mode: ${value})`));
    for (const query of queries) query.addEventListener('change', update);
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      for (const query of queries) query.removeEventListener('change', update);
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <section className="app-information" aria-label={t('Version de l’application')}>
      <p className="app-version">
        {t('Version')} {__APP_BUILD_INFO__.version} · <code>{__APP_BUILD_INFO__.revision}</code>
      </p>
      <UpdateControls />
      <details>
        <summary>{t('Diagnostic d’affichage')}</summary>
        <dl>
          <div>
            <dt>{t('Compilation')}</dt>
            <dd>
              <time dateTime={__APP_BUILD_INFO__.builtAt}>
                {new Date(__APP_BUILD_INFO__.builtAt).toLocaleString(locale())}
              </time>
            </dd>
          </div>
          <div>
            <dt>{t('Affichage demandé')}</dt>
            <dd>
              {__APP_BUILD_INFO__.requestedDisplay === 'fullscreen'
                ? t('Plein écran')
                : t('Standard')}
            </dd>
          </div>
          <div>
            <dt>{t('Affichage détecté')}</dt>
            <dd>{message(display)}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
