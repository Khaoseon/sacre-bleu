import type { DisplayMessage } from './i18n';
import { ProductMedia } from './ui/ProductMedia';
import { usePrivatePhoto } from './ui/PrivatePhotos';
import { preparePhoto } from './photos';
import { t, message, label, locale, number, packages } from './i18n';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Bean,
  Check,
  Fish,
  Leaf,
  Minus,
  Package,
  Plus,
  Soup,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';
import {
  categories,
  id,
  MAX_QUANTITY,
  units,
  type Category,
  type Product,
  type Unit,
} from './model';
import { imageUrl, sourceUrl, type LookupResult, type ProductSuggestion } from './productInfo';

export type Editor = {
  product?: Product;
  barcode?: string;
  fromScan?: boolean;
  mode?: 1 | -1;
  suggestion?: ProductSuggestion;
  lookup?: LookupResult['status'] | 'loading';
  lookupReason?: Extract<LookupResult, { status: 'unavailable' }>['reason'];
};
export const packageLabel = (p: Product) =>
  p.size ? `${p.size.toLocaleString(locale())} ${p.unit ? label(p.unit) : ''}` : '';
const productIcons = {
  Féculents: Wheat,
  Conserves: Soup,
  Légumineuses: Bean,
  Épicerie: Leaf,
  Autres: Package,
};
export function ProductImage({
  product,
  describe = false,
}: {
  product: Product;
  describe?: boolean;
}) {
  const personal = usePrivatePhoto(product.id, product.privatePhotoPath);
  const Icon = product.id === 'thon' ? Fish : productIcons[product.category ?? 'Autres'];
  const src = product.photo ?? personal.src ?? imageUrl(product.external?.imageUrl);
  return (
    <>
      <ProductMedia
        mediaRef={personal.ref}
        title={
          product.privatePhotoPath && !personal.src
            ? t('Photo personnelle indisponible. Image OFF ou catégorie affichée.')
            : undefined
        }
        src={src}
        alt=""
        className={`product-image image-${categories.indexOf(product.category ?? 'Autres')}`}
        fallback={<Icon aria-hidden="true" size={28} strokeWidth={1.5} />}
      />
      {describe && product.privatePhotoPath && !personal.src && !product.photo && (
        <small role="status">
          {t('Photo personnelle indisponible. Image OFF ou catégorie affichée.')}
        </small>
      )}
    </>
  );
}
export function ProductAttribution({
  barcode,
  image = false,
}: {
  barcode: string;
  image?: boolean;
}) {
  return (
    <small className="product-attribution">
      <a href={sourceUrl(barcode)} target="_blank" rel="noreferrer">
        {t('Open Food Facts et ses contributeurs')}
      </a>
      {' · '}
      <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">
        ODbL
      </a>
      {image && (
        <>
          {t(' · Photo OFF ')}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 3.0
          </a>
        </>
      )}
    </small>
  );
}
export function Quantity({
  name,
  value,
  onChange,
  zeroAllowed = true,
  max = MAX_QUANTITY,
  disabled = false,
  locked = false,
  increaseLabel,
  decreaseLabel,
}: {
  name: string;
  value: number;
  onChange: (delta: 1 | -1) => void;
  zeroAllowed?: boolean;
  max?: number;
  disabled?: boolean;
  locked?: boolean;
  increaseLabel?: string;
  decreaseLabel?: string;
}) {
  return (
    <div className="quantity">
      <button
        className="quantity-button"
        aria-label={decreaseLabel ?? t('Retirer un {0}', { 0: name })}
        disabled={disabled || locked || value <= (zeroAllowed ? 0 : 1)}
        onClick={() => onChange(-1)}
      >
        <Minus size={17} />
      </button>
      <span aria-label={disabled ? t('Quantité indisponible') : packages(value)}>
        {disabled ? '—' : number(value)}
      </span>
      <button
        className="quantity-button"
        aria-label={increaseLabel ?? t('Ajouter un {0}', { 0: name })}
        disabled={disabled || locked || value >= max}
        onClick={() => onChange(1)}
      >
        <Plus size={17} />
      </button>
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  error,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  error?: DisplayMessage;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement;
    dialog.showModal();
    (
      dialog.querySelector<HTMLElement>('input:not([type="hidden"]):not([type="radio"])') ??
      dialog.querySelector<HTMLElement>('h2')
    )?.focus();
    const viewport = window.visualViewport;
    const fit = () => {
      dialog.style.maxHeight = `${(viewport?.height ?? window.innerHeight) - 24}px`;
      const field = document.activeElement;
      if (field instanceof HTMLInputElement && dialog.contains(field))
        field.scrollIntoView({ block: 'nearest' });
    };
    fit();
    viewport?.addEventListener('resize', fit);
    return () => {
      viewport?.removeEventListener('resize', fit);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal sb-foundation"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      aria-labelledby={titleId}
    >
      <header>
        <h2 id={titleId} tabIndex={-1}>
          {title}
        </h2>
        <button className="icon-button" aria-label={t('Fermer')} onClick={close}>
          <X size={21} />
        </button>
      </header>
      {children}
      {error && (
        <p role="alert" className="form-error">
          {message(error)}
        </p>
      )}
    </dialog>
  );
}
export function ProductForm({
  editor,
  onSave,
  onDelete,
  close,
  shared = false,
  blocked = false,
  recovery,
}: {
  editor: Editor;
  onSave: (p: Product) => boolean | Promise<boolean>;
  onDelete: (p: Product) => void;
  close: () => void;
  shared?: boolean;
  blocked?: boolean;
  recovery?: ReactNode;
}) {
  const p = editor.product;
  const proposed = editor.suggestion;
  const defaults = p ?? proposed;
  const draftId = useRef(p?.id ?? id());
  const [photo, setPhoto] = useState(p?.photo);
  const [photoChange, setPhotoChange] = useState<string | null | undefined>();
  const [external] = useState(p?.external ?? proposed?.external);
  const [photoError, setPhotoError] = useState('');
  const [minimum, setMinimum] = useState(p?.minimum !== undefined);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [discardAction, setDiscardAction] = useState<'close' | 'delete'>('close');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (discard)
      formRef.current
        ?.closest('dialog')
        ?.querySelector<HTMLButtonElement>('.draft-warning button')
        ?.focus();
  }, [discard]);
  function requestClose() {
    if (saving || reading) return;
    setDiscardAction('close');
    if (dirty) setDiscard(true);
    else close();
  }
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || blocked) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const product: Product = {
        id: draftId.current,
        name: String(data.get('name')),
        brand: String(data.get('brand') ?? '').trim() || undefined,
        barcode: String(data.get('barcode')).trim() || undefined,
        size: data.get('size') ? Number(data.get('size')) : undefined,
        unit: String(data.get('unit')) as Unit,
        category: String(data.get('category') ?? 'Autres') as Category,
        photo,
        privatePhotoPath: p?.privatePhotoPath,
        privatePhotoVersion: p?.privatePhotoVersion,
        photoChange: shared ? photoChange : undefined,
        external,
        quantity: Number(data.get('quantity')),
        minimum: minimum ? Number(data.get('minimum')) : undefined,
        updatedAt: new Date().toISOString(),
      };
      if (!(await onSave(product))) setError('Impossible d’enregistrer le produit.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={
        p
          ? t('Modifier le produit')
          : editor.fromScan
            ? t('Nouveau code-barres')
            : t('Ajouter un produit')
      }
      close={requestClose}
    >
      {discard && (
        <section className="draft-warning" role="alert">
          <p>{t('Modifications non enregistrées')}</p>
          <div className="detail-actions">
            <button
              type="button"
              className="sb-button"
              onClick={() => {
                setDiscard(false);
                formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
              }}
            >
              {t('Continuer la saisie')}
            </button>
            <button
              type="button"
              className="sb-button"
              data-variant="secondary"
              onClick={() => (discardAction === 'delete' && p ? onDelete(p) : close())}
            >
              {t('Abandonner les modifications')}
            </button>
          </div>
        </section>
      )}
      {recovery}
      {editor.fromScan && (
        <p className="form-note">
          {t('Ce produit n’est pas encore dans votre réserve.')}{' '}
          {editor.mode === -1
            ? t(' Il sera créé avec la quantité indiquée, sans retrait automatique.')
            : t(' Indiquez sa quantité après cet ajout.')}
        </p>
      )}
      {editor.lookup === 'missing' && (
        <p className="form-note">{t('Produit absent d’Open Food Facts. Complétez la fiche.')}</p>
      )}
      {editor.lookup === 'unavailable' && (
        <p className="form-note">
          {editor.lookupReason === 'cooldown'
            ? t(
                'Le créneau partagé OFF est occupé. Consultez le délai dans le scanner ou saisissez le produit.',
              )
            : editor.lookupReason === 'rate-limit'
              ? t('Open Food Facts est temporairement limité. Vous pouvez saisir le produit.')
              : editor.lookupReason === 'auth'
                ? t('L’accès à la recherche OFF doit être vérifié. Vous pouvez saisir le produit.')
                : t('Recherche indisponible. Vous pouvez saisir le produit.')}
        </p>
      )}
      {proposed?.packageText && (
        <small>
          {t('Conditionnement indiqué :')} {proposed.packageText}
          {!proposed.size && t(' · à vérifier')}
        </small>
      )}
      {external && (
        <ProductAttribution barcode={external.barcode} image={!photo && !!external.imageUrl} />
      )}
      <form
        ref={formRef}
        onSubmit={submit}
        onInvalidCapture={(event) => {
          const details = event.target instanceof Element ? event.target.closest('details') : null;
          if (details) details.open = true;
        }}
        onChange={() => setDirty(true)}
        className="product-form"
        inert={discard}
      >
        <fieldset className="form-fields" disabled={blocked || saving}>
          <label>
            {t('Nom du produit')}{' '}
            <input
              name="name"
              autoFocus
              required
              maxLength={120}
              defaultValue={defaults?.name}
              placeholder={t('Ex. Pois chiches')}
            />
          </label>
          <div className={editor.fromScan ? '' : 'field-row'}>
            <label>
              {t('Quantité en stock')}{' '}
              <input
                name="quantity"
                type="number"
                required
                min="0"
                max={MAX_QUANTITY}
                step="1"
                readOnly={!!p}
                defaultValue={p?.quantity ?? (editor.mode === -1 ? 0 : 1)}
              />
            </label>
            {editor.fromScan ? (
              <label>
                {t('Code-barres')}
                <input name="barcode" value={editor.barcode} readOnly />
              </label>
            ) : (
              <label>
                {t('Code-barres')} <span>{t('facultatif')}</span>
                <input
                  name="barcode"
                  inputMode="numeric"
                  pattern="[0-9]{4,32}"
                  maxLength={32}
                  defaultValue={p?.barcode ?? editor.barcode}
                  placeholder={t('13 chiffres…')}
                />
              </label>
            )}
          </div>
          {shared && p && (
            <small>{t('Modifiez le stock avec les boutons + et − de l’écran Stock.')}</small>
          )}
          <details className="product-metadata">
            <summary>{t('Informations produit')}</summary>
            <div className="field-row">
              <label>
                {t('Marque')} <span>{t('facultatif')}</span>
                <input
                  name="brand"
                  maxLength={80}
                  defaultValue={defaults?.brand}
                  placeholder={t('Ex. Bonduelle')}
                />
              </label>
              <label>
                {t('Catégorie')}{' '}
                <select name="category" defaultValue={defaults?.category ?? 'Autres'}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {label(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label>
                {t('Conditionnement')} <span>{t('facultatif')}</span>
                <input
                  name="size"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="99999"
                  defaultValue={defaults?.size}
                  placeholder="500"
                />
              </label>
              <label>
                {t('Unité')}{' '}
                <select name="unit" defaultValue={defaults?.unit ?? 'g'}>
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {label(u)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!editor.fromScan && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={minimum}
                  onChange={(e) => setMinimum(e.target.checked)}
                />{' '}
                {t('Me signaler un stock bas')}
              </label>
            )}
            {minimum && (
              <label>
                {t('Seuil minimum (emballages)')}{' '}
                <input
                  name="minimum"
                  type="number"
                  required
                  min="0"
                  max={MAX_QUANTITY}
                  step="1"
                  defaultValue={p?.minimum ?? 2}
                />
              </label>
            )}
          </details>
          <label>
            {t('Photo')} <span>{t('JPG, PNG ou WebP · 20 Mo max.')}</span>
            <input
              type="file"
              disabled={blocked || saving || reading}
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={async (e) => {
                setPhotoError('');
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = '';
                setReading(true);
                try {
                  const result = await preparePhoto(file);
                  setPhoto(result);
                  setPhotoChange(result);
                  setDirty(true);
                } catch (error) {
                  setPhotoError((error as Error).message);
                } finally {
                  setReading(false);
                }
              }}
            />
          </label>
          {shared && (
            <small>
              {t(
                'Photo privée partagée avec la réserve, en ligne uniquement. Le JSON ne contient pas les photos privées.',
              )}
            </small>
          )}
          {(photo || external?.imageUrl || (p?.privatePhotoPath && photoChange === undefined)) && (
            <div className="photo-preview">
              <ProductImage
                describe
                product={{
                  id: draftId.current,
                  name: '',
                  quantity: 0,
                  updatedAt: '',
                  photo,
                  privatePhotoPath: photoChange === undefined ? p?.privatePhotoPath : undefined,
                  external,
                }}
              />
              <button
                type="button"
                disabled={
                  blocked || saving || reading || (shared && !photo && !p?.privatePhotoPath)
                }
                className="text-button"
                onClick={() => {
                  setPhoto(undefined);
                  setPhotoChange(null);
                  setDirty(true);
                }}
              >
                {t('Retirer la photo')}
              </button>
            </div>
          )}
          {(photoError || error) && (
            <p role="alert" className="form-error">
              {message(photoError || error)}
            </p>
          )}
          <footer className="form-actions">
            {p && (
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  if (dirty) {
                    setDiscardAction('delete');
                    setDiscard(true);
                  } else onDelete(p);
                }}
              >
                <Trash2 size={17} /> {t('Supprimer')}
              </button>
            )}
            <button
              className="primary-button"
              disabled={reading || saving || blocked}
              type="submit"
            >
              <Check size={18} />{' '}
              {editor.fromScan && editor.mode === -1 ? t('Créer sans retrait') : t('Enregistrer')}
            </button>
          </footer>
        </fieldset>
      </form>
    </Modal>
  );
}
