import { Pencil, ShoppingBasket, Trash2 } from 'lucide-react';
import type { Product } from '../../../src/model';
import { Attribution, ImageArea, Quantity, StockStatus, useText } from './ui';
import { metadata } from './operations';

export function Details({
  product,
  composition,
  locked,
  change,
  adjust,
  add,
  edit,
  remove,
}: {
  product: Product;
  composition: 'object' | 'split';
  locked: boolean;
  change: (d: 1 | -1) => void;
  adjust: () => void;
  add: () => void;
  edit: () => void;
  remove: () => void;
}) {
  const t = useText();
  return (
    <div
      className={`detail-content ${composition === 'split' ? 'detail-split' : 'detail-object-composition'}`}
    >
      <div className="detail-object">
        <ImageArea product={product} />
      </div>
      <div className="detail-meta">
        <p className="detail-package">{metadata(product) || t(product.category ?? 'Autres')}</p>
        <StockStatus product={product} />
        <div className="detail-stock">
          <span>{t('Quantité en stock')}</span>
          <Quantity
            product={product.name}
            value={product.quantity}
            disabled={locked}
            propose={adjust}
            change={change}
          />
        </div>
      </div>
      <div className="detail-actions">
        <button className="primary" disabled={locked} onClick={add}>
          <ShoppingBasket size={18} />
          {t('Ajouter à la liste')}
        </button>
        <button className="secondary" disabled={locked} onClick={edit}>
          <Pencil size={17} />
          {t('Modifier')}
        </button>
      </div>
      <Attribution product={product} />
      <button className="text-button danger-text delete-product" disabled={locked} onClick={remove}>
        <Trash2 size={16} />
        {t('Supprimer le produit')}
      </button>
    </div>
  );
}
