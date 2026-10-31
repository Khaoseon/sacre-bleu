import { useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Plus, ScanLine, Trash2 } from 'lucide-react';
import { Modal, Quantity, packageLabel } from './components';
import { MAX_QUANTITY, selectProducts, type State } from './model';
import { number, shoppingCount, t } from './i18n';

type ShoppingActions = {
  state: State;
  locked: boolean;
  add: (name: string, quantity: number, productId?: string) => Promise<boolean>;
};

export function Shopping({
  state,
  locked,
  add,
  draft,
  setDraft,
  update,
  remove,
  clear,
  replenish,
}: ShoppingActions & {
  draft: string;
  setDraft: (value: string) => void;
  update: (id: string, patch: { quantity?: number; checked?: boolean }) => void;
  remove: (id: string) => void;
  clear: () => void;
  replenish: () => void;
}) {
  const [browsing, setBrowsing] = useState(false);
  const [limit, setLimit] = useState(6);
  const [busy, setBusy] = useState(false);
  const adding = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const remaining = state.shopping.filter((item) => !item.checked);
  const checked = state.shopping.filter((item) => item.checked);
  const matches = selectProducts(state, draft);
  async function submit(productId?: string) {
    if (locked || adding.current) return;
    const product = state.products.find((p) => p.id === productId);
    if (!product && !draft.trim()) return;
    adding.current = true;
    setBusy(true);
    try {
      if (await add(product?.name ?? draft, 1, product?.id)) {
        setDraft('');
        setBrowsing(false);
        requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
      }
    } finally {
      adding.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="shopping-essential">
      <div className="page-heading">
        <div>
          <h1>
            {t('À acheter')}
            <span>.</span>
          </h1>
          <p>
            {remaining.length
              ? shoppingCount(remaining.length)
              : t('Tout est prêt pour les prochaines courses.')}
          </p>
        </div>
        <button className="text-button" onClick={replenish}>
          {t('À réapprovisionner')}
        </button>
      </div>
      <form
        className="shopping-entry"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="sr-only" htmlFor="shopping-entry">
          {t('Rechercher ou ajouter un article')}
        </label>
        <input
          id="shopping-entry"
          disabled={busy}
          ref={input}
          value={draft}
          maxLength={120}
          placeholder={t('Rechercher ou ajouter un article')}
          onChange={(event) => {
            setDraft(event.target.value);
            setLimit(6);
          }}
        />
        <button
          className="primary-button"
          type="submit"
          disabled={locked || busy || !draft.trim()}
          aria-label={t('Ajouter comme article libre')}
        >
          <Plus size={20} />
        </button>
        <button
          className="text-button"
          type="button"
          aria-expanded={browsing}
          onClick={() => {
            setBrowsing(!browsing);
            input.current?.focus({ preventScroll: true });
          }}
        >
          {t('Parcourir')}
        </button>
      </form>
      {(draft.trim() || browsing) && (
        <section className="shopping-matches" aria-label={t('Suggestions du catalogue')}>
          <p>{t('Suggestions du catalogue')}</p>
          {matches.slice(0, limit).map((product) => (
            <button
              className="catalogue-suggestion"
              key={product.id}
              disabled={locked || busy}
              onClick={() => void submit(product.id)}
            >
              <span>
                <strong>{product.name}</strong>
                <small>
                  {[product.brand, packageLabel(product), product.barcode]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
              <span>
                {state.shopping.some((i) => i.productId === product.id && !i.checked)
                  ? t('Ajouter un exemplaire')
                  : t('Associer ce produit')}{' '}
                <Plus size={16} />
              </span>
            </button>
          ))}
          {matches.length > limit && (
            <button className="text-button" onClick={() => setLimit(limit + 6)}>
              {t('Voir plus')}
            </button>
          )}
          {draft.trim() && (
            <button className="text-button" disabled={locked || busy} onClick={() => void submit()}>
              {t('Ajouter « {0} » comme article libre', { 0: draft.trim() })}
            </button>
          )}
        </section>
      )}
      <section className="shopping-list" aria-label={t('Liste de courses')}>
        {[...remaining, ...checked].map((item) => {
          const product = state.products.find((p) => p.id === item.productId);
          return (
            <article
              className={`shopping-row essential-row ${item.checked ? 'checked' : ''}`}
              key={item.id}
            >
              <button
                className="shopping-check"
                aria-label={`${item.checked ? t('Décocher') : t('Cocher')} ${item.name}`}
                aria-pressed={item.checked}
                disabled={locked}
                onClick={() => update(item.id, { checked: !item.checked })}
              >
                <span className="check-item" aria-hidden="true">
                  {item.checked && <Check size={18} />}
                </span>
                <span className="shopping-item-name">
                  <strong>{item.name}</strong>
                  <span>
                    {product
                      ? [product.brand, packageLabel(product)].filter(Boolean).join(' · ') ||
                        t('Produit du catalogue')
                      : t('Article libre')}
                  </span>
                </span>
              </button>
              <details className="shopping-options">
                <summary aria-label={t('Quantité et options de {0}', { 0: item.name })}>
                  {number(item.quantity)} <ChevronDown size={16} />
                </summary>
                <div className="shopping-options-content">
                  <Quantity
                    name={item.name}
                    value={item.quantity}
                    zeroAllowed={false}
                    max={MAX_QUANTITY}
                    locked={locked}
                    onChange={(delta) =>
                      update(item.id, {
                        quantity: Math.max(1, item.quantity + delta),
                        checked: false,
                      })
                    }
                  />
                  <button
                    className="icon-button"
                    disabled={locked}
                    aria-label={t('Supprimer {0} des courses', { 0: item.name })}
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </details>
            </article>
          );
        })}
        {!state.shopping.length && (
          <div className="empty-state">
            <h2>{t('Une liste toute légère')}</h2>
            <p>{t('Ajoutez un article ou choisissez une suggestion.')}</p>
          </div>
        )}
      </section>
      {!!checked.length && (
        <button className="text-button clear-checked" disabled={locked} onClick={clear}>
          {t('Effacer les articles cochés (')}
          {number(checked.length)})
        </button>
      )}
      <p className="shopping-hint">
        <ScanLine size={17} />
        {t('Un scan en mode Ajouter réduit les quantités à acheter des produits associés.')}
      </p>
    </div>
  );
}

export function Replenishment({
  state,
  locked,
  add,
  close,
  recovery,
}: ShoppingActions & { close: () => void; recovery?: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const adding = useRef(false);
  const shortages = state.products.filter((p) => p.minimum !== undefined && p.quantity < p.minimum);
  const withoutMinimum = state.products.filter((p) => p.quantity === 0 && p.minimum === undefined);
  async function replenish(id: string) {
    if (locked || adding.current) return;
    const product = state.products.find((p) => p.id === id);
    if (
      !product ||
      product.minimum === undefined ||
      product.quantity >= product.minimum ||
      state.shopping.some((i) => !i.checked && i.productId === id)
    )
      return;
    adding.current = true;
    setBusy(true);
    try {
      await add(product.name, product.minimum - product.quantity, id);
    } finally {
      adding.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal title={t('À réapprovisionner')} close={close}>
      {recovery}
      <div className="replenishment-sheet">
        <p>{t('D’après les seuils que vous avez choisis.')}</p>
        {shortages.map((product) => {
          const present = state.shopping.some((i) => !i.checked && i.productId === product.id);
          return (
            <article key={product.id} className="replenishment-row">
              <div>
                <strong>{product.name}</strong>
                <p>
                  {number(product.quantity)} {t('en stock · minimum')} {number(product.minimum!)}
                </p>
              </div>
              <button
                className="secondary-button"
                disabled={locked || busy || present}
                onClick={() => void replenish(product.id)}
              >
                {present
                  ? t('Déjà dans les courses')
                  : `${t('Ajouter')} ${number(product.minimum! - product.quantity)}`}
              </button>
            </article>
          );
        })}
        {!shortages.length && <p>{t('Aucun produit sous son seuil.')}</p>}
        {!!withoutMinimum.length && (
          <section>
            <h3>{t('Épuisés sans seuil')}</h3>
            <p>{t('Aucune quantité suggérée sans minimum défini.')}</p>
            {withoutMinimum.map((p) => (
              <p key={p.id}>{p.name}</p>
            ))}
          </section>
        )}
      </div>
    </Modal>
  );
}
