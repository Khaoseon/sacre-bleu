import { memo } from 'react';
import {
  ChevronRight,
  Plus,
  Search,
  ArrowDownUp,
  ShoppingBasket,
  X,
  Rows3,
  Grid2X2,
} from 'lucide-react';
import { categories, selectProducts, type Product, type State } from '../../../src/model';
import { ImageArea, Quantity, StockStatus, useText } from './ui';
import mascot from '../../../public/icon-192.png';
import { metadata } from './operations';

export const Inventory = memo(function Inventory({
  state,
  query,
  setQuery,
  category,
  setCategory,
  sorted,
  setSorted,
  layout,
  setLayout,
  locked,
  loading,
  open,
  adjust,
  change,
  restock,
  create,
}: {
  state: State;
  query: string;
  setQuery: (s: string) => void;
  category: string;
  setCategory: (s: string) => void;
  sorted: boolean;
  setSorted: (v: boolean) => void;
  layout: 'shelf' | 'compact';
  setLayout: (v: 'shelf' | 'compact') => void;
  locked: boolean;
  loading: boolean;
  open: (p: Product) => void;
  adjust: (p: Product) => void;
  change: (p: Product, d: 1 | -1) => void;
  restock: () => void;
  create: () => void;
}) {
  const t = useText();
  const products = selectProducts(state, query, category);
  if (sorted)
    products.sort(
      (a, b) =>
        Number(a.quantity === 0) - Number(b.quantity === 0) ||
        (a.category ?? '').localeCompare(b.category ?? '') ||
        a.name.localeCompare(b.name),
    );
  const low = state.products.filter((p) => p.minimum !== undefined && p.quantity < p.minimum);
  return (
    <>
      {low.length > 0 && (
        <button className="restock-note" onClick={restock}>
          <ShoppingBasket size={17} />
          <span>
            {low.length}{' '}
            {t(
              low.length === 1 ? 'Produit à compléter' : 'Produits à compléter',
            ).toLocaleLowerCase()}
          </span>
          <ChevronRight size={17} />
        </button>
      )}
      {!!state.products.length && (
        <>
          <div className="search-bar">
            <Search size={18} />
            <input
              aria-label={t('Rechercher un produit')}
              placeholder={t('Rechercher un produit')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="round"
                aria-label={t('Effacer la recherche')}
                onClick={() => setQuery('')}
              >
                <X size={17} />
              </button>
            )}
            <button
              className="round"
              aria-label={t('Trier les produits')}
              aria-pressed={sorted}
              onClick={() => setSorted(!sorted)}
            >
              <ArrowDownUp size={18} />
            </button>
          </div>
          <div className="inventory-toolbar">
            <div className="filters" data-no-swipe aria-label={t('Filtrer par catégorie')}>
              {['Tout', ...categories].map((c) => (
                <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {t(c as 'Tout' | NonNullable<Product['category']>)}
                  {c === 'Tout' && <span className="filter-count">{state.products.length}</span>}
                </button>
              ))}
            </div>
            <button
              className="round layout-toggle"
              aria-label={t(layout === 'shelf' ? 'Vue compacte' : 'Vue photographique')}
              onClick={() => setLayout(layout === 'shelf' ? 'compact' : 'shelf')}
            >
              {layout === 'shelf' ? <Rows3 size={18} /> : <Grid2X2 size={18} />}
            </button>
          </div>
        </>
      )}
      {loading ? (
        <div className="skeleton-grid" role="status" aria-label={t('Chargement')}>
          {[1, 2, 3, 4].map((i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
      ) : products.length ? (
        <div className={`inventory inventory-${layout}`} data-layout={layout}>
          {products.map((p) => (
            <article
              className={`product-card ${p.quantity === 0 ? 'exhausted' : ''}`}
              key={p.id}
              data-product={p.id}
            >
              <button
                className="product-object"
                data-swipe-surface
                aria-label={`${t('Détails')} ${p.name}`}
                onClick={() => open(p)}
              >
                <ImageArea product={p} />
              </button>
              <div className="card-copy">
                <button className="product-name" data-swipe-surface onClick={() => open(p)}>
                  {p.name}
                </button>
                <span className="package-size">{metadata(p) || t(p.category ?? 'Autres')}</span>
                <StockStatus product={p} />
              </div>
              <Quantity
                product={p.name}
                value={p.quantity}
                disabled={locked}
                propose={() => adjust(p)}
                change={(d) => change(p, d)}
              />
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <img src={mascot} alt="" />
          <h2>
            {t(
              query || category !== 'Tout' ? 'Aucun produit trouvé' : 'Votre réserve commence ici',
            )}
          </h2>
          <p>
            {t(
              query || category !== 'Tout'
                ? 'Essayez un autre nom ou une autre catégorie.'
                : 'Ajoutez votre premier produit pour commencer.',
            )}
          </p>
          <button
            className="primary"
            onClick={() => {
              if (query || category !== 'Tout') {
                setQuery('');
                setCategory('Tout');
              } else create();
            }}
          >
            <Plus size={18} />
            {t(query || category !== 'Tout' ? 'Voir tous les produits' : 'Ajouter un produit')}
          </button>
        </div>
      )}
    </>
  );
});
