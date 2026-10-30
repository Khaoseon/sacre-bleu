import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  ArrowDownUp,
  ArrowRight,
  Bean,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  CloudOff,
  Leaf,
  LoaderCircle,
  Minus,
  Package,
  Plus,
  ScanLine,
  Search,
  Settings2,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Wheat,
  X,
} from 'lucide-react';
import {
  addShopping,
  adjustScan,
  categories,
  changeStock,
  deleteProduct,
  findProductByBarcode,
  id,
  saveProduct,
  selectProducts,
  startScan,
  undoOperation,
  units,
  type Product,
  type ScanOperation,
  type State,
} from '../../../src/model';
import { phase7aText, type Phase7aKey } from '../../../src/i18n/phase7a';
import mascot from '../../../public/icon-192.png';
import { fixtures, sampleImages } from './fixtures';
import { useContentSwipe } from './useContentSwipe';
import './style.css';

const Language = createContext<'fr' | 'en'>('fr');
const useText = () => {
  const language = useContext(Language);
  return (key: Phase7aKey) => phase7aText(key, language);
};
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 550));
type Scenario = 'ready' | 'offline' | 'failure' | 'uncertain' | 'empty' | 'loading';
type Sheet =
  | { kind: 'detail' | 'edit' | 'delete'; product: Product }
  | { kind: 'create'; barcode?: string; mode?: 1 | -1 }
  | { kind: 'settings' };

