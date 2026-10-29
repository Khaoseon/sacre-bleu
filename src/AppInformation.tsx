import { useEffect, useState } from 'react';

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
    <section className="app-information" aria-label="Version de l’application">
      <p className="app-version">
        Version {__APP_BUILD_INFO__.version} · <code>{__APP_BUILD_INFO__.revision}</code>
      </p>
      <details>
        <summary>Diagnostic d’affichage</summary>
        <dl>
          <div>
            <dt>Compilation</dt>
            <dd>
              <time dateTime={__APP_BUILD_INFO__.builtAt}>
                {new Date(__APP_BUILD_INFO__.builtAt).toLocaleString('fr-FR')}
              </time>
            </dd>
          </div>
          <div>
            <dt>Affichage demandé</dt>
            <dd>
              {__APP_BUILD_INFO__.requestedDisplay === 'fullscreen' ? 'Plein écran' : 'Standard'}
            </dd>
          </div>
          <div>
            <dt>Affichage détecté</dt>
            <dd>{display}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
