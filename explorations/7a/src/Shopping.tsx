import { useState } from 'react';
import { Archive, Check, ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import { normalize, type Product, type State } from '../../../src/model';
import { ImageArea, Quantity, useText } from './ui';
import { metadata } from './operations';
import mascot from '../../../public/icon-192.png';

export function Shopping({
  state,
  name,
  setName,
  locked,
  add,
  check,
  change,
  remove,
  clear,
}: {
  state: State;
  name: string;
  setName: (v: string) => void;
  locked: boolean;
  add: (name: string, product?: Product) => void;
  check: (item: State['shopping'][number]) => void;
  change: (item: State['shopping'][number], delta: 1 | -1) => void;
  remove: (item: State['shopping'][number]) => void;
  clear: () => void;
}) {
  const t = useText(),
    [expanded, setExpanded] = useState<string | null>(null),
    [catalog, setCatalog] = useState(false),
    [limit, setLimit] = useState(6);
  const matches = state.products.filter((p) =>
    normalize([p.name, p.brand, p.barcode].join(' ')).includes(normalize(name.trim())),
  );
  const remaining = state.shopping.filter((i) => !i.checked),
    completed = state.shopping.filter((i) => i.checked);
  function row(item: State['shopping'][number]) {
    const product = state.products.find((p) => p.id === item.productId);
    return (
      <article
        key={item.id}
        className={`shopping-row ${item.checked ? 'completed' : ''}`}
        data-shopping={item.id}
      >
        <button
          className="check-item"
          aria-label={`${t(item.checked ? 'À prendre' : 'Dans le panier')} · ${item.name}`}
          aria-pressed={item.checked}
          disabled={locked}
          onClick={() => check(item)}
        >
          {item.checked && <Check size={19} />}
        </button>
        <div className="shopping-copy">
          <strong>{item.name}</strong>
          <small>{product ? t('Lié à la réserve') : t('Article libre')}</small>
        </div>
        <button
          className="row-options"
          aria-label={`${t('Quantité et options')} ${item.name}`}
          aria-expanded={expanded === item.id}
          onClick={() => setExpanded(expanded === item.id ? null : item.id)}
        >
          <span>{item.quantity}</span>
          <ChevronDown size={15} />
        </button>
        {expanded === item.id && (
          <div className="shopping-options">
            <Quantity
              product={item.name}
              value={item.quantity}
              minimum={1}
              disabled={locked}
              change={(delta) => change(item, delta)}
            />
            <button
              className="text-button danger-text"
              disabled={locked}
              aria-label={`${t('Supprimer')} ${item.name}`}
              onClick={() => remove(item)}
            >
              <Trash2 size={17} />
              {t('Supprimer')}
            </button>
          </div>
        )}
      </article>
    );
  }
  return (
    <>
      <div className="unified-entry">
        <form
          className="shopping-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add(name.trim());
          }}
        >
          <Search size={18} />
          <input
            aria-label={t('Ajouter à la liste')}
            placeholder={t('Un produit ou une idée…')}
            maxLength={120}
            disabled={locked}
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setLimit(6);
            }}
            aria-controls="shopping-suggestions"
            aria-expanded={!!name.trim() || catalog}
          />
          <button
            className="round"
            aria-label={t('Ajouter en texte libre')}
            disabled={locked || !name.trim()}
          >
            <Plus size={21} />
          </button>
        </form>
        {(name.trim() || catalog) && (
          <div className="entry-suggestions" id="shopping-suggestions">
            <p>{t('Choisir un produit lié')}</p>
            {matches.slice(0, limit).map((p) => (
              <button
                key={p.id}
                className="catalog-choice"
                disabled={locked}
                onClick={() => {
                  add(p.name, p);
                  setCatalog(false);
                }}
              >
                <ImageArea product={p} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{metadata(p) || t(p.category ?? 'Autres')}</small>
                </span>
                <Plus size={18} />
              </button>
            ))}
            {matches.length > limit && (
              <button className="text-button full" onClick={() => setLimit(limit + 12)}>
                {t('Voir plus de produits')}
              </button>
            )}
            {!matches.length && <small>{t('Aucun produit trouvé')}</small>}
            {name.trim() && (
              <button
                className="free-text-choice"
                disabled={locked}
                onClick={() => add(name.trim())}
              >
                <Plus size={18} />
                <span>
                  {t('Article libre')} · <strong>{name}</strong>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      <button
        className="text-button from-catalog"
        aria-expanded={catalog}
        onClick={() => setCatalog(!catalog)}
      >
        <Archive size={16} />
        {t('Parcourir la réserve')}
      </button>
      <div className="section-title">
        <h2>
          {t('À prendre')} <span>{remaining.length}</span>
        </h2>
      </div>
      <div className="shopping-list">{remaining.map(row)}</div>
      {!remaining.length && (
        <div className="empty-state">
          <img src={mascot} alt="" />
          <h2>{t('Tout est dans le panier.')}</h2>
        </div>
      )}
      {completed.length > 0 && (
        <>
          <div className="section-title">
            <h2>
              {t('Dans le panier')} <span>{completed.length}</span>
            </h2>
            <button className="text-button" disabled={locked} onClick={clear}>
              {t('Vider les cochés')}
            </button>
          </div>
          <div className="shopping-list">{completed.map(row)}</div>
        </>
      )}
    </>
  );
}