function ImageArea({ product }: { product?: Product }) {
  const t = useText();
  const src = product?.photo ?? sampleImages[product?.id ?? ''];
  const [failed, setFailed] = useState('');
  const Icon =
    product?.category === 'Féculents'
      ? Wheat
      : product?.category === 'Légumineuses'
        ? Bean
        : Package;
  return (
    <span className="image-area">
      {src && failed !== src ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)} />
      ) : (
        <span className="image-fallback">
          <Icon size={36} strokeWidth={1} />
          <span>{product ? t('Photo indisponible') : t('Article libre')}</span>
        </span>
      )}
    </span>
  );
}
function Quantity({
  product,
  value,
  disabled,
  change,
}: {
  product: string;
  value: number;
  disabled: boolean;
  change: (delta: 1 | -1) => void;
}) {
  const t = useText();
  return (
    <div className="stepper">
      <button
        aria-label={`${t('Retirer')} ${product}`}
        disabled={disabled || value === 0}
        onClick={() => change(-1)}
      >
        <Minus size={17} />
      </button>
      <output aria-label={t('Quantité en stock')}>{value}</output>
      <button
        aria-label={`${t('Ajouter')} ${product}`}
        disabled={disabled || value >= 9999}
        onClick={() => change(1)}
      >
        <Plus size={17} />
      </button>
    </div>
  );
}
function SheetFrame({
  title,
  close,
  busy,
  children,
}: {
  title: string;
  close: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const t = useText();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="sheet-grip" aria-hidden="true" />
      <header>
        <h2 id="sheet-title">{title}</h2>
        <button className="round" aria-label={t('Fermer')} disabled={busy} onClick={close}>
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Editor({
  product,
  barcode,
  scanMode,
  busy,
  save,
  error,
}: {
  product?: Product;
  barcode?: string;
  scanMode?: 1 | -1;
  busy: boolean;
  save: (p: Product) => void;
  error: boolean;
}) {
  const t = useText();
  const [draftId] = useState(product?.id ?? id());
  const [photo, setPhoto] = useState(product?.photo);
  const [photoError, setPhotoError] = useState(false);
  const [reading, setReading] = useState(false);
  const [name, setName] = useState(product?.name ?? '');
  async function choosePhoto(file?: File) {
    if (!file) return;
    setPhotoError(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 500_000) {
      setPhotoError(true);
      return;
    }
    setReading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const allowed = bitmap.width <= 4096 && bitmap.height <= 4096;
      bitmap.close();
      if (!allowed) throw new Error('dimensions');
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      setPhoto(result);
    } catch {
      setPhotoError(true);
    } finally {
      setReading(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    save({
      ...product,
      id: draftId,
      name: name.trim(),
      photo,
      brand: String(data.get('brand')).trim() || undefined,
      barcode: String(data.get('barcode')).trim() || undefined,
      size: data.get('size') ? Number(data.get('size')) : undefined,
      unit: String(data.get('unit')) as Product['unit'],
      category: String(data.get('category')) as Product['category'],
      minimum: data.get('minimum') === '' ? undefined : Number(data.get('minimum')),
      quantity: product?.quantity ?? Number(data.get('quantity')),
      updatedAt: '2026-10-30T12:00:00.000Z',
    });
  }
  return (
    <form onSubmit={submit} className="editor">
      <fieldset disabled={busy || reading}>
        <div className="edit-image">
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
              {t('Choisir une photo')}
              <input
                className="file-input"
                aria-label={t('Choisir une photo')}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void choosePhoto(e.target.files?.[0])}
              />
            </label>
            <small>{t('facultatif · JPG, PNG ou WebP, 500 Ko max.')}</small>
            {photo && (
              <button type="button" className="text-button" onClick={() => setPhoto(undefined)}>
                {t('Revenir au visuel proposé')}
              </button>
            )}
          </div>
        </div>
        {(photoError || reading) && (
          <p role={photoError ? 'alert' : 'status'}>
            {photoError
              ? t('Choisissez une image JPG, PNG ou WebP de moins de 500 Ko.')
              : t('Chargement')}
          </p>
        )}
        <label>
          {t('Nom du produit')}
          <input
            autoFocus
            required
            maxLength={120}
            pattern=".*\S.*"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
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
        <div className="field-pair">
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
          {!product && (
            <label>
              {t('Quantité en stock')}
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
        </div>
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
        {product && (
          <small>{t('Modifiez le stock avec les boutons + et − de l’écran Stock.')}</small>
        )}
        {error && (
          <p className="error" role="alert">
            {t('Échec simulé. Aucun changement appliqué.')}
          </p>
        )}
        <button className="primary full" disabled={busy || reading}>
          {busy ? <LoaderCircle className="spinning" size={18} /> : <Check size={18} />}
          {t(busy ? 'Enregistrement en cours…' : 'Enregistrer')}
        </button>
      </fieldset>
    </form>
  );
}
function App() {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  // Child root owns language so switching never remounts forms or operations.
  return (
    <Language.Provider value={language}>
      <Prototype language={language} setLanguage={setLanguage} />
    </Language.Provider>
  );
}
function Prototype({
  language,
  setLanguage,
}: {
  language: 'fr' | 'en';
  setLanguage: (v: 'fr' | 'en') => void;
}) {
  const t = useText();
  const [state, setState] = useState(fixtures);
  const current = useRef(state);
  current.current = state;
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tout');
  const [sorted, setSorted] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [scenario, setScenario] = useState<Scenario>('ready');
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const [notice, setNotice] = useState<Phase7aKey | null>(null);
  useEffect(() => {
    if (notice !== 'Enregistré dans la simulation.') return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const [error, setError] = useState(false);
  const [shoppingName, setShoppingName] = useState('');
  const [camera, setCamera] = useState(false);
  const [mode, setMode] = useState<1 | -1>(1);
  const [code, setCode] = useState('');
  const [scan, setScan] = useState<ScanOperation | null>(null);
  const [manual, setManual] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = busy || ['offline', 'uncertain', 'loading'].includes(scenario);
  function navigate(next: number) {
    if (writing.current || sheet) return;
    setPage(next);
    setCamera(false);
    setNotice(null);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  const swipe = useContentSwipe(
    page,
    navigate,
    locked || !!sheet || camera || !!shoppingName || !!code,
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `Sacré bleu · ${t('Atelier 7A · données fictives')}`;
  }, [language]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setCamera(false);
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  async function mutate(transform: (s: State) => State, after?: (s: State) => void) {
    if (writing.current || ['offline', 'uncertain', 'loading'].includes(scenario)) return;
    writing.current = true;
    setBusy(true);
    setError(false);
    setNotice(null);
    try {
      await wait(); // Deliberately visible pending state; no optimistic count/check/success.
      if (scenario === 'failure') {
        setScenario('ready');
        throw new Error('mock');
      }
      const saved = { ...transform(current.current), revision: current.current.revision + 1 };
      current.current = saved;
      setState(saved);
      setScan(null);
      setNotice('Enregistré dans la simulation.');
      after?.(saved);
    } catch {
      setError(true);
      setNotice('Échec simulé. Aucun changement appliqué.');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  function doScan(raw = '8076802085738') {
    const product = findProductByBarcode(current.current.products, raw.trim());
    if (!product) {
      setCamera(false);
      setNotice('Code inconnu · complétez la fiche.');
      setSheet({ kind: 'create', barcode: raw, mode });
      return;
    }
    let operation: ScanOperation;
    void mutate(
      (s) => {
        const result = startScan(s, product.id, mode);
        operation = result.operation;
        return result.state;
      },
      (s) => {
        setScan({ ...operation!, revision: s.revision });
        setCamera(false);
        setCode('');
      },
    );
  }
  const products = scenario === 'empty' ? [] : selectProducts(state, query, category);
  if (sorted)
    products.sort(
      (a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name),
    );
  products.sort((a, b) => Number(a.quantity === 0) - Number(b.quantity === 0));
  const low = state.products.filter((p) => p.minimum !== undefined && p.quantity < p.minimum);
  const remaining = state.shopping.filter((i) => !i.checked);
  const completed = state.shopping.filter((i) => i.checked);
  const scannedProduct = state.products.find((p) => p.id === scan?.productId);
  const titles = ['La réserve', 'Scanner', 'Les courses'] as const;
  const subtitles = [
    'Le quotidien, bien rangé.',
    'Un scan. Et c’est rangé.',
    'Le prochain repas commence ici.',
  ] as const;
  const navItems = [
    { label: 'Stock', icon: Archive },
    { label: 'Scanner', icon: ScanLine },
    { label: 'À acheter', icon: ShoppingBasket },
  ] as const;
  function shoppingRow(item: State['shopping'][number]) {
    const product = state.products.find((p) => p.id === item.productId);
    return (
      <article className={`shopping-row ${item.checked ? 'completed' : ''}`} key={item.id}>
        <button
          className="check-item"
          aria-label={`${t(item.checked ? 'À prendre' : 'Dans le panier')} · ${item.name}`}
          aria-pressed={item.checked}
          disabled={locked}
          onClick={() =>
            void mutate((s) => ({
              ...s,
              shopping: s.shopping.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      checked: !i.checked,
                      quantity: !i.checked ? i.quantity : Math.max(1, i.quantity),
                    }
                  : i,
              ),
            }))
          }
        >
          {item.checked && <Check size={17} />}
        </button>
        <ImageArea product={product} />
        <div className="shopping-copy">
          <strong>{item.name}</strong>
          <small>
            {product
              ? [product.brand, product.size && `${product.size} ${product.unit}`]
                  .filter(Boolean)
                  .join(' · ')
              : t('Article libre')}
          </small>
        </div>
        <div className="shopping-count">
          <span>×{item.quantity}</span>
          <button
            className="round"
            aria-label={`${t('Ajouter')} ${item.name}`}
            disabled={locked || item.quantity >= 9999}
            onClick={() =>
              void mutate((s) => ({
                ...s,
                shopping: s.shopping.map((i) =>
                  i.id === item.id ? { ...i, quantity: i.quantity + 1, checked: false } : i,
                ),
              }))
            }
          >
            <Plus size={16} />
          </button>
        </div>
      </article>
    );
  }
  return (
    <div className="atelier">
      <div className="prototype-ribbon">{t('Atelier 7A · données fictives')}</div>
      <div className="app-shell">
        <header className="brand-bar">
          <span className="wordmark">sacré bleu</span>
          <button
            className="round"
            aria-label={t('Paramètres')}
            onClick={() => setSheet({ kind: 'settings' })}
          >
            <SlidersHorizontal size={20} />
          </button>
        </header>
        <main ref={swipe.ref}>
          <div
            className={`page-content page-${page}`}
            style={{ transform: `translateX(${swipe.offset}px)` }}
          >
            <header className="page-title">
              <div className="eyebrow">
                {t(
                  page === 0
                    ? 'À portée de main'
                    : page === 1
                      ? 'Reconnu dans votre réserve'
                      : 'Un petit tour au marché ?',
                )}
              </div>
              <div className="title-line">
                <h1 ref={heading} tabIndex={-1}>
                  {t(titles[page])}
                  <span>.</span>
                </h1>
                {page === 0 && (
                  <button
                    className="add-product"
                    aria-label={t('Ajouter un produit')}
                    disabled={locked}
                    onClick={() => {
                      setError(false);
                      setSheet({ kind: 'create' });
                    }}
                  >
                    <Plus size={24} />
                  </button>
                )}
              </div>
              <p>{t(subtitles[page])}</p>
            </header>
            {['offline', 'uncertain'].includes(scenario) && (
              <div className="state-banner" role="status">
                <CloudOff size={19} />
                <span>
                  {t(
                    scenario === 'offline'
                      ? 'Copie hors ligne · lecture seule'
                      : 'Résultat incertain · vérifiez avant de continuer.',
                  )}
                </span>
                <button onClick={() => setScenario('ready')}>
                  {t(scenario === 'offline' ? 'Actualiser' : 'Reprendre la demande')}
                </button>
              </div>
            )}
            {page === 0 && (
              <>
                <button className="restock-note" onClick={() => navigate(2)}>
                  <span className="restock-icon">
                    <ShoppingBasket size={21} />
                  </span>
                  <span>
                    <strong>
                      {low.length} {t('Produits à compléter').toLocaleLowerCase(language)}
                    </strong>
                    <small>{t('Voir la liste')}</small>
                  </span>
                  <ArrowRight size={20} />
                </button>
                <div className="search-bar">
                  <Search size={19} />
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
                </div>
                <div className="filters" data-no-swipe aria-label={t('Filtrer par catégorie')}>
                  {['Tout', ...categories].map((c) => (
                    <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
                      {t(c as 'Tout' | (Product['category'] & string))}
                    </button>
                  ))}
                </div>
                <div className="section-title">
                  <h2>
                    {t('Vos essentiels')} <span>{products.length}</span>
                  </h2>
                  <button onClick={() => setSorted(!sorted)} aria-label={t('Trier les produits')}>
                    <ArrowDownUp size={14} />
                    {t(sorted ? 'Par catégorie' : 'Par nom')}
                  </button>
                </div>
                {scenario === 'loading' ? (
                  <div className="skeleton-grid" role="status" aria-label={t('Chargement')}>
                    {[1, 2, 3, 4].map((i) => (
                      <div className="skeleton" key={i} />
                    ))}
                  </div>
                ) : products.length ? (
                  <div className="product-grid">
                    {products.map((p) => (
                      <article
                        className={`product-card ${p.quantity === 0 ? 'exhausted' : ''}`}
                        key={p.id}
                        data-product={p.id}
                      >
                        <div className="product-visual">
                          <ImageArea product={p} />
                          {p.minimum !== undefined && p.quantity <= p.minimum && (
                            <span className={`stock-badge ${p.quantity === 0 ? 'zero' : ''}`}>
                              {t(p.quantity === 0 ? 'Plus en réserve' : 'Stock bas')}
                            </span>
                          )}
                          <button
                            className="image-hit"
                            aria-label={`${t('Détails')} ${p.name}`}
                            onClick={() => {
                              setError(false);
                              setSheet({ kind: 'detail', product: p });
                            }}
                          />
                        </div>
                        <div className="card-copy">
                          <small>{p.brand ?? t(p.category ?? 'Autres')}</small>
                          <button
                            className="product-name"
                            onClick={() => {
                              setError(false);
                              setSheet({ kind: 'detail', product: p });
                            }}
                          >
                            {p.name}
                          </button>
                          <span className="package-size">
                            {p.size} {p.unit}
                          </span>
                        </div>
                        <Quantity
                          product={p.name}
                          value={p.quantity}
                          disabled={locked}
                          change={(delta) => void mutate((s) => changeStock(s, p.id, delta))}
                        />
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <img src={mascot} alt="" />
                    <h2>
                      {t(
                        query || category !== 'Tout'
                          ? 'Aucun produit trouvé'
                          : 'Votre réserve commence ici',
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
                        } else setSheet({ kind: 'create' });
                      }}
                    >
                      {t(
                        query || category !== 'Tout'
                          ? 'Voir tous les produits'
                          : 'Ajouter un produit',
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
            {page === 1 && (
              <div className="scanner-content">
                <div className="segmented">
                  {([1, -1] as const).map((v) => (
                    <button
                      key={v}
                      aria-pressed={mode === v}
                      disabled={busy}
                      onClick={() => {
                        setMode(v);
                        setCamera(false);
                        setScan(null);
                      }}
                    >
                      {v === 1 ? <Plus size={18} /> : <Minus size={18} />}
                      {t(v === 1 ? 'Ajouter' : 'Retirer')}
                    </button>
                  ))}
                </div>
                <div
                  className={`viewfinder ${camera ? 'scanning' : ''} ${scan && !camera ? 'result-held' : ''}`}
                  data-no-swipe
                >
                  <div className="camera-caption">
                    <span className="live-dot" />
                    {t('Simulation de caméra')}
                  </div>
                  <div className="scan-object">
                    <img src={sampleImages.pasta} alt="" />
                  </div>
                  <div className="scan-corners" aria-hidden="true" />
                  <div className="scan-ray" aria-hidden="true" />
                  <span className="viewfinder-label">
                    {t(camera ? 'Placez le code au centre' : 'Aucun appareil photo utilisé.')}
                  </span>
                </div>
                <button
                  className="primary full"
                  disabled={locked}
                  onClick={() => (camera ? doScan() : setCamera(true))}
                >
                  <ScanLine size={20} />
                  {t(
                    camera
                      ? 'Simuler une lecture'
                      : scan
                        ? 'Scanner à nouveau'
                        : 'Démarrer la simulation',
                  )}
                </button>
                {camera && (
                  <button className="text-button full" onClick={() => setCamera(false)}>
                    {t('Arrêter')}
                  </button>
                )}
                <button
                  className="text-button full"
                  aria-expanded={manual}
                  onClick={() => {
                    setManual(!manual);
                    setCamera(false);
                  }}
                >
                  {t('Saisir un code-barres')}
                  <ChevronRight size={16} />
                </button>
                {manual && (
                  <form
                    className="manual-entry"
                    onSubmit={(e) => {
                      e.preventDefault();
                      doScan(code);
                    }}
                  >
                    <label>
                      {t('Code-barres')}
                      <input
                        required
                        inputMode="numeric"
                        pattern="[0-9]{4,32}"
                        maxLength={32}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="8076802085738"
                      />
                    </label>
                    <button className="primary" disabled={locked}>
                      {t('Valider')}
                    </button>
                  </form>
                )}
                {scan && scannedProduct && (
                  <section className="scan-result">
                    <span className="success-label">
                      <CircleCheck size={18} />
                      {t('Lecture confirmée')}
                    </span>
                    <div className="scan-product">
                      <ImageArea product={scannedProduct} />
                      <div>
                        <small>{t('Reconnu dans votre réserve')}</small>
                        <h2>{scannedProduct.name}</h2>
                        <p>
                          {scannedProduct.quantity} · {t('EN STOCK')}
                        </p>
                      </div>
                    </div>
                    <div className="scan-total">
                      <span>{t('Total traité')}</span>
                      <Quantity
                        product={t('Total traité')}
                        value={scan.quantity}
                        disabled={locked}
                        change={(delta) => {
                          let op: ScanOperation;
                          void mutate(
                            (s) => {
                              const r = adjustScan(s, scan, scan.quantity + delta);
                              op = r.operation;
                              return r.state;
                            },
                            (s) => setScan({ ...op!, revision: s.revision }),
                          );
                        }}
                      />
                    </div>
                    <button
                      className="text-button"
                      disabled={locked}
                      onClick={() =>
                        void mutate((s) => undoOperation(s, scan.before, scan.revision))
                      }
                    >
                      <Undo2 size={16} />
                      {t('Annuler le dernier scan')}
                    </button>
                  </section>
                )}
              </div>
            )}
            {page === 2 && (
              <>
                <div className="shopping-summary">
                  <span className="shopping-big">
                    {remaining.length.toString().padStart(2, '0')}
                  </span>
                  <div>
                    <strong>{t('À prendre')}</strong>
                    <small>{t('Votre liste est prête.')}</small>
                  </div>
                  <ShoppingBasket size={32} strokeWidth={1.3} />
                </div>
                <form
                  className="shopping-add"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = shoppingName.trim();
                    if (name)
                      void mutate(
                        (s) => addShopping(s, name, 1),
                        () => setShoppingName(''),
                      );
                  }}
                >
                  <input
                    aria-label={t('Ajouter à la liste')}
                    placeholder={t('Une chose à ajouter…')}
                    maxLength={120}
                    required
                    value={shoppingName}
                    onChange={(e) => setShoppingName(e.target.value)}
                  />
                  <button
                    className="round"
                    aria-label={t('Ajouter à la liste')}
                    disabled={locked || !shoppingName.trim()}
                  >
                    <Plus size={22} />
                  </button>
                </form>
                <div className="section-title">
                  <h2>
                    {t('À prendre')} <span>{remaining.length}</span>
                  </h2>
                  <span className="small-caps">{t('À acheter')}</span>
                </div>
                <div className="shopping-list">{remaining.map(shoppingRow)}</div>
                {!remaining.length && (
                  <div className="empty-state">
                    <img src={mascot} alt="" />
                    <h2>{t('Tout est dans le panier.')}</h2>
                    <p>{t('Tout va bien')}</p>
                  </div>
                )}
                {completed.length > 0 && (
                  <>
                    <div className="section-title">
                      <h2>
                        {t('Dans le panier')} <span>{completed.length}</span>
                      </h2>
                      <Check size={17} />
                    </div>
                    <div className="shopping-list">{completed.map(shoppingRow)}</div>
                  </>
                )}
                {low.some((p) => !remaining.some((i) => i.productId === p.id)) && (
                  <section className="suggestions">
                    <span className="eyebrow">
                      <Sparkles size={15} />
                      {t('À prévoir')}
                    </span>
                    {low
                      .filter((p) => !remaining.some((i) => i.productId === p.id))
                      .map((p) => (
                        <div key={p.id}>
                          <span>{p.name}</span>
                          <button
                            className="text-button"
                            disabled={locked}
                            onClick={() =>
                              void mutate((s) =>
                                addShopping(
                                  s,
                                  p.name,
                                  Math.max(1, (p.minimum ?? 1) - p.quantity),
                                  p.id,
                                ),
                              )
                            }
                          >
                            <Plus size={16} />
                            {t('Ajouter')}
                          </button>
                        </div>
                      ))}
                  </section>
                )}
              </>
            )}
            <footer className="page-foot">
              <Leaf size={13} /> Sacré bleu · {t('Le quotidien, bien rangé.')}
            </footer>
          </div>
        </main>
        <div
          className={`feedback ${error ? 'feedback-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {busy ? (
            <>
              <LoaderCircle className="spinning" size={17} />
              {t('Enregistrement en cours…')}
            </>
          ) : notice ? (
            <>
              {!error && <Check size={17} />}
              {t(notice)}
            </>
          ) : null}
        </div>
        <nav className="bottom-nav" aria-label={t('Navigation mobile')}>
          {navItems.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              aria-current={page === i ? 'page' : undefined}
              aria-label={t(label)}
              disabled={busy}
              onClick={() => navigate(i)}
            >
              <span className="nav-icon">
                <Icon size={23} strokeWidth={1.6} />
                {i === 2 && remaining.length > 0 && (
                  <span className="nav-badge">{remaining.length}</span>
                )}
              </span>
              <span>{t(label)}</span>
            </button>
          ))}
        </nav>
      </div>
      {sheet && (
        <SheetFrame
          busy={busy}
          close={() => {
            setSheet(null);
            setError(false);
          }}
          title={t(
            sheet.kind === 'settings'
              ? 'Paramètres'
              : sheet.kind === 'edit'
                ? 'Modifier le produit'
                : sheet.kind === 'create'
                  ? 'Ajouter un produit'
                  : sheet.kind === 'delete'
                    ? 'Supprimer le produit ?'
                    : 'Détails',
          )}
        >
          {busy && (
            <p role="status" className="sheet-status">
              {t('Enregistrement en cours…')}
            </p>
          )}
          {error && sheet.kind !== 'edit' && sheet.kind !== 'create' && (
            <p role="alert" className="error">
              {t('Échec simulé. Aucun changement appliqué.')}
            </p>
          )}
          {sheet.kind === 'settings' ? (
            <div className="settings-content">
              <label>
                {t('Langue')}
                <select
                  aria-label={t('Langue')}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
              <h3>{t('Contrôles de l’atelier')}</h3>
              <label>
                {t('Simuler un état')}
                <select
                  value={scenario}
                  disabled={busy}
                  onChange={(e) => {
                    setScenario(e.target.value as Scenario);
                    setNotice(null);
                    setError(false);
                    setCamera(false);
                  }}
                >
                  {(
                    [
                      ['ready', 'Prêt'],
                      ['offline', 'Hors ligne'],
                      ['failure', 'Échec au prochain enregistrement'],
                      ['uncertain', 'Opération incertaine'],
                      ['empty', 'Réserve vide'],
                      ['loading', 'Chargement'],
                    ] as const
                  ).map(([v, k]) => (
                    <option value={v} key={v}>
                      {t(k)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary full"
                disabled={busy}
                onClick={() => {
                  setState(fixtures());
                  setScenario('ready');
                  setScan(null);
                  setQuery('');
                  setCategory('Tout');
                  setNotice(null);
                  setError(false);
                  setSheet(null);
                }}
              >
                {t('Retrouver les exemples')}
              </button>
              <div className="credits">
                <img src={mascot} alt="" />
                <h3>{t('À propos des images')}</h3>
                <p>{t('Photos de produits synthétiques. Marques fictives.')}</p>
                <small>{t('Mascotte : Eloane ROURE · MIT')}</small>
              </div>
            </div>
          ) : sheet.kind === 'edit' || sheet.kind === 'create' ? (
            <Editor
              product={sheet.kind === 'edit' ? sheet.product : undefined}
              barcode={sheet.kind === 'create' ? sheet.barcode : undefined}
              scanMode={sheet.kind === 'create' ? sheet.mode : undefined}
              busy={locked}
              error={error}
              save={(p) => {
                let createdScan: ScanOperation | undefined;
                void mutate(
                  (s) => {
                    if (sheet.kind === 'create' && sheet.mode === 1) {
                      const created = saveProduct(s, { ...p, quantity: 0 });
                      const result = startScan(created, p.id, 1, p.quantity);
                      createdScan = result.operation;
                      return result.state;
                    }
                    return saveProduct(s, {
                      ...p,
                      quantity:
                        s.products.find((existing) => existing.id === p.id)?.quantity ?? p.quantity,
                    });
                  },
                  (s) => {
                    setSheet(null);
                    if (createdScan) setScan({ ...createdScan, revision: s.revision });
                    if (scenario === 'empty') setScenario('ready');
                  },
                );
              }}
            />
          ) : sheet.kind === 'delete' ? (
            <div className="confirmation">
              <p>{sheet.product.name}</p>
              <p>
                {t(
                  'Le produit sera supprimé. Ses lignes de courses seront conservées en texte libre.',
                )}
              </p>
              <button
                className="danger full"
                disabled={locked}
                onClick={() =>
                  void mutate(
                    (s) => deleteProduct(s, sheet.product.id),
                    () => setSheet(null),
                  )
                }
              >
                {t('Supprimer')}
              </button>
              <button
                className="secondary full"
                disabled={busy}
                onClick={() => setSheet({ kind: 'detail', product: sheet.product })}
              >
                {t('Annuler')}
              </button>
            </div>
          ) : (
            <div className="detail-content">
              <div className="detail-image">
                <ImageArea product={sheet.product} />
              </div>
              <small className="image-credit">
                {t(
                  sheet.product.photo
                    ? 'Photo personnelle · locale à cette session'
                    : 'Visuel fictif · exploration',
                )}
              </small>
              <div className="detail-title">
                <div>
                  <span className="eyebrow">
                    {sheet.product.brand ?? t(sheet.product.category ?? 'Autres')}
                  </span>
                  <h2>{sheet.product.name}</h2>
                  <p>
                    {sheet.product.size} {sheet.product.unit}
                  </p>
                </div>
                <span className="detail-quantity">
                  {state.products.find((p) => p.id === sheet.product.id)?.quantity}
                  <small>{t('EN STOCK')}</small>
                </span>
              </div>
              <button
                className="primary full"
                disabled={locked}
                onClick={() =>
                  void mutate(
                    (s) => addShopping(s, sheet.product.name, 1, sheet.product.id),
                    () => setSheet(null),
                  )
                }
              >
                <ShoppingBasket size={18} />
                {t('Ajouter à la liste')}
              </button>
              <button
                className="secondary full"
                disabled={locked}
                onClick={() => {
                  setError(false);
                  setSheet({ kind: 'edit', product: sheet.product });
                }}
              >
                <Settings2 size={18} />
                {t('Modifier le produit')}
              </button>
              <button
                className="text-button danger-text full"
                disabled={locked}
                onClick={() => setSheet({ kind: 'delete', product: sheet.product })}
              >
                <Trash2 size={16} />
                {t('Supprimer')}
              </button>
            </div>
          )}
        </SheetFrame>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
