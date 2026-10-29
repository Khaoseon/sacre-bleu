import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LookupIndicator } from './LookupIndicator';
import type { LookupStatus } from './productInfo';
function render(status: LookupStatus) {
  return renderToStaticMarkup(
    <LookupIndicator
      provider={{ lookup: async () => ({ status: 'missing' }), getStatus: () => status }}
    />,
  );
}
it('shows an actual server-derived internal deadline without inventing remaining scan quota', () => {
  const markup = render({ reason: 'cooldown', until: Date.now() + 5000 });
  expect(markup).toContain('Recherche OFF dans');
  expect(markup).toContain('~5 s');
  expect(markup).toContain('dateTime=');
  expect(markup).not.toContain('/15');
});
it('does not announce guaranteed availability when another device may have consumed the slot', () => {
  expect(render({ reason: 'unknown', until: 0 })).toContain('délai vérifié à la recherche');
  expect(render({ reason: 'cooldown', until: Date.now() - 1 })).toContain('aucun délai connu');
});
it('distinguishes upstream, auth and network states and leaves demo disabled', () => {
  expect(render({ reason: 'rate-limit', until: Date.now() + 17000 })).toContain(
    'Open Food Facts temporairement limité',
  );
  expect(render({ reason: 'auth', until: 0 })).toContain('connexion à vérifier');
  expect(render({ reason: 'network', until: 0 })).toContain('Dernière recherche OFF indisponible');
  expect(renderToStaticMarkup(<LookupIndicator />)).toContain('désactivé dans la démonstration');
});
