import { getLanguage, type Language } from './index';

/** Context distinguishes undoing a completed write from cancelling a form. */
export const actionCatalog = {
  undoShoppingDeletion: { fr: 'Annuler', en: 'Undo' },
} as const satisfies Record<string, Record<Language, string>>;

export function actionLabel(action: keyof typeof actionCatalog): string {
  return actionCatalog[action][getLanguage()];
}
