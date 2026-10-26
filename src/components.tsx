import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
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

export type Editor = { product?: Product; barcode?: string; fromScan?: boolean; mode?: 1 | -1 };
export const packageLabel = (p: Product) =>
  p.size ? `${p.size.toLocaleString('fr-FR')} ${p.unit ?? ''}` : '';
const productIcons = {
  Féculents: Wheat,
  Conserves: Soup,
  Légumineuses: Bean,
  Épicerie: Leaf,
  Autres: Package,
};
export function ProductImage({ product }: { product: Product }) {
  const Icon = product.id === 'thon' ? Fish : productIcons[product.category ?? 'Autres'];
  return (
    <span className={`product-image image-${categories.indexOf(product.category ?? 'Autres')}`}>
      {product.photo ? (
        <img src={product.photo} alt="" />
      ) : (
        <Icon aria-hidden="true" size={28} strokeWidth={1.5} />
      )}
    </span>
  );
}
export function Quantity({
  name,
  value,
  onChange,
  zeroAllowed = true,
  max = MAX_QUANTITY,
  disabled = false,
  increaseLabel,
  decreaseLabel,
}: {
  name: string;
  value: number;
  onChange: (delta: 1 | -1) => void;
  zeroAllowed?: boolean;
  max?: number;
  disabled?: boolean;
  increaseLabel?: string;
  decreaseLabel?: string;
}) {
  return (
    <div className="quantity">
      <button
        className="quantity-button"
        aria-label={decreaseLabel ?? `Retirer un ${name}`}
        disabled={disabled || value <= (zeroAllowed ? 0 : 1)}
        onClick={() => onChange(-1)}
      >
        <Minus size={17} />
      </button>
      <span aria-label={disabled ? 'Quantité indisponible' : `${value} emballages`}>
        {disabled ? '—' : value}
      </span>
      <button
        className="quantity-button"
        aria-label={increaseLabel ?? `Ajouter un ${name}`}
        disabled={disabled || value >= max}
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
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    ref.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={close} aria-labelledby="dialog-title">
      <header>
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Fermer" onClick={close}>
          <X size={21} />
        </button>
      </header>
      {children}
      {error && (
        <p role="alert" className="form-error">
          {error}
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
}: {
  editor: Editor;
  onSave: (p: Product) => boolean;
  onDelete: (p: Product) => void;
  close: () => void;
}) {
  const p = editor.product;
  const [photo, setPhoto] = useState(p?.photo);
  const [photoError, setPhotoError] = useState('');
  const [minimum, setMinimum] = useState(p?.minimum !== undefined);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const product: Product = {
        id: p?.id ?? id(),
        name: String(data.get('name')),
        brand: String(data.get('brand') ?? '').trim() || undefined,
        barcode: String(data.get('barcode')).trim() || undefined,
        size: data.get('size') ? Number(data.get('size')) : undefined,
        unit: String(data.get('unit')) as Unit,
        category: String(data.get('category') ?? 'Autres') as Category,
        photo,
        quantity: Number(data.get('quantity')),
        minimum: minimum ? Number(data.get('minimum')) : undefined,
        updatedAt: new Date().toISOString(),
      };
      onSave(product);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title={
        p ? 'Modifier le produit' : editor.fromScan ? 'Nouveau code-barres' : 'Ajouter un produit'
      }
      close={close}
    >
      {editor.fromScan && (
        <p className="form-note">
          Ce produit n’est pas encore dans votre réserve.
          {editor.mode === -1
            ? ' Il sera créé avec la quantité indiquée, sans retrait automatique.'
            : ' Indiquez sa quantité après cet ajout.'}
        </p>
      )}
      <form onSubmit={submit} className="product-form">
        <label>
          Nom du produit{' '}
          <input
            name="name"
            autoFocus
            required
            maxLength={120}
            defaultValue={p?.name}
            placeholder="Ex. Pois chiches"
          />
        </label>
        {!editor.fromScan && (
          <div className="field-row">
            <label>
              Marque <span>facultatif</span>
              <input
                name="brand"
                maxLength={80}
                defaultValue={p?.brand}
                placeholder="Ex. Bonduelle"
              />
            </label>
            <label>
              Catégorie
              <select name="category" defaultValue={p?.category ?? 'Autres'}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="field-row">
          <label>
            Conditionnement <span>facultatif</span>
            <input
              name="size"
              type="number"
              min="0.01"
              step="0.01"
              max="99999"
              defaultValue={p?.size}
              placeholder="500"
            />
          </label>
          <label>
            Unité
            <select name="unit" defaultValue={p?.unit ?? 'g'}>
              {units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={editor.fromScan ? '' : 'field-row'}>
          <label>
            Quantité en stock
            <input
              name="quantity"
              type="number"
              required
              min="0"
              max={MAX_QUANTITY}
              step="1"
              defaultValue={p?.quantity ?? (editor.mode === -1 ? 0 : 1)}
            />
          </label>
          {editor.fromScan ? (
            <input type="hidden" name="barcode" value={editor.barcode} />
          ) : (
            <label>
              Code-barres <span>facultatif</span>
              <input
                name="barcode"
                inputMode="numeric"
                pattern="[0-9]{4,32}"
                maxLength={32}
                defaultValue={p?.barcode ?? editor.barcode}
                placeholder="13 chiffres…"
              />
            </label>
          )}
        </div>
        {!editor.fromScan && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={minimum}
              onChange={(e) => setMinimum(e.target.checked)}
            />{' '}
            Me signaler un stock bas
          </label>
        )}
        {minimum && (
          <label>
            Seuil minimum (emballages)
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
        <label>
          Photo <span>facultatif · JPG, PNG ou WebP, 500 Ko max.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              setPhotoError('');
              const file = e.target.files?.[0];
              if (!file) return;
              if (
                file.size > 500_000 ||
                !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
              ) {
                setPhotoError('Choisissez une image JPG, PNG ou WebP de moins de 500 Ko.');
                e.target.value = '';
                return;
              }
              setReading(true);
              const reader = new FileReader();
              reader.onload = () => {
                setPhoto(String(reader.result));
                setReading(false);
              };
              reader.onerror = () => {
                setPhotoError('Impossible de lire cette image.');
                setReading(false);
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {photo && (
          <div className="photo-preview">
            <img src={photo} alt="Photo du produit" />
            <button type="button" className="text-button" onClick={() => setPhoto(undefined)}>
              Retirer la photo
            </button>
          </div>
        )}
        {(photoError || error) && (
          <p role="alert" className="form-error">
            {photoError || error}
          </p>
        )}
        <footer className="form-actions">
          {p && (
            <button type="button" className="danger-button" onClick={() => onDelete(p)}>
              <Trash2 size={17} /> Supprimer
            </button>
          )}
          <button className="primary-button" disabled={reading} type="submit">
            <Check size={18} /> Enregistrer
          </button>
        </footer>
      </form>
    </Modal>
  );
}
