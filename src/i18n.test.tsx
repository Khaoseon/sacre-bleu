import { SharedPantryStore } from './backend/store';
import type { ReserveBackend, ReserveSnapshot, MutationReceipt } from './backend/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import App from './App';
import { ProductForm, Quantity, packageLabel } from './components';
import { AppearanceSettings } from './AppearanceSettings';
import { CameraScanner } from './CameraScanner';
import { LookupIndicator } from './LookupIndicator';
import { BackendError, backendError, authMessage } from './backend/errors';
import { categories, units, ScanRecognition, saveProduct, type State, type Product } from './model';
import { catalog } from './i18n/catalog';
import { plurals } from './i18n/plurals';
import {
  chooseLanguage,
  readLanguage,
  LANGUAGE_KEY,
  t,
  label,
  message,
  deferred,
  number,
  packages,
  restock,
  shoppingCount,
  locale,
  scanSummary,
} from './i18n';
const memory = new Map<string, string>();
const storage = () => ({
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
});
const choose = (language: 'fr' | 'en') => chooseLanguage(language, storage);
afterEach(() => {
  memory.clear();
  choose('fr');
});
const theme = { preference: 'auto' as const, chooseTheme: () => {}, error: '' };
const product: Product = {
  id: 'p',
  name: 'Paramètres',
  category: 'Féculents',
  unit: 'pièce',
  size: 1.5,
  quantity: 2,
  updatedAt: '2026-10-30T12:00:00.000Z',
};
const slots = (value: string) => [...value.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort();

describe('device language preference', () => {
  it('defaults to French, ignoring browser language and malformed preferences', () => {
    memory.clear();
    expect(readLanguage(storage)).toBe('fr');
    for (const value of ['de', 'EN', '"en"', '{', '']) {
      memory.set(LANGUAGE_KEY, value);
      expect(readLanguage(storage)).toBe('fr');
    }
  });
  it('only writes its own key and survives reading a new installation session', () => {
    memory.set('auth', 'untouched');
    memory.set('app-reserve.theme.v1', 'dark');
    choose('en');
    expect(readLanguage(storage)).toBe('en');
    expect(memory.size).toBe(3);
    expect(memory.get('auth')).toBe('untouched');
    expect(memory.get('app-reserve.theme.v1')).toBe('dark');
    memory.delete('auth');
    expect(readLanguage(storage)).toBe('en');
  });
  it('handles inaccessible storage and retains the selected in-memory language', () => {
    const broken = () => {
      throw new Error('denied');
    };
    expect(readLanguage(broken)).toBe('fr');
    expect(() => chooseLanguage('en', broken)).not.toThrow();
    expect(t('Paramètres')).toBe('Settings');
  });
});
describe('translation contracts and formatting', () => {
  it('has a nonempty translation and identical interpolation slots for every message', () => {
    for (const [key, value] of Object.entries(catalog)) {
      expect(value.fr, key).toBe(key);
      expect(value.en.trim(), key).not.toBe('');
      expect(slots(value.en), key).toEqual(slots(value.fr));
    }
    for (const forms of Object.values(plurals))
      for (const language of ['fr', 'en'] as const) {
        expect(Object.keys(forms[language]).sort()).toEqual(['one', 'other']);
        expect(forms[language].one).toBeTruthy();
        expect(forms[language].other).toBeTruthy();
      }
  });
  it('keeps all established service messages covered without moving presentation into business modules', () => {
    for (const file of [
      'model.ts',
      'storage.ts',
      'theme.ts',
      'backend/errors.ts',
      'backend/adapter.ts',
      'backend/links.ts',
      'backend/store.ts',
      'scanner/camera.ts',
      'scanner/decoder.ts',
      'pwaUpdateController.ts',
    ]) {
      const source = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
      expect(source).not.toMatch(/from ['"].*i18n/);
      const literals = [...source.matchAll(/'([^'\r\n]*(?:[À-ÿ][^'\r\n]*|[.!?]))'/g)].map(
        (m) => m[1],
      );
      for (const text of literals) {
        if (!/^[A-ZÀ-Ÿ].* /.test(text)) continue;
        if (
          ['Féculents', 'Légumineuses', 'Épicerie', 'pièce'].includes(text) ||
          text.includes('Snapshot ') ||
          (text.includes('Caméra ') && text.length < 10)
        )
          continue;
        expect(Object.hasOwn(catalog, text), file + ': ' + text).toBe(true);
      }
    }
  });
  it('interpolates names safely and resolves deferred notices in the current language', () => {
    const notice = deferred('{0} · quantité mise à jour', { 0: '<script>Paramètres</script>' });
    choose('en');
    expect(message(notice)).toBe('<script>Paramètres</script> · quantity updated');
    choose('fr');
    expect(message(notice)).toContain('quantité mise à jour');
  });
  it('uses French and English plural and numeric rules only for display', () => {
    expect(packages(0)).toBe('0 emballage');
    expect(packages(2)).toBe('2 emballages');
    expect(number(1234.5)).toContain('1');
    choose('en');
    expect(packages(0)).toBe('0 packages');
    expect(packages(1)).toBe('1 package');
    expect(packages(2)).toBe('2 packages');
    expect(restock(1)).toBe('1 product to restock');
    expect(shoppingCount(2)).toBe('2 items to fill the shelves.');
    expect(number(1234.5)).toBe('1,234.5');
    expect(locale()).toBe('en-GB');
    expect(scanSummary(2, -1, 3)).toBe('packages removed · 3 in stock');
    expect(
      new Date('2026-10-30T12:00:00.000Z').toLocaleDateString(locale(), { timeZone: 'UTC' }),
    ).toBe('30/10/2026');
  });
  it('preserves error classification and sanitizes unknown details in English', () => {
    const failure = backendError({ code: '23505', message: 'private SQL details' });
    choose('en');
    expect(failure.kind).toBe('rejected');
    expect(failure.code).toBe('23505');
    expect(message(failure.message)).toBe('This barcode is already used in your pantry.');
    expect(message(authMessage({ code: 'invalid_credentials' }))).toBe(
      'Incorrect email or password.',
    );
    expect(message(new BackendError('private SQL details').message)).toBe(
      'Something went wrong. Try again.',
    );
    expect(message('Donnez un nom au produit.')).toBe('Give the product a name.');
  });
});
describe.each(['fr', 'en'] as const)('French/English rendering (%s)', (language) => {
  it('renders product dialogs, native form values, categories and accessible controls', () => {
    choose(language);
    const html = renderToStaticMarkup(
      <ProductForm
        editor={{ product }}
        onSave={async () => true}
        onDelete={() => {}}
        close={() => {}}
      />,
    );
    expect(html).toContain(language === 'en' ? 'Edit product' : 'Modifier le produit');
    expect(html).toContain('value="Féculents"');
    expect(html).toContain('value="pièce"');
    expect(html).toContain('value="Paramètres"');
    expect(html).toContain(language === 'en' ? 'Starches' : 'Féculents');
    const quantity = renderToStaticMarkup(
      <Quantity name="Paramètres" value={1} onChange={() => {}} />,
    );
    expect(quantity).toContain(language === 'en' ? 'Add one Paramètres' : 'Ajouter un Paramètres');
    expect(quantity).toContain(language === 'en' ? '1 package' : '1 emballage');
    expect(packageLabel(product)).toBe(language === 'en' ? '1.5 piece' : '1,5 pièce');
  });
  it('renders settings, scanner and lookup status', () => {
    choose(language);
    const settings = renderToStaticMarkup(<AppearanceSettings theme={theme} />);
    expect(settings).toContain('Français');
    expect(settings).toContain('English');
    expect(settings).toContain(language === 'en' ? 'Light sage' : 'Sauge claire');
    const scanner = renderToStaticMarkup(
      <CameraScanner recognition={new ScanRecognition()} paused={false} onCode={() => {}} />,
    );
    expect(scanner).toContain(
      language === 'en' ? 'Rear camera preview' : 'Aperçu de la caméra arrière',
    );
    expect(scanner).toContain(language === 'en' ? 'Enable camera' : 'Activer la caméra');
    expect(renderToStaticMarkup(<LookupIndicator />)).toContain(
      language === 'en' ? 'OFF · disabled in demo' : 'OFF · désactivé dans la démonstration',
    );
  });
  it('renders inventory and retains stored data identifiers and user content', () => {
    choose(language);
    const html = renderToStaticMarkup(<App theme={theme} />);
    expect(html).toContain(language === 'en' ? 'Your stock' : 'Votre stock');
    expect(html).toContain(
      language === 'en' ? 'Search your pantry…' : 'Rechercher dans votre réserve…',
    );
    const state: State = { version: 1, revision: 0, sort: 'name', products: [], shopping: [] };
    expect(saveProduct(state, product).products[0]).toMatchObject({
      name: product.name,
      category: 'Féculents',
      unit: 'pièce',
      quantity: 2,
      size: 1.5,
    });
    expect(categories).toContain('Féculents');
    expect(units).toContain('pièce');
    expect(label('Féculents')).toBe(language === 'en' ? 'Starches' : 'Féculents');
  });
});

it('updates authenticated saving/synchronized feedback and preserves the pending intention', async () => {
  const snapshot: ReserveSnapshot = {
    reserve: {
      id: 'r',
      name: 'Ma réserve',
      owner_id: 'u',
      revision: 1,
      created_at: '',
      updated_at: '',
    },
    members: [],
    products: [],
    shopping: [],
  };
  let finish!: (value: MutationReceipt) => void;
  const journal = new Map<string, string>();
  const store = new SharedPantryStore(
    {
      execute: () =>
        new Promise<MutationReceipt>((resolve) => {
          finish = resolve;
        }),
      getSnapshot: async () => snapshot,
    } as unknown as ReserveBackend,
    'u',
    'r',
    {
      getItem: (key) => journal.get(key) ?? null,
      setItem: (key, value) => {
        journal.set(key, value);
      },
      removeItem: (key) => {
        journal.delete(key);
      },
    },
    () => true,
  );
  await store.refresh();
  const saving = store.scanProduct('p', 1);
  const before = [...journal];
  expect(before.length).toBe(1);
  choose('en');
  const render = () =>
    renderToStaticMarkup(<App theme={theme} shared={{ store, view: store.getSnapshot() }} />);
  expect(render()).toContain('<span role="status">Saving…</span>');
  expect(render()).not.toContain('Enregistrement…');
  expect([...journal]).toEqual(before);
  snapshot.reserve.revision = 2;
  finish({ revision: 2 });
  await saving;
  expect(render()).toContain('<span role="status">Synchronized</span>');
  choose('fr');
  expect(render()).toContain('<span role="status">Synchronisé</span>');
  expect(store.getSnapshot().completed).toBe(1);
  expect(journal.size).toBe(0);
  store.dispose();
});
