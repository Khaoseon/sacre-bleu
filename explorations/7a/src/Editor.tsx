import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, Check, LoaderCircle, Trash2 } from 'lucide-react';
import { categories, id, units, type Product } from '../../../src/model';
import type { Phase7aKey } from '../../../src/i18n/phase7a';
import { ImageArea, useText, PhotoFits } from './ui';

export function Editor({
  product,
  barcode,
  scanMode,
  busy,
  save,
  error,
  dirtyChanged,
}: {
  product?: Product;
  barcode?: string;
  scanMode?: 1 | -1;
  busy: boolean;
  save: (p: Product, fit: 'contain' | 'cover') => void;
  error: Phase7aKey | null;
  dirtyChanged: (dirty: boolean) => void;
}) {
  const fits = useContext(PhotoFits);
  const t = useText(),
    [draftId] = useState(product?.id ?? id()),
    [name, setName] = useState(product?.name ?? ''),
    [photo, setPhoto] = useState(product?.photo),
    [reading, setReading] = useState(false),
    [photoError, setPhotoError] = useState(false),
    [photoFit, setPhotoFit] = useState<'contain' | 'cover'>(fits[product?.id ?? ''] ?? 'contain');
  const formRef = useRef<HTMLFormElement>(null),
    initial = useRef(''),
    readVersion = useRef(0);
  useEffect(
    () => () => {
      readVersion.current++;
    },
    [],
  );
  function signature() {
    return JSON.stringify(
      [...new FormData(formRef.current!).entries()].filter(([k]) => k !== 'file'),
    );
  }
  function track() {
    dirtyChanged(
      signature() !== initial.current ||
        photo !== product?.photo ||
        photoFit !== (fits[product?.id ?? ''] ?? 'contain'),
    );
  }
  useEffect(() => {
    initial.current = signature();
  }, []);
  useEffect(() => {
    track();
  }, [photo, photoFit]);
  useEffect(() => {
    if (error)
      requestAnimationFrame(() =>
        formRef.current?.querySelector('.error')?.scrollIntoView({ block: 'center' }),
      );
  }, [error]);
  async function choosePhoto(file?: File) {
    if (!file) return;
    const version = ++readVersion.current;
    setPhotoError(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20_000_000) {
      setPhotoError(true);
      return;
    }
    setReading(true);
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        if (bitmap.width * bitmap.height > 50_000_000) throw new Error('pixels');
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        if (version === readVersion.current) setPhoto(canvas.toDataURL('image/jpeg', 0.82));
      } finally {
        bitmap.close();
      }
    } catch {
      if (version === readVersion.current) setPhotoError(true);
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    save(
      {
        ...product,
        id: draftId,
        name: name.trim(),
        photo,
        brand: String(d.get('brand') ?? '').trim() || undefined,
        barcode: String(d.get('barcode') ?? '').trim() || undefined,
        size: d.get('size') ? Number(d.get('size')) : undefined,
        unit: String(d.get('unit')) as Product['unit'],
        category: String(d.get('category')) as Product['category'],
        minimum: d.get('minimum') === '' ? undefined : Number(d.get('minimum')),
        quantity: product?.quantity ?? Number(d.get('quantity')),
        updatedAt: '2026-10-31T12:00:00Z',
      },
      photoFit,
    );
  }
  return (
    <form
      ref={formRef}
      className="editor"
      onSubmit={submit}
      onChange={track}
      onFocusCapture={(e) => {
        const field = e.target;
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement)
          requestAnimationFrame(() => {
            const save = field.closest('form')?.querySelector('.editor-save');
            if (
              save &&
              field.getBoundingClientRect().bottom > save.getBoundingClientRect().top - 12
            )
              field.scrollIntoView({ block: 'center' });
          });
      }}
    >
      <fieldset disabled={busy || reading}>
        <label>
          {t('Nom du produit')}
          <input
            autoFocus
            name="name"
            required
            maxLength={120}
            pattern=".*\S.*"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {!product && (
          <label>
            {t(scanMode === 1 ? 'Quantité à ajouter' : 'Quantité en stock')}
            <input
              required
              name="quantity"
              type="number"
              min={scanMode === 1 ? 1 : 0}
              max="9999"
              step="1"
              defaultValue={scanMode === 1 ? 1 : 0}
            />
          </label>
        )}
        {barcode && (
          <p className="inline-note">
            {t('Code-barres')} · {barcode}
          </p>
        )}
        <details className="edit-section" open={!!barcode}>
          <summary>{t('Informations du produit')}</summary>
          <label>
            {t('Marque')}
            <input name="brand" maxLength={80} defaultValue={product?.brand} />
          </label>
          <div className="field-pair">
            <label>
              {t('Conditionnement')}
              <input
                name="size"
                type="number"
                min="0.01"
                max="99999"
                step="0.01"
                defaultValue={product?.size}
              />
            </label>
            <label>
              {t('Unité')}
              <select name="unit" defaultValue={product?.unit ?? 'g'}>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u === 'pièce' ? t('pièce') : u}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            {t('Catégorie')}
            <select name="category" defaultValue={product?.category ?? 'Autres'}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Seuil minimum (emballages)')}
            <input
              name="minimum"
              type="number"
              min="0"
              max="9999"
              step="1"
              defaultValue={product?.minimum}
            />
          </label>
          <label>
            {t('Code-barres')}
            <input
              name="barcode"
              inputMode="numeric"
              pattern="[0-9]{4,32}"
              maxLength={32}
              defaultValue={product?.barcode ?? barcode}
            />
          </label>
        </details>
        <details className="edit-section">
          <summary>{t('Photo du produit')}</summary>
          <div className={`edit-image fit-${photoFit}`}>
            <ImageArea
              product={{
                ...product,
                id: product?.id ?? draftId,
                name,
                photo,
                quantity: 0,
                updatedAt: '',
              }}
            />
            <div>
              <label className="photo-button">
                <Camera size={18} />
                {t(photo ? 'Remplacer la photo' : 'Choisir une photo')}
                <input
                  className="file-input"
                  aria-label={t('Choisir une photo')}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.heic,.heif"
                  onChange={(e) => void choosePhoto(e.target.files?.[0])}
                />
              </label>
              <small>{t('JPG, PNG, WebP · jusqu’à 20 Mo, réduit localement')}</small>
              {photo && (
                <button
                  className="text-button danger-text"
                  type="button"
                  onClick={() => {
                    setPhoto(undefined);
                    setPhotoFit('contain');
                  }}
                >
                  <Trash2 size={16} />
                  {t('Retirer la photo personnelle')}
                </button>
              )}
            </div>
          </div>
          {photo && (
            <label>
              {t('Cadrage de l’aperçu')}
              <select
                value={photoFit}
                onChange={(e) => setPhotoFit(e.target.value as 'contain' | 'cover')}
              >
                <option value="contain">{t('Tout le visuel')}</option>
                <option value="cover">{t('Remplir le cadre')}</option>
              </select>
            </label>
          )}
          <small>{t('Le cadrage est un aperçu local ; le fichier entier est conservé.')}</small>
        </details>
        {(photoError || reading) && (
          <p role={photoError ? 'alert' : 'status'}>
            {t(
              photoError
                ? 'Photo non prise en charge. Convertissez HEIC/HEIF en JPEG ; 20 Mo et 50 Mpx maximum.'
                : 'Chargement',
            )}
          </p>
        )}
        {product && (
          <p className="inline-note">
            {t('Modifiez le stock avec les boutons + et − de l’écran Stock.')}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
      </fieldset>
      <footer className="editor-save">
        <button className="primary full" disabled={busy || reading}>
          {busy ? <LoaderCircle className="spinning" size={18} /> : <Check size={18} />}{' '}
          {t(busy ? 'Enregistrement en cours…' : 'Enregistrer')}
        </button>
      </footer>
    </form>
  );
}
