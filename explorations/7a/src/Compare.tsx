import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { phase7aText } from '../../../src/i18n/phase7a';
import './compare.css';

function Compare() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr'),
    [area, setArea] = useState('inventory'),
    [fixture, setFixture] = useState('studio'),
    [width, setWidth] = useState(375),
    [choice, setChoice] = useState(1);
  const t = (key: Parameters<typeof phase7aText>[0]) => phase7aText(key, lang);
  const variants =
    area === 'inventory'
      ? [
          { name: t('Référence 7A.1'), url: '/baseline.html' },
          { name: t('A · Étagère photographique'), url: '/?layout=shelf' },
          { name: t('B · Inventaire compact'), url: '/?layout=compact' },
        ]
      : area === 'detail'
        ? [
            { name: t('Référence 7A.1'), url: '/baseline.html?detail=1' },
            { name: t('A · Fiche objet'), url: '/?detail=object' },
            { name: t('B · Fiche essentielle'), url: '/?detail=split' },
          ]
        : [
            {
              name: t('Référence 7A.1'),
              url: `/baseline.html?page=${area === 'shopping' ? 2 : 1}`,
            },
            {
              name: t(area === 'shopping' ? 'Saisie unifiée' : 'Session scanner'),
              url: `/?page=${area === 'shopping' ? 2 : 1}`,
            },
          ];
  return (
    <div className="comparison">
      <header>
        <a href="/">sacré bleu</a>
        <p>{t('Convergence 7A.2 · comparaison interactive')}</p>
        <select
          aria-label={t('Langue')}
          value={lang}
          onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </header>
      <nav aria-label={t('Comparaisons')}>
        {(
          [
            ['inventory', 'Stock'],
            ['detail', 'Détails'],
            ['shopping', 'À acheter'],
            ['scanner', 'Scanner'],
          ] as const
        ).map(([v, k]) => (
          <button
            key={v}
            aria-pressed={area === v}
            onClick={() => {
              setArea(v);
              setChoice(1);
            }}
          >
            {t(k)}
          </button>
        ))}
      </nav>
      <div className="compare-options">
        <label>
          {t('Exemples d’images')}
          <select value={fixture} onChange={(e) => setFixture(e.target.value)}>
            <option value="studio">{t('Packshots studio')}</option>
            <option value="mixed">{t('Conditions variées')}</option>
          </select>
        </label>
        <label>
          {t('Largeur de comparaison')}
          <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
            {[320, 375, 430].map((v) => (
              <option key={v} value={v}>
                {v} px
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="compare-note">
        {t(
          'Mêmes produits et quantités au chargement. Chaque aperçu est indépendant ; changer de proposition réinitialise sa simulation.',
        )}
      </p>
      <div className="mobile-choice">
        {variants.map((v, i) => (
          <button key={v.url} aria-pressed={choice === i} onClick={() => setChoice(i)}>
            {v.name}
          </button>
        ))}
      </div>
      <div className="comparisons">
        {variants.map((v, i) => (
          <section
            key={`${area}-${v.url}-${fixture}-${width}-${lang}`}
            className={choice === i ? 'chosen' : ''}
          >
            <h2>{v.name}</h2>
            <iframe
              title={v.name}
              style={{ width }}
              src={`${v.url}${v.url.includes('?') ? '&' : '?'}fixtures=${fixture}&lang=${lang}`}
            />
            <a href={`${v.url}${v.url.includes('?') ? '&' : '?'}fixtures=${fixture}&lang=${lang}`}>
              {t('Ouvrir en plein écran')}
            </a>
          </section>
        ))}
      </div>
      <p className="compare-note">
        {t(
          'Recommandation : liste par défaut, étagère à la demande ; fiche objet, saisie unifiée et scanner par session. À valider visuellement.',
        )}
      </p>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Compare />);
