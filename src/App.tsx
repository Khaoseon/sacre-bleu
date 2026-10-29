import {
  Modal,
  ProductForm,
  ProductImage,
  ProductAttribution,
  Quantity,
  packageLabel,
  type Editor,
} from './components';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Archive,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CircleHelp,
  Download,
  Leaf,
  Minus,
  Package,
  Plus,
  ScanLine,
  Search,
  Settings2,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  addShopping,
  adjustScan,
  categories,
  changeStock,
  deleteProduct,
  MAX_QUANTITY,
  saveProduct,
  selectProducts,
  scanQuantityLimit,
  startScan,
  StaleOperationError,
  suggestions,
  undoOperation,
  ScanRecognition,
  type Product,
  type State,
  type ScanOperation,
} from './model';
import { demo } from './demo';
import { load, persist, STORAGE_KEY } from './storage';
import { AppearanceSettings, type ThemeController } from './AppearanceSettings';
import { AppInformation } from './AppInformation';
import { snapshotState, type SharedPantryStore, type SharedView } from './backend/store';
import { CameraScanner } from './CameraScanner';
import { ProductSearch } from './productSearch';
import type { ProductProvider } from './productInfo';

type Page = 'stock' | 'scanner' | 'shopping';
function initial() {
  try {
    return { state: load(), error: '' };
  } catch {
    return {
      state: demo(),
      error:
        'La sauvegarde locale ne peut pas être lue. Vos données n’ont pas été remplacées. Exportez-les avant de réinitialiser.',
    };
  }
}

