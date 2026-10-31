import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bean, Minus, Package, Plus, Wheat, X } from 'lucide-react';
import type { Product } from '../../../src/model';
import { phase7aText, type Phase7aKey } from '../../../src/i18n/phase7a';
import { sampleImages, imageConditions, offCredits } from './fixtures';

export const Language = createContext<'fr' | 'en'>('fr');
export const PhotoFits = createContext<Record<string, 'contain' | 'cover'>>({});
export const useText = () => {
  const language = useContext(Language);
  return (key: Phase7aKey) => phase7aText(key, language);
};
export function ImageArea({ product }: { product?: Product }) {
  const t = useText();
  const fits = useContext(PhotoFits);
  const src = product?.photo ?? sampleImages[product?.id ?? ''];
  const [failed, setFailed] = useState('');
  const Icon =
    product?.category === 'Féculents'
      ? Wheat
      : product?.category === 'Légumineuses'
        ? Bean
        : Package;
  return (
    <span
      className={`image-area ${product?.photo ? `personal-photo personal-${fits[product.id] ?? 'contain'}` : (imageConditions[product?.id ?? ''] ?? '')}`}
    >
      {src && failed !== src ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)} />
      ) : (
        <span className="image-fallback">
          <Icon size={30} strokeWidth={1.25} />
          <span>{t(product ? 'Photo indisponible' : 'Article libre')}</span>
        </span>
      )}
    </span>
  );
}
export function Attribution({ product }: { product: Product }) {
  const t = useText(),
    credit = offCredits[product.id];
  return (
    <details className="image-credit">
      <summary>{t('À propos de ce visuel')}</summary>
      {credit && !product.photo ? (
        <p>
          <a
            href={`https://world.openfoodfacts.org/product/${credit.code}`}
            target="_blank"
            rel="noreferrer"
          >
            Open Food Facts · {credit.author}
          </a>
          <br />
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 3.0
          </a>
          {' · '}
          <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">
            ODbL
          </a>
          {product.id === 'crop' && ' · ' + t('Cadrage de test')}
        </p>
      ) : (
        <p>
          {t(
            product.photo
              ? 'Photo personnelle · locale à cette session'
              : product.id === 'personal'
                ? 'Photo personnelle fictive'
                : 'Visuel fictif · exploration',
          )}
        </p>
      )}
    </details>
  );
}
export function Quantity({
  product,
  value,
  disabled,
  change,
  minimum = 0,
  maximum = 9999,
  propose,
}: {
  product: string;
  value: number;
  disabled: boolean;
  change: (delta: 1 | -1) => void;
  minimum?: number;
  maximum?: number;
  propose?: () => void;
}) {
  const t = useText();
  const previous = useRef(value),
    confirmed = previous.current !== value;
  useEffect(() => {
    previous.current = value;
  }, [value]);
  return (
    <div className="stepper">
      <button
        aria-label={`${t('Retirer')} ${product}`}
        disabled={disabled || value <= minimum}
        onClick={() => change(-1)}
      >
        <Minus size={17} />
      </button>
      {propose ? (
        <button
          className="quantity-value"
          aria-label={`${t('Ajuster la quantité')} ${product}`}
          disabled={disabled}
          onClick={propose}
        >
          <span key={value} className={confirmed ? 'confirmed-count' : undefined}>
            {value}
          </span>
        </button>
      ) : (
        <output aria-label={t('Quantité en stock')}>
          <span key={value} className={confirmed ? 'confirmed-count' : undefined}>
            {value}
          </span>
        </output>
      )}
      <button
        aria-label={`${t('Ajouter')} ${product}`}
        disabled={disabled || value >= maximum}
        onClick={() => change(1)}
      >
        <Plus size={17} />
      </button>
    </div>
  );
}
export function StockStatus({ product: p }: { product: Product }) {
  const t = useText();
  return (
    <span
      className={`stock-status ${p.quantity === 0 ? 'zero' : p.minimum !== undefined && p.quantity < p.minimum ? 'low' : ''}`}
    >
      {p.quantity === 0
        ? t('Plus en réserve')
        : p.minimum !== undefined && p.quantity < p.minimum
          ? t('Stock bas')
          : t('En réserve')}
    </span>
  );
}
export function SheetFrame({
  title,
  close,
  busy,
  children,
  className = '',
}: {
  title: string;
  close: () => void;
  busy: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = useText(),
    ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current!;
    dialog.showModal();
    const viewport = window.visualViewport;
    const fit = () => {
      if (!viewport) return;
      dialog.style.maxHeight = `${viewport.height - 12}px`;
      dialog.style.bottom = `${Math.max(0, innerHeight - viewport.height - viewport.offsetTop)}px`;
      requestAnimationFrame(() => {
        const field = dialog.querySelector<HTMLElement>('input:focus,select:focus');
        const save = dialog.querySelector('.editor-save');
        if (
          field &&
          save &&
          field.getBoundingClientRect().bottom > save.getBoundingClientRect().top - 12
        )
          field.scrollIntoView({ block: 'center' });
      });
    };
    fit();
    viewport?.addEventListener('resize', fit);
    viewport?.addEventListener('scroll', fit);
    return () => {
      viewport?.removeEventListener('resize', fit);
      viewport?.removeEventListener('scroll', fit);
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet ${className}`}
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="sheet-grip" aria-hidden="true" />
      <header className="sheet-header">
        <h2 id="sheet-title">{title}</h2>
        <button className="round" aria-label={t('Fermer')} disabled={busy} onClick={close}>
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
