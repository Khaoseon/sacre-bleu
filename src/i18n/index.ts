import { plurals } from './plurals';
import { useSyncExternalStore } from 'react';
import { catalog } from './catalog';
export type Language = 'fr' | 'en';
export type MessageKey = keyof typeof catalog;
export const LANGUAGE_KEY = 'app-reserve.language.v1';
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readLanguage(storage: () => PreferenceStorage = () => localStorage): Language {
  try {
    return storage().getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}
let language: Language = readLanguage();
let storageError = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getLanguage = () => language;
export const locale = () => (language === 'fr' ? 'fr-FR' : 'en-GB');
export function chooseLanguage(
  next: Language,
  storage: () => PreferenceStorage = () => localStorage,
) {
  if (next !== 'fr' && next !== 'en') return;
  storageError = false;
  try {
    storage().setItem(LANGUAGE_KEY, next);
  } catch {
    storageError = true;
  }
  language = next;
  applyLanguage();
  listeners.forEach((listener) => listener());
}
export function useLanguage() {
  useSyncExternalStore(subscribe, getLanguage, () => 'fr' as const);
  // Storage failures can change independently of the selected language.
  useSyncExternalStore(
    subscribe,
    () => storageError,
    () => false,
  );
  return { language, chooseLanguage, storageError };
}
type Slots<S extends string> = S extends `${string}{${infer P}}${infer Rest}`
  ? P | Slots<Rest>
  : never;
export function t<K extends MessageKey>(
  key: K,
  ...args: [Slots<K>] extends [never] ? [] : [Record<Slots<K>, string | number>]
): string {
  const text: string = catalog[key][language];
  const values = args[0] as Record<string, string | number> | undefined;
  return text.replace(/\{(\d+)\}/g, (_, slot: string) =>
    typeof values?.[slot] === 'number' ? number(values[slot]) : String(values?.[slot] ?? ''),
  );
}
export function number(value: number) {
  return new Intl.NumberFormat(locale()).format(value);
}
export function plural(key: keyof typeof plurals, count: number, value = count): string {
  const form = new Intl.PluralRules(locale()).select(count) === 'one' ? 'one' : 'other';
  return plurals[key][language][form].replace('{0}', number(value));
}
export const packages = (count: number) => plural('packages', count);
export const restock = (count: number) => plural('restock', count);
export const shoppingCount = (count: number) => plural('shopping', count);
export const scanSummary = (count: number, mode: 1 | -1, stock: number) =>
  plural(mode === 1 ? 'scanAdded' : 'scanRemoved', count, stock);
/** Only for app-owned service/status text. Never pass names or provider content.
 * Exact allowlist supports legacy French messages retained in pending intentions.
 * Unknown details are hidden in English; error classification remains in services.
 */
export type DeferredMessage = { key: MessageKey; values?: Record<string, string | number> };
export type DisplayMessage = string | DeferredMessage;
export function deferred<K extends MessageKey>(
  key: K,
  ...args: [Slots<K>] extends [never] ? [] : [Record<Slots<K>, string | number>]
): DeferredMessage {
  return { key, values: args[0] };
}
export function message(value: DisplayMessage): string {
  if (typeof value !== 'string')
    return (catalog[value.key][language] as string).replace(/\{(\d+)\}/g, (_, slot: string) =>
      typeof value.values?.[slot] === 'number'
        ? number(value.values[slot])
        : String(value.values?.[slot] ?? ''),
    );
  if (!value) return '';
  if (Object.hasOwn(catalog, value)) return catalog[value as MessageKey][language];
  const suffix =
    ' La fiche créée est conservée. Fermez ce formulaire puis scannez son code pour réessayer le mouvement.';
  if (value.endsWith(suffix))
    return t(
      '{0} La fiche créée est conservée. Fermez ce formulaire puis scannez son code pour réessayer le mouvement.',
      { 0: message(value.slice(0, -suffix.length)) },
    );
  return t('Une erreur est survenue. Réessayez.');
}
export function label(value: string): string {
  // Call only on controlled category/unit/theme/navigation labels.
  return Object.hasOwn(catalog, value) ? catalog[value as MessageKey][language] : value;
}
export function applyLanguage() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.title = t('Sacré bleu · Le garde-manger partagé');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      'content',
      t('Sacré bleu — votre réserve alimentaire et vos courses partagées, simplement.'),
    );
}
applyLanguage();