export default function App({
  theme,
  shared,
  accountSettings,
  onExitDemo,
  productProvider,
}: {
  theme: ThemeController;
  shared?: { store: SharedPantryStore; view: SharedView };
  accountSettings?: ReactNode;
  onExitDemo?: () => void;
  productProvider?: ProductProvider;
}) {
  const [boot] = useState(() =>
    shared ? { state: snapshotState(shared.view.snapshot!, 'name'), error: '' } : initial(),
  );
  const [localState, setState] = useState(boot.state);
  const [sort, setSort] = useState<State['sort']>(() => {
    try {
      return localStorage.getItem('app-reserve.sort.v1') === 'recent' ? 'recent' : 'name';
    } catch {
      return 'name';
    }
  });
  const state = shared ? snapshotState(shared.view.snapshot!, sort) : localState;
  const current = useRef(state);
  if (shared) current.current = state;
  const locked = !!shared && !shared.store.writable;
  const [bootError, setBootError] = useState(boot.error);
  const [page, setPage] = useState<Page>('stock');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tout');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [productSearch] = useState(() => new ProductSearch(productProvider));
  const lookupInFlight = useRef(false);
  function cancelLookup() {
    productSearch.cancel();
    lookupInFlight.current = false;
  }
  useEffect(() => {
    return () => productSearch.cancel();
  }, [productSearch]);
  useEffect(() => {
    cancelLookup();
    setEditor((value) => (value?.lookup === 'loading' ? null : value));
  }, [page]);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState !== 'visible') {
        cancelLookup();
        setEditor((value) => (value?.lookup === 'loading' ? null : value));
      }
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [productSearch]);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [settings, setSettings] = useState(false);
  const [cameraSettingsTarget, setCameraSettingsTarget] = useState<HTMLDivElement | null>(null);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const lastError = useRef('');
  const [undo, setUndo] = useState<{ before: State; revision: number } | null>(null);
  const [localScan, setLastScan] = useState<ScanOperation | null>(null);
  const lastScan = shared ? shared.view.scan : localScan;
  const scanContext = useRef<ScanOperation | null>(null);
  const [localInvalidation, setScanInvalidation] = useState('');
  const scanInvalidation = shared ? shared.view.scanInvalidation : localInvalidation;
  const [mode, setMode] = useState<1 | -1>(1);
  const [code, setCode] = useState('');
  const [lastProductId, setLastProductId] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState('');
  const lastRead = useRef({ code: '', time: 0 });
  const [recognition] = useState(() => new ScanRecognition());
  const scanInFlight = useRef(false);
  const [scanning, setScanning] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [shoppingName, setShoppingName] = useState('');
  const [shoppingProduct, setShoppingProduct] = useState('');
  const [shoppingQuantity, setShoppingQuantity] = useState(1);
  const [online, setOnline] = useState(navigator.onLine);
  const canUndo = shared ? !!shared.view.scan : !!undo;
  const completion = useRef(shared?.view.completed ?? 0);
  useEffect(() => {
    if (!shared) return;
    const { view } = shared;
    if (view.busy) setFeedback(null);
    else if (view.error) setFeedback({ text: view.error, error: true });
    else if (view.notice) setFeedback({ text: view.notice });
    if (view.completed !== completion.current) {
      completion.current = view.completed;
      const completedProduct = view.snapshot?.products.find(
        (product) => product.id === view.lastProductId,
      );
      if (view.scan) {
        if (completedProduct?.barcode) recognition.hold(completedProduct.barcode);
        navigator.vibrate?.(45);
      }
      if (view.completionLabel === 'Produit enregistré.') {
        setEditor(null);
        setCode('');
      }
      if (view.completionLabel === 'Produit supprimé.') setDeleting(null);
    }
  }, [shared?.view.error, shared?.view.notice, shared?.view.completed, shared?.view.busy]);
  useEffect(() => {
    // Restore the presentation latch before resolving an uncertain request, also after reload.
    const pendingProduct = shared?.view.snapshot?.products.find(
      (product) => product.id === shared.view.pending?.productId,
    );
    if (pendingProduct?.barcode) recognition.hold(pendingProduct.barcode);
  }, [shared?.view.pending, shared?.view.snapshot, recognition]);
  useEffect(() => {
    if (shared) return;
    const network = () => setOnline(navigator.onLine);
    const sync = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      try {
        const next = load();
        current.current = next;
        setState(next);
        setUndo(null);
        invalidateScan('Données modifiées dans un autre onglet. Scannez à nouveau pour ajuster.');
        setBootError('');
        setFeedback({ text: 'Données actualisées depuis un autre onglet.' });
      } catch {
        setUndo(null);
        invalidateScan('Sauvegarde illisible : l’ajustement du dernier scan est désactivé.');
        setBootError(
          'La sauvegarde a changé et ne peut pas être lue. Rechargez ou exportez vos données.',
        );
      }
    };
    window.addEventListener('storage', sync);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
    };
  }, [shared?.store]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);
  function publishScan(operation: ScanOperation) {
    const saved = { ...operation, revision: current.current.revision };
    scanContext.current = saved;
    setLastScan(saved);
    setScanInvalidation('');
  }
  function invalidateScan(message: string) {
    if (scanContext.current) setScanInvalidation(message);
    scanContext.current = null;
    setLastScan(null);
  }
  function commit(
    transform: (s: State) => State,
    message?: string,
    undoable: boolean | State = false,
  ) {
    try {
      if (shared)
        throw new Error('Cette modification doit être confirmée par la réserve partagée.');
      if (bootError)
        throw new Error(
          'Exportez ou réinitialisez la sauvegarde illisible avant de modifier les données.',
        );
      const before = current.current;
      const saved = persist(transform(before), before.revision);
      current.current = saved;
      setState(saved);
      setUndo(
        undoable
          ? { before: undoable === true ? before : undoable, revision: saved.revision }
          : null,
      );
      invalidateScan('Une autre modification a invalidé ce scan. Scannez à nouveau pour ajuster.');
      if (message) setFeedback({ text: message });
      else setFeedback(null);
      return true;
    } catch (e) {
      if (e instanceof StaleOperationError) {
        invalidateScan(
          'Données modifiées : l’ajustement est désactivé. Scannez à nouveau après actualisation.',
        );
        setUndo(null);
      }
      lastError.current =
        (e as Error).message.includes('quota') || (e as Error).name === 'QuotaExceededError'
          ? 'Stockage plein. Retirez une photo ou exportez vos données. Aucune modification enregistrée.'
          : (e as Error).message;
      setFeedback({ text: lastError.current, error: true });
      return false;
    }
  }
  function change(p: Product, delta: 1 | -1) {
    if (shared) {
      void shared.store.changeStock(p, delta);
      return;
    }
    commit((s) => changeStock(s, p.id, delta), `${p.name} · quantité mise à jour`);
  }
  async function scan(raw: string, repeat = false, fromCamera = false) {
    if (
      scanInFlight.current ||
      lookupInFlight.current ||
      editor ||
      settings ||
      (shared && !shared.store.writable)
    )
      return;
    const barcode = raw.trim();
    if (!/^\d{4,32}$/.test(barcode)) {
      setFeedback({ text: 'Saisissez un code de 4 à 32 chiffres.', error: true });
      return;
    }
    if (
      !fromCamera &&
      !repeat &&
      barcode === lastRead.current.code &&
      Date.now() - lastRead.current.time < 1200
    ) {
      setFeedback({
        text: 'Lecture rapprochée ignorée. Utilisez « Scanner à nouveau » pour un autre exemplaire.',
      });
      return;
    }
    recognition.hold(barcode);
    const resolution = productSearch.start(current.current.products, barcode);
    if (resolution.status === 'loading') {
      lookupInFlight.current = true;
      setEditor({ barcode, fromScan: true, mode, lookup: 'loading' });
      const result = await resolution.result;
      if (!result) return;
      lookupInFlight.current = false;
      setEditor({
        barcode,
        fromScan: true,
        mode,
        lookup: result.status,
        suggestion: result.status === 'found' ? result.product : undefined,
      });
      return;
    }
    const p = resolution.product;
    scanInFlight.current = true;
    setScanning(true);
    if (fromCamera) setCode(barcode);
    try {
      if (shared) {
        if (await shared.store.scanProduct(p.id, mode)) {
          lastRead.current = { code: barcode, time: Date.now() };
          setLastCode(barcode);
          setCode('');
          if (!fromCamera && !repeat) input.current?.focus();
        }
        return;
      }
      let operation: ScanOperation;
      if (
        commit(
          (s) => {
            const result = startScan(s, p.id, mode);
            operation = result.operation;
            return result.state;
          },
          `${mode === 1 ? '+1' : '−1'} ${p.name}`,
          true,
        )
      ) {
        publishScan(operation!);
        lastRead.current = { code: barcode, time: Date.now() };
        setLastCode(barcode);
        setLastProductId(p.id);
        setCode('');
        navigator.vibrate?.(45);
        if (!fromCamera && !repeat) input.current?.focus();
      }
    } finally {
      scanInFlight.current = false;
      setScanning(false);
    }
  }
  function adjustLastScan(delta: 1 | -1) {
    if (shared) {
      void shared.store.adjustScan(delta);
      return;
    }
    const operation = scanContext.current;
    if (!operation) return;
    let adjusted: ScanOperation;
    if (
      commit(
        (s) => {
          const result = adjustScan(s, operation, operation.quantity + delta);
          adjusted = result.operation;
          return result.state;
        },
        `${operation.quantity + delta} ${operation.quantity + delta === 1 ? 'exemplaire' : 'exemplaires'} ${operation.mode === 1 ? 'ajouté' : 'retiré'}${operation.quantity + delta === 1 ? '' : 's'}`,
        operation.before,
      )
    ) {
      publishScan(adjusted!);
    }
  }
  function undoScan() {
    if (shared) {
      void shared.store.undoScan();
      return;
    }
    if (!undo) return;
    const previous = undo;
    if (
      commit(
        (s) => undoOperation(s, previous.before, previous.revision),
        'Dernière opération annulée.',
      )
    )
      setScanInvalidation('Dernier scan annulé. Scannez à nouveau pour traiter des exemplaires.');
  }
  function exportData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(current.current, null, 2);
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `reserve-locale-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setFeedback({ text: 'Impossible d’exporter le stockage local.', error: true });
    }
  }
  const visible = selectProducts(state, query, category);
  const active = visible.filter((p) => p.quantity > 0);
  const empty = visible.filter((p) => p.quantity === 0);
  const low = suggestions(state);
  const remaining = state.shopping.filter((i) => !i.checked);
  const checked = state.shopping.filter((i) => i.checked);
  const lastProduct = state.products.find(
    (p) => p.id === (shared ? shared.view.lastProductId : lastProductId),
  );
  const recovery = shared && (
    <div
      className={`sync-message ${shared.view.error ? 'sync-error' : ''}`}
      role={shared.view.error ? 'alert' : 'status'}
    >
      <span>
        {shared.view.busy
          ? 'Enregistrement en cours…'
          : shared.view.error ||
            (shared.view.status === 'ready'
              ? 'Réserve synchronisée.'
              : 'Dernier stock connu · actualisation nécessaire.')}
        {shared.view.syncedAt && shared.view.status !== 'ready' && (
          <small>
            Dernière lecture réussie à {new Date(shared.view.syncedAt).toLocaleTimeString('fr-FR')}.
          </small>
        )}
      </span>
      <button
        className="text-button"
        disabled={shared.view.busy || (!online && !navigator.onLine)}
        onClick={() => void (shared.view.pending ? shared.store.resume() : shared.store.refresh())}
      >
        {shared.view.pending ? 'Reprendre la demande' : 'Actualiser'}
      </button>
    </div>
  );
  const nav = [
    { page: 'stock' as const, label: 'Stock', icon: Archive },
    { page: 'scanner' as const, label: 'Scanner', icon: ScanLine },
    { page: 'shopping' as const, label: 'À acheter', icon: ShoppingBasket },
  ];
  function productRow(p: Product) {
    return (
      <article className={`product-row ${p.quantity === 0 ? 'out-of-stock' : ''}`} key={p.id}>
        <button
          className="product-edit"
          onClick={() => setEditor({ product: p })}
          aria-label={`Modifier ${p.name}`}
        >
          <ProductImage product={p} />
          <span className="product-details">
            <strong>{p.name}</strong>
            <span>
              {[p.brand, packageLabel(p)].filter(Boolean).join(' · ') ||
                p.category ||
                'Sans conditionnement'}
            </span>
            {p.minimum !== undefined && p.quantity < p.minimum && p.quantity > 0 && (
              <small>Stock bas · minimum {p.minimum}</small>
            )}
          </span>
        </button>
        <Quantity
          name={p.name}
          value={p.quantity}
          locked={locked}
          onChange={(delta) => change(p, delta)}
        />
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#stock"
          aria-label="Sacré bleu"
          onClick={(e) => {
            e.preventDefault();
            setPage('stock');
          }}
        >
          <span className="brand-icon">
            <img src="/logo.png" width="40" height="40" alt="" />
          </span>
          Sacré bleu
          <span className="brand-dot" aria-hidden="true">
            .
          </span>
        </a>
        <div className="sidebar-label">MON GARDE-MANGER</div>
        <nav aria-label="Navigation principale">
          {nav.map((n) => (
            <button
              key={n.page}
              className={page === n.page ? 'nav-item selected' : 'nav-item'}
              aria-current={page === n.page ? 'page' : undefined}
              onClick={() => {
                setPage(n.page);
                setFeedback(null);
              }}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
              {n.page === 'shopping' && remaining.length > 0 && (
                <span className="nav-count">{remaining.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-tag">
            <span /> {shared ? 'Réserve partagée' : 'Démonstration locale'}
          </div>
          <p>{shared ? 'Votre réserve, à deux.' : 'Votre réserve, sur cet appareil.'}</p>
          <button className="settings-link" onClick={() => setSettings(true)}>
            <Settings2 size={17} /> Données et réglages
          </button>
          <div className="sidebar-footer">
            <span className="avatar">R</span>
            <div>
              {shared?.view.snapshot?.reserve.name ?? 'Ma réserve'}
              <small>{shared ? 'Espace partagé privé' : 'Démonstration'}</small>
            </div>
            <Leaf size={18} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-identity">
            <span className="mobile-brand">
              <img src="/logo.png" width="28" height="28" alt="" />
              <span>Sacré bleu</span>
            </span>
            <span className="topbar-reserve">
              <span className="topbar-dot" /> {shared?.view.snapshot?.reserve.name ?? 'Ma réserve'}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="local-button">
              <span className="status-dot" />
              <span role="status">
                {shared
                  ? shared.view.busy
                    ? 'Enregistrement…'
                    : shared.view.pending
                      ? 'Demande à vérifier'
                      : shared.view.status === 'ready'
                        ? 'Synchronisé'
                        : 'Actualisation nécessaire'
                  : online
                    ? 'Enregistré sur cet appareil'
                    : 'Hors ligne · données locales'}
              </span>
            </span>
            <button className="icon-button" aria-label="Réglages" onClick={() => setSettings(true)}>
              <Settings size={21} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main-content">
          {shared &&
            !shared.view.busy &&
            (shared.view.error || shared.view.status !== 'ready' || shared.view.pending) &&
            recovery}
          {bootError && (
            <div role="alert" className="storage-error">
              {bootError} <button onClick={() => setSettings(true)}>Gérer les données</button>
            </div>
          )}
          {page === 'stock' && (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    Votre stock<span>.</span>
                  </h1>
                </div>
                <button className="primary-button" disabled={locked} onClick={() => setEditor({})}>
                  <Plus size={19} />
                  <span>Ajouter un produit</span>
                </button>
              </div>
              <div className="stock-summary">
                <div>
                  <span className="summary-icon">
                    <Package size={21} />
                  </span>
                  <strong>{state.products.length}</strong>
                  <span>produits</span>
                </div>
                <i />
                <div>
                  <strong>{state.products.reduce((sum, p) => sum + p.quantity, 0)}</strong>
                  <span>emballages en stock</span>
                </div>
                <i />
                <div>
                  <span className="empty-dot" />
                  <strong>{state.products.filter((p) => p.quantity === 0).length}</strong>
                  <span>épuisés</span>
                </div>
              </div>
              {low.length > 0 && (
                <div className="suggestion-banner">
                  <span className="suggestion-icon">
                    <ShoppingCart size={19} />
                  </span>
                  <div>
                    <strong>
                      {low.length} produit{low.length > 1 ? 's' : ''} à réapprovisionner
                    </strong>
                    <span>Un petit tour dans la liste de courses ?</span>
                  </div>
                  <button onClick={() => setPage('shopping')}>
                    Voir <ArrowRight size={17} />
                  </button>
                </div>
              )}
              <div className="stock-tools">
                <div className="search-input">
                  <Search size={19} />
                  <input
                    aria-label="Rechercher un produit"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher dans votre réserve…"
                  />
                  {query && (
                    <button
                      className="clear-search"
                      aria-label="Effacer la recherche"
                      onClick={() => setQuery('')}
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>
                <label className="sort-control">
                  <ArrowDownUp size={17} />
                  <span className="sr-only">Trier les produits</span>
                  <select
                    value={state.sort}
                    onChange={(e) => {
                      const sort = e.target.value as State['sort'];
                      if (shared) {
                        try {
                          localStorage.setItem('app-reserve.sort.v1', sort);
                          setSort(sort);
                        } catch {
                          setFeedback({ text: 'Impossible de mémoriser le tri.', error: true });
                        }
                      } else commit((s) => ({ ...s, sort }));
                    }}
                  >
                    <option value="name">Nom A → Z</option>
                    <option value="recent">Modifiés récemment</option>
                  </select>
                </label>
              </div>
              <div className="category-tabs" aria-label="Filtrer par catégorie">
                {['Tout', ...categories].map((c) => (
                  <button
                    key={c}
                    aria-pressed={category === c}
                    className={category === c ? 'active' : ''}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <section className="stock-list" aria-label="Produits en stock">
                <div className="list-heading">
                  <span>
                    PRODUIT <small>{visible.length}</small>
                  </span>
                  <span>EN STOCK</span>
                </div>
                {active.map(productRow)}
                {empty.length > 0 && (
                  <div className="empty-heading">
                    <span /> Épuisés <small>{empty.length}</small>
                  </div>
                )}
                {empty.map(productRow)}
                {visible.length === 0 && (
                  <div className="empty-state">
                    <Search size={30} />
                    <h2>
                      {query || category !== 'Tout'
                        ? 'Aucun produit trouvé'
                        : 'Votre réserve commence ici'}
                    </h2>
                    <p>
                      {query || category !== 'Tout'
                        ? 'Essayez un autre nom ou une autre catégorie.'
                        : 'Ajoutez votre premier produit pour commencer.'}
                    </p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        if (query || category !== 'Tout') {
                          setQuery('');
                          setCategory('Tout');
                        } else setEditor({});
                      }}
                    >
                      {query || category !== 'Tout'
                        ? 'Voir tous les produits'
                        : 'Ajouter un produit'}
                    </button>
                  </div>
                )}
              </section>
              <div className="stock-footnote">
                <span>
                  <CheckCheck size={15} /> Les quantités sont sauvegardées automatiquement.
                </span>
                <button onClick={() => setPage('scanner')}>
                  <ScanLine size={16} /> Ajouter avec un code-barres <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
          {page === 'scanner' && (
            <>
              <div className="scanner-layout">
                <section
                  className={`scanner-card ${mode === -1 ? 'removing' : ''}`}
                  aria-label="Scanner de codes-barres"
                >
                  <div className="mode-toggle">
                    <button
                      className={mode === 1 ? 'active' : ''}
                      aria-pressed={mode === 1}
                      onClick={() => {
                        recognition.suspend();
                        setMode(1);
                      }}
                    >
                      <Plus size={19} /> Ajouter
                    </button>
                    <button
                      className={mode === -1 ? 'active danger' : ''}
                      aria-pressed={mode === -1}
                      onClick={() => {
                        recognition.suspend();
                        setMode(-1);
                      }}
                    >
                      <Minus size={19} /> Retirer
                    </button>
                  </div>
                  <CameraScanner
                    settingsTarget={cameraSettingsTarget}
                    recognition={recognition}
                    paused={locked || scanning || !!bootError || !!editor || settings}
                    onCode={(barcode) => void scan(barcode, false, true)}
                  />
                  <details className="manual-code">
                    <summary>Saisir un code-barres</summary>
                    <form
                      className="scan-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        scan(code);
                      }}
                    >
                      <label htmlFor="barcode">Code-barres</label>
                      <div>
                        <input
                          id="barcode"
                          ref={input}
                          inputMode="numeric"
                          autoComplete="off"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="Ex. 8076802085738"
                          maxLength={32}
                          required
                        />
                        <button
                          className={mode === 1 ? 'primary-button' : 'primary-button red'}
                          type="submit"
                          disabled={locked || scanning}
                        >
                          <ScanLine size={19} /> Valider
                        </button>
                      </div>
                    </form>
                  </details>
                </section>
                <aside className="scanner-aside">
                  {lastProduct ? (
                    <section className="last-product">
                      <div className="section-eyebrow">DERNIER PRODUIT</div>
                      <ProductImage product={lastProduct} />
                      {lastProduct.external && (
                        <ProductAttribution
                          barcode={lastProduct.external.barcode}
                          image={!!lastProduct.external.imageUrl}
                        />
                      )}
                      <h2>{lastProduct.name}</h2>
                      <p>
                        {[lastProduct.brand, packageLabel(lastProduct)].filter(Boolean).join(' · ')}
                      </p>
                      <Quantity
                        name={lastProduct.name}
                        value={lastScan?.quantity ?? 0}
                        zeroAllowed={false}
                        max={
                          shared
                            ? (shared.view.scan?.limit ?? 0)
                            : localScan
                              ? scanQuantityLimit(localScan)
                              : 0
                        }
                        disabled={!lastScan}
                        locked={locked}
                        increaseLabel="Augmenter la quantité du dernier scan"
                        decreaseLabel="Réduire la quantité du dernier scan"
                        onChange={adjustLastScan}
                      />
                      <span className="muted">
                        {lastScan
                          ? `${lastScan.quantity === 1 ? 'emballage' : 'emballages'} ${lastScan.mode === 1 ? 'ajouté' : 'retiré'}${lastScan.quantity === 1 ? '' : 's'} · ${lastProduct.quantity} en stock`
                          : `${lastProduct.quantity} en stock`}
                      </span>
                      {!lastScan && (
                        <p role="status">
                          {scanInvalidation ||
                            'Produit créé sans mouvement. Scannez à nouveau pour ajuster une quantité traitée.'}
                        </p>
                      )}
                      <button
                        className="secondary-button"
                        disabled={locked || scanning}
                        onClick={() => scan(lastProduct.barcode ?? lastCode, true)}
                      >
                        <ScanLine size={17} /> Scanner à nouveau
                      </button>
                      {canUndo && (
                        <button className="text-button" disabled={locked} onClick={undoScan}>
                          <Undo2 size={16} /> Annuler la dernière opération
                        </button>
                      )}
                    </section>
                  ) : (
                    <section className="last-product no-product">
                      <Package size={30} strokeWidth={1.3} />
                      <h2>Prêt pour le premier article</h2>
                      <p>Son stock actualisé apparaîtra ici après validation.</p>
                    </section>
                  )}
                  {!shared && (
                    <section className="demo-codes">
                      <div className="section-eyebrow">ESSAYER AVEC LA DÉMO</div>
                      {[
                        { name: 'Penne rigate', code: '8076802085738' },
                        { name: 'Thon au naturel', code: '3019081234567' },
                        { name: 'Produit inconnu', code: '1234567890128' },
                      ].map((c) => (
                        <button
                          key={c.code}
                          onClick={() => {
                            setCode(c.code);
                            input.current?.focus();
                          }}
                        >
                          <span>
                            {c.name}
                            <small>{c.code}</small>
                          </span>
                          <ArrowLeft size={16} />
                        </button>
                      ))}
                    </section>
                  )}
                </aside>
              </div>
            </>
          )}
          {page === 'shopping' && (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    À acheter<span>.</span>
                  </h1>
                  <p>
                    {remaining.length
                      ? `${remaining.length} article${remaining.length > 1 ? 's' : ''} pour remplir les étagères.`
                      : 'Tout est prêt pour les prochaines courses.'}
                  </p>
                </div>
                <span className="heading-icon">
                  <ShoppingBasket size={31} strokeWidth={1.4} />
                </span>
              </div>
              <form
                className="shopping-add"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const p = state.products.find((p) => p.id === shoppingProduct);
                  if (
                    shared
                      ? await shared.store.addShopping(
                          p?.name ?? shoppingName,
                          shoppingQuantity,
                          p?.id,
                        )
                      : commit(
                          (s) => addShopping(s, p?.name ?? shoppingName, shoppingQuantity, p?.id),
                          'Article ajouté aux courses.',
                        )
                  ) {
                    setShoppingName('');
                    setShoppingProduct('');
                    setShoppingQuantity(1);
                  }
                }}
              >
                <label>
                  Ajouter un article
                  <select
                    aria-label="Choisir un produit du catalogue ou un article libre"
                    value={shoppingProduct}
                    onChange={(e) => setShoppingProduct(e.target.value)}
                  >
                    <option value="">Article libre</option>
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {[p.brand, packageLabel(p)].filter(Boolean).join(' · ')}
                      </option>
                    ))}
                  </select>
                </label>
                {!shoppingProduct && (
                  <label className="shopping-name">
                    Nom
                    <input
                      aria-label="Nom de l’article libre"
                      required
                      maxLength={120}
                      placeholder="Ex. Éponges, sacs congélation…"
                      value={shoppingName}
                      onChange={(e) => setShoppingName(e.target.value)}
                    />
                  </label>
                )}
                <label className="shopping-qty">
                  Quantité
                  <input
                    aria-label="Quantité à acheter"
                    type="number"
                    required
                    min="1"
                    max={MAX_QUANTITY}
                    value={shoppingQuantity}
                    onChange={(e) => setShoppingQuantity(Number(e.target.value))}
                  />
                </label>
                <button type="submit" className="primary-button" disabled={locked}>
                  <Plus size={18} /> Ajouter
                </button>
              </form>
              <section className="shopping-list" aria-label="Liste de courses">
                {[...remaining, ...checked].map((item) => {
                  const product = state.products.find((p) => p.id === item.productId);
                  return (
                    <article
                      key={item.id}
                      className={`shopping-row ${item.checked ? 'checked' : ''}`}
                    >
                      <button
                        className="check-item"
                        aria-label={`${item.checked ? 'Décocher' : 'Cocher'} ${item.name}`}
                        aria-pressed={item.checked}
                        disabled={locked}
                        onClick={() =>
                          shared
                            ? void shared.store.updateShopping(item.id, { checked: !item.checked })
                            : commit((s) => ({
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
                      <div className="shopping-item-name">
                        <strong>{item.name}</strong>
                        <span>
                          {product
                            ? [product.brand, packageLabel(product)].filter(Boolean).join(' · ') ||
                              'Produit du catalogue'
                            : 'Article libre'}
                        </span>
                      </div>
                      <Quantity
                        name={item.name}
                        value={item.quantity}
                        zeroAllowed={false}
                        locked={locked}
                        onChange={(delta) =>
                          shared
                            ? void shared.store.updateShopping(item.id, {
                                quantity: Math.max(1, item.quantity + delta),
                                checked: false,
                              })
                            : commit((s) => ({
                                ...s,
                                shopping: s.shopping.map((i) =>
                                  i.id === item.id
                                    ? {
                                        ...i,
                                        quantity: Math.max(1, i.quantity + delta),
                                        checked: false,
                                      }
                                    : i,
                                ),
                              }))
                        }
                      />
                      <button
                        className="icon-button remove-item"
                        aria-label={`Supprimer ${item.name} des courses`}
                        disabled={locked}
                        onClick={() =>
                          shared
                            ? void shared.store.deleteShopping(item.id)
                            : commit((s) => ({
                                ...s,
                                shopping: s.shopping.filter((i) => i.id !== item.id),
                              }))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  );
                })}
                {state.shopping.length === 0 && (
                  <div className="empty-state">
                    <ShoppingBasket size={32} />
                    <h2>Une liste toute légère</h2>
                    <p>Ajoutez un article ou choisissez une suggestion.</p>
                  </div>
                )}
              </section>
              {checked.length > 0 && (
                <button
                  className="text-button clear-checked"
                  disabled={locked}
                  onClick={() =>
                    shared
                      ? void shared.store.clearChecked()
                      : commit(
                          (s) => ({ ...s, shopping: s.shopping.filter((i) => !i.checked) }),
                          'Articles cochés supprimés.',
                        )
                  }
                >
                  <CheckCheck size={17} /> Effacer les articles cochés ({checked.length})
                </button>
              )}
              {low.length > 0 && (
                <section className="suggestions">
                  <div className="suggestions-title">
                    <span className="suggestion-icon">
                      <ShoppingCart size={20} />
                    </span>
                    <div>
                      <h2>À réapprovisionner</h2>
                      <p>D’après les seuils que vous avez choisis.</p>
                    </div>
                  </div>
                  {low.map(({ product: p, quantity }) => (
                    <article className="suggestion-row" key={p.id}>
                      <ProductImage product={p} />
                      <div>
                        <strong>{p.name}</strong>
                        <span>
                          {p.quantity} en stock · minimum {p.minimum}
                        </span>
                      </div>
                      <button
                        className="secondary-button"
                        disabled={locked}
                        onClick={() =>
                          shared
                            ? void shared.store.addShopping(p.name, quantity, p.id)
                            : commit(
                                (s) => addShopping(s, p.name, quantity, p.id),
                                `${p.name} ajouté aux courses.`,
                              )
                        }
                      >
                        <Plus size={16} /> Ajouter {quantity}
                      </button>
                    </article>
                  ))}
                </section>
              )}
              <p className="shopping-hint">
                <ScanLine size={17} /> Un scan en mode Ajouter réduit les quantités à acheter des
                produits associés.
              </p>
            </>
          )}
          {state.products.some((p) => p.external) && (
            <p className="source-credit">
              Données :{' '}
              <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
                Open Food Facts et ses contributeurs
              </a>
              {' · '}
              <a
                href="https://opendatacommons.org/licenses/odbl/1-0/"
                target="_blank"
                rel="noreferrer"
              >
                ODbL
              </a>
              {' · Photos '}
              <a
                href="https://creativecommons.org/licenses/by-sa/3.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 3.0
              </a>
            </p>
          )}
        </main>
        <footer className="main-footer">
          <span>
            {shared
              ? 'Réserve privée · actualisation toutes les 5 s.'
              : 'Données de démonstration sur cet appareil.'}
          </span>
          <span>Sacré bleu · {shared ? 'partagée' : 'démo'}</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {nav.map((n) => (
          <button
            key={n.page}
            aria-current={page === n.page ? 'page' : undefined}
            className={page === n.page ? 'selected' : ''}
            onClick={() => {
              setPage(n.page);
              setFeedback(null);
            }}
          >
            <n.icon size={22} />
            <span>{n.label}</span>
            {n.page === 'shopping' && remaining.length > 0 && <small>{remaining.length}</small>}
          </button>
        ))}
      </nav>
      {feedback && (
        <div
          className={`toast ${feedback.error ? 'error' : ''}`}
          role={feedback.error ? 'alert' : 'status'}
        >
          {feedback.error ? <CircleHelp size={18} /> : <Check size={18} />}
          <span>{feedback.text}</span>
          {canUndo && !feedback.error && (
            <button disabled={locked} onClick={undoScan}>
              Annuler
            </button>
          )}
          <button aria-label="Fermer le message" onClick={() => setFeedback(null)}>
            <X size={17} />
          </button>
        </div>
      )}
      {editor?.lookup === 'loading' && (
        <Modal
          title="Nouveau code-barres"
          close={() => {
            cancelLookup();
            setEditor(null);
          }}
        >
          <p role="status" className="form-note">
            Recherche du produit…
          </p>
          <button
            className="secondary-button"
            onClick={() => {
              cancelLookup();
              setEditor({ ...editor, lookup: 'unavailable' });
            }}
          >
            Saisir manuellement
          </button>
        </Modal>
      )}
      {editor && editor.lookup !== 'loading' && (
        <ProductForm
          editor={editor}
          shared={!!shared}
          blocked={locked}
          recovery={shared && (shared.view.error || shared.view.pending) ? recovery : undefined}
          close={() => {
            cancelLookup();
            setEditor(null);
            input.current?.focus();
          }}
          onSave={async (product) => {
            if (shared) {
              const success = await shared.store.saveProduct(
                product,
                !!editor.product,
                !!editor.fromScan,
                editor.mode,
              );
              if (!success) throw new Error(shared.store.getSnapshot().error);
              if (editor.fromScan) {
                lastRead.current = { code: product.barcode ?? '', time: Date.now() };
                setLastCode(product.barcode ?? '');
              }
              setEditor(null);
              return true;
            }
            const fromScan = !!editor.fromScan;
            let operation: ScanOperation | undefined;
            if (
              commit(
                (s) => {
                  if (fromScan && editor.mode === 1 && product.quantity > 0) {
                    const result = startScan(
                      saveProduct(s, { ...product, quantity: 0 }),
                      product.id,
                      1,
                      product.quantity,
                    );
                    operation = { ...result.operation, before: s };
                    return result.state;
                  }
                  return saveProduct(s, product);
                },
                `${product.name} ${editor.product ? 'enregistré' : 'créé'} · ${product.quantity} en stock`,
                fromScan,
              )
            ) {
              setEditor(null);
              if (fromScan) {
                if (operation) publishScan(operation);
                else
                  setScanInvalidation(
                    'Produit créé sans mouvement. Scannez à nouveau pour ajuster une quantité traitée.',
                  );
                setLastProductId(product.id);
                setLastCode(product.barcode ?? '');
                setCode('');
                lastRead.current = { code: product.barcode ?? '', time: Date.now() };
                navigator.vibrate?.(45);
              }
              return true;
            }
            throw new Error(lastError.current);
          }}
          onDelete={(p) => {
            setEditor(null);
            setDeleting(p);
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Supprimer ce produit ?"
          close={() => setDeleting(null)}
          error={feedback?.error ? feedback.text : undefined}
        >
          {shared && recovery}
          <p className="form-note">
            La fiche « {deleting.name} » et son stock seront supprimés. Les éventuels articles de
            courses resteront comme articles libres.
          </p>
          <div className="confirm-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setEditor({ product: deleting });
                setDeleting(null);
              }}
            >
              Conserver
            </button>
            <button
              className="danger-button filled"
              disabled={locked}
              onClick={async () => {
                if (
                  shared
                    ? await shared.store.deleteProduct(deleting.id)
                    : commit((s) => deleteProduct(s, deleting.id), 'Produit supprimé.')
                )
                  setDeleting(null);
              }}
            >
              <Trash2 size={17} /> Supprimer
            </button>
          </div>
        </Modal>
      )}
      {settings && (
        <Modal
          title="Préférences"
          close={() => setSettings(false)}
          error={feedback?.error ? feedback.text : undefined}
        >
          <div className="settings-content">
            <AppearanceSettings theme={theme} />
            {page === 'scanner' && <div ref={setCameraSettingsTarget} />}
            {shared ? (
              <details className="settings-more">
                <summary>Compte et réserve</summary>
                {accountSettings}
              </details>
            ) : (
              <details className="settings-more">
                <summary>Données de démonstration</summary>
                <p>
                  Vos produits et votre liste sont sauvegardés dans ce navigateur. Les modifications
                  sont disponibles hors ligne après le premier chargement de la version compilée.
                </p>
                <p>
                  Cette démonstration reste sur cet appareil, sans synchronisation. La caméra est
                  disponible en contexte sécurisé ; la recherche Open Food Facts viendra plus tard.
                </p>
                <button className="secondary-button" onClick={exportData}>
                  <Download size={17} /> Exporter les données JSON
                </button>
                <small>
                  L’export est une sauvegarde brute. La restauration guidée sera ajoutée à une
                  prochaine étape.
                </small>
                <hr />
                <button
                  className="danger-button"
                  onClick={() => {
                    setSettings(false);
                    setResetting(true);
                  }}
                >
                  Réinitialiser la démonstration
                </button>
                {onExitDemo && (
                  <button className="secondary-button" onClick={onExitDemo}>
                    Quitter la démonstration
                  </button>
                )}
              </details>
            )}
            <AppInformation />
          </div>
        </Modal>
      )}
      {resetting && (
        <Modal
          title="Repartir avec la démonstration ?"
          close={() => setResetting(false)}
          error={feedback?.error ? feedback.text : undefined}
        >
          <p className="form-note">
            Les données de ce navigateur seront remplacées par les produits d’exemple. Exportez vos
            données si vous souhaitez les conserver.
          </p>
          <div className="confirm-actions">
            <button className="secondary-button" onClick={() => setResetting(false)}>
              Conserver
            </button>
            <button
              className="danger-button filled"
              onClick={() => {
                try {
                  const fresh = demo();
                  const raw = localStorage.getItem(STORAGE_KEY);
                  try {
                    fresh.revision = Math.max(0, Number(JSON.parse(raw ?? '{}').revision) || 0) + 1;
                  } catch {
                    fresh.revision = current.current.revision + 1;
                  }
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
                  current.current = fresh;
                  setState(fresh);
                  setBootError('');
                  setResetting(false);
                  setUndo(null);
                  invalidateScan('Démonstration réinitialisée.');
                  setLastProductId(null);
                  setFeedback({ text: 'Démonstration réinitialisée.' });
                } catch {
                  setFeedback({ text: 'Impossible d’écrire dans le stockage local.', error: true });
                }
              }}
            >
              Réinitialiser
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
