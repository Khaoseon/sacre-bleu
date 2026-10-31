import { integer, StaleOperationError, type Product, type State } from '../../../src/model';
import type { Phase7aKey } from '../../../src/i18n/phase7a';

export type Scenario =
  'ready' | 'offline' | 'failure' | 'uncertain' | 'empty' | 'loading' | 'conflict' | 'unexpected';
export class SimulationFailure extends Error {}
export function errorKey(error: unknown): Phase7aKey {
  if (error instanceof SimulationFailure) return 'Échec simulé. Aucun changement appliqué.';
  if (error instanceof StaleOperationError)
    return 'Conflit : la réserve a changé. Vérifiez avant de réessayer.';
  if (error instanceof Error) {
    if (
      ['Ce produit est déjà épuisé.', 'Stock insuffisant pour ce retrait.'].includes(error.message)
    )
      return 'Stock insuffisant pour ce retrait.';
    if (
      [
        'La quantité doit être un entier entre 0 et 9 999.',
        'Le dernier scan doit traiter au moins un exemplaire. Utilisez Annuler pour revenir à zéro.',
        'Donnez un nom au produit.',
        'Le conditionnement doit être supérieur à zéro.',
        'Le code-barres doit contenir de 4 à 32 chiffres.',
        'Ce code-barres appartient déjà à un autre produit.',
        'Saisissez un article.',
        'Ajoutez au moins un emballage.',
      ].includes(error.message)
    )
      return error.message as Phase7aKey;
    if (error.message === 'Ce produit n’existe plus.')
      return 'Conflit : la réserve a changé. Vérifiez avant de réessayer.';
  }
  return 'Erreur inattendue. Aucun changement confirmé. Votre saisie est conservée.';
}
/** Exploration proposal: one stock delta intention. No shopping/scan side effects. */
export function adjustStockBy(state: State, productId: string, delta: number): State {
  const p = state.products.find((p) => p.id === productId);
  if (!p) throw new StaleOperationError();
  const quantity = integer(p.quantity + delta);
  return {
    ...state,
    products: state.products.map((p) =>
      p.id === productId ? { ...p, quantity, updatedAt: new Date().toISOString() } : p,
    ),
  };
}
/** Compensation for just one removed row; never restore a whole reserve snapshot. */
export function restoreRemoved(state: State, item: State['shopping'][number]): State {
  if (
    state.shopping.some(
      (i) =>
        i.id === item.id ||
        (!!item.productId && !item.checked && !i.checked && i.productId === item.productId),
    )
  )
    throw new StaleOperationError();
  const productId =
    item.productId && state.products.some((p) => p.id === item.productId)
      ? item.productId
      : undefined;
  return { ...state, shopping: [...state.shopping, { ...item, productId }] };
}
export function replenishment(state: State) {
  return state.products
    .filter((p) => p.minimum !== undefined && p.quantity < p.minimum)
    .map((p) => ({
      product: p,
      quantity: p.minimum! - p.quantity,
      linked: state.shopping.some((i) => i.productId === p.id && !i.checked),
    }));
}
export function metadata(product: Product) {
  return [product.brand, product.size ? `${product.size} ${product.unit ?? ''}` : undefined]
    .filter(Boolean)
    .join(' · ');
}
