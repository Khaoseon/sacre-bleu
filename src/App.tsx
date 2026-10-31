import { deferred, type DisplayMessage } from './i18n';
import {
  t,
  message,
  label,
  locale,
  number,
  plural,
  restock,
  scanSummary,
  useLanguage,
} from './i18n';

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
  Rows3,
  Grid2X2,
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
import { usePageSwipe, type Page } from './usePageSwipe';
import { useUpdateBlocker } from './AppUpdates';
import { LookupIndicator } from './LookupIndicator';
import { Shopping, Replenishment } from './Shopping';

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
  useLanguage();
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
  const [layout, setLayout] = useState<'shelf' | 'compact'>('shelf');
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = state.products.find((p) => p.id === detailId);
  useEffect(() => {
    if (detailId && !detail) setDetailId(null);
  }, [detailId, detail]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tout');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [productSearch] = useState(() => new ProductSearch(productProvider));
  const lookupInFlight = useRef(false);
  const lookupGeneration = useRef(0);
  function cancelLookup() {
    lookupGeneration.current++;
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
  const [feedback, setFeedback] = useState<{ text: DisplayMessage; error?: boolean } | null>(null);
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
  const [scanHeld, setScanHeld] = useState(false);
  const held = useRef(false);
  const [scanPhase, setScanPhase] = useState<'ready' | 'pending' | 'failed' | 'done'>('ready');
  const [detectedName, setDetectedName] = useState('');
  const [createdWithoutRemoval, setCreatedWithoutRemoval] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{
    name: string;
    mode: 1 | -1;
    quantity: number;
    stock: number;
  } | null>(null);
  // Announce each confirmed intention once; corrections update its visible total.
  useEffect(() => {
    if (!lastScan) {
      setAnnouncement(null);
      return;
    }
    const product = state.products.find(
      (p) => p.id === (shared ? shared.view.lastProductId : localScan?.productId),
    );
    if (product)
      setAnnouncement({
        name: product.name,
        mode: lastScan.mode,
        quantity: lastScan.quantity,
        stock: product.quantity,
      });
  }, [lastScan?.id]);
  const continueButton = useRef<HTMLButtonElement>(null);
  const readyLabel = useRef<HTMLParagraphElement>(null);
  function finishManualEntry() {
    setManualOpen(false);
    requestAnimationFrame(() => continueButton.current?.focus({ preventScroll: true }));
  }
  function continueScanning() {
    if (locked || scanning || lookupInFlight.current) return;
    recognition.suspend();
    held.current = false;
    setScanHeld(false);
    setScanPhase('ready');
    setAnnouncement(null);
    setFeedback(null);
    requestAnimationFrame(() => readyLabel.current?.focus({ preventScroll: true }));
  }
  const input = useRef<HTMLInputElement>(null);
  const [shoppingName, setShoppingName] = useState('');
  const [replenishment, setReplenishment] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useUpdateBlocker(() => {
    const view = shared?.store.getSnapshot();
    if (scanInFlight.current || lookupInFlight.current || scanning || view?.busy || view?.pending)
      return 'Terminez ou vérifiez l’opération en cours avant d’actualiser.';
    if (editor || detailId || deleting || resetting || replenishment)
      return 'Terminez ou fermez le formulaire ouvert avant d’actualiser.';
    if (shoppingName) return 'Terminez ou effacez la saisie dans À acheter avant d’actualiser.';
    if (code) return 'Terminez ou effacez le code-barres saisi dans Scanner avant d’actualiser.';
    if (page === 'scanner') return 'Revenez à Stock ou À acheter avant d’actualiser.';
    return null;
  });
  const swipeRef = usePageSwipe(
    page,
    (next) => {
      if (scanInFlight.current || lookupInFlight.current) return;
      setPage(next);
      setFeedback(null);
    },
    !!editor ||
      !!detailId ||
      replenishment ||
      (page === 'scanner' && !!code) ||
      (page === 'shopping' && !!shoppingName) ||
      !!deleting ||
      settings ||
      resetting ||
      scanning ||
      !!shared?.view.busy ||
      !!shared?.view.pending,
  );
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current!;
    const measure = () =>
      swipeRef.ref.current?.style.setProperty(
        '--mobile-nav-height',
        nav.getBoundingClientRect().height + 'px',
      );
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    measure();
    return () => observer.disconnect();
  }, []);
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
        held.current = true;
        setScanHeld(true);
        setScanPhase('done');
        if (completedProduct?.barcode) recognition.hold(completedProduct.barcode);
        navigator.vibrate?.(45);
      }
      if (view.completionLabel === 'Produit enregistré.') {
        if (held.current) {
          setScanPhase('done');
          if (editor?.fromScan) setCreatedWithoutRemoval(editor.mode === -1);
        }
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
  }, [shared?.view.pending, recognition]);
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
    message?: DisplayMessage,
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
  async function addShoppingItem(name: string, quantity: number, productId?: string) {
    return shared
      ? shared.store.addShopping(name, quantity, productId)
      : commit((s) => addShopping(s, name, quantity, productId), 'Article ajouté aux courses.');
  }
  function change(p: Product, delta: 1 | -1) {
    if (shared) {
      void shared.store.changeStock(p, delta);
      return;
    }
    commit(
      (s) => changeStock(s, p.id, delta),
      deferred('{0} · quantité mise à jour', { 0: p.name }),
    );
  }
  async function scan(raw: string, repeat = false, fromCamera = false) {
    if (
      scanInFlight.current ||
      (fromCamera && held.current) ||
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
    held.current = true;
    setScanHeld(true);
    setScanPhase('pending');
    setCreatedWithoutRemoval(false);
    setAnnouncement(null);
    setDetectedName(barcode);
    recognition.hold(barcode);
    const resolution = productSearch.start(current.current.products, barcode);
    if (resolution.status === 'loading') {
      const generation = ++lookupGeneration.current;
      lookupInFlight.current = true;
      setEditor({ barcode, fromScan: true, mode, lookup: 'loading' });
      const result = await resolution.result;
      if (!result || generation !== lookupGeneration.current) return;
      lookupInFlight.current = false;
      setEditor({
        barcode,
        fromScan: true,
        mode,
        lookup: result.status,
        lookupReason: result.status === 'unavailable' ? result.reason : undefined,
        suggestion: result.status === 'found' ? result.product : undefined,
      });
      return;
    }
    const p = resolution.product;
    setDetectedName(p.name);
    let confirmed = false;
    scanInFlight.current = true;
    setScanning(true);
    if (fromCamera) setCode(barcode);
    try {
      if (shared) {
        if (await shared.store.scanProduct(p.id, mode)) {
          confirmed = true;
          lastRead.current = { code: barcode, time: Date.now() };
          setLastCode(barcode);
          setCode('');
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
          deferred('{0} {1}', { 0: mode === 1 ? '+1' : '−1', 1: p.name }),
          true,
        )
      ) {
        confirmed = true;
        publishScan(operation!);
        lastRead.current = { code: barcode, time: Date.now() };
        setLastCode(barcode);
        setLastProductId(p.id);
        setCode('');
        navigator.vibrate?.(45);
      }
    } finally {
      scanInFlight.current = false;
      setScanning(false);
      setScanPhase(confirmed ? 'done' : 'failed');
      if (confirmed) finishManualEntry();
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
        deferred(
          operation.mode === 1
            ? operation.quantity + delta === 1
              ? '{0} exemplaire ajouté'
              : '{0} exemplaires ajoutés'
            : operation.quantity + delta === 1
              ? '{0} exemplaire retiré'
              : '{0} exemplaires retirés',
          { 0: operation.quantity + delta },
        ),
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
          ? t('Enregistrement en cours…')
          : message(shared.view.error) ||
            (shared.view.status === 'ready'
              ? t('Réserve synchronisée.')
              : t('Dernier stock connu · actualisation nécessaire.'))}
        {shared.view.syncedAt && shared.view.status !== 'ready' && (
          <small>
            {t('Dernière lecture réussie à')}{' '}
            {new Date(shared.view.syncedAt).toLocaleTimeString(locale())}.
          </small>
        )}
      </span>
      <button
        className="text-button"
        disabled={shared.view.busy || (!online && !navigator.onLine)}
        onClick={() => void (shared.view.pending ? shared.store.resume() : shared.store.refresh())}
      >
        {shared.view.pending ? t('Reprendre la demande') : t('Actualiser')}
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
          data-swipe-surface
          onClick={() => setDetailId(p.id)}
          aria-label={t('Détails de {0}', { 0: p.name })}
        >
          <ProductImage product={p} />
          <span className="product-details">
            <strong>{p.name}</strong>
            <span>
              {[layout === 'compact' ? p.brand : '', packageLabel(p)].filter(Boolean).join(' · ') ||
                (p.category && label(p.category)) ||
                ''}
            </span>
            {p.quantity === 0 && <small>{t('Épuisé')}</small>}
            {p.minimum !== undefined && p.quantity < p.minimum && p.quantity > 0 && (
              <small>
                {t('Stock bas · minimum')} {number(p.minimum ?? 0)}
              </small>
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
    <div
      className="app-shell sb-foundation"
      ref={swipeRef.ref}
      onClickCapture={(event) => {
        if (
          swipeRef.suppressClick() &&
          event.target instanceof Element &&
          event.target.closest('[data-swipe-surface]')
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
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
        <div className="sidebar-label">{t('MON GARDE-MANGER')}</div>
        <nav aria-label={t('Navigation principale')}>
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
              <span>{label(n.label)}</span>
              {n.page === 'shopping' && remaining.length > 0 && (
                <span className="nav-count">{number(remaining.length)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-tag">
            <span /> {shared ? t('Réserve partagée') : t('Démonstration locale')}
          </div>
          <p>{shared ? t('Votre réserve, à deux.') : t('Votre réserve, sur cet appareil.')}</p>
          <button className="settings-link" onClick={() => setSettings(true)}>
            <Settings2 size={17} /> {t('Données et réglages')}
          </button>
          <div className="sidebar-footer">
            <span className="avatar">R</span>
            <div>
              {shared?.view.snapshot?.reserve.name ?? t('Ma réserve')}
              <small>{shared ? t('Espace partagé privé') : t('Démonstration')}</small>
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
              <span className="topbar-dot" />{' '}
              {shared?.view.snapshot?.reserve.name ?? t('Ma réserve')}
            </span>
          </div>
          <div className="topbar-actions">
            <span
              className="local-button"
              data-state={
                shared
                  ? shared.view.busy
                    ? 'busy'
                    : shared.view.pending
                      ? 'pending'
                      : shared.view.status
                  : online
                    ? 'ready'
                    : 'offline'
              }
            >
              <span className="status-dot" />
              <span role="status">
                {shared
                  ? shared.view.busy
                    ? t('Enregistrement…')
                    : shared.view.pending
                      ? t('Demande à vérifier')
                      : shared.view.status === 'ready'
                        ? t('Synchronisé')
                        : shared.view.status === 'offline'
                          ? t('Hors ligne · lecture seule')
                          : t('Actualisation nécessaire')
                  : online
                    ? t('Enregistré sur cet appareil')
                    : t('Hors ligne · données locales')}
              </span>
            </span>
            <button
              className="icon-button"
              aria-label={t('Réglages')}
              onClick={() => setSettings(true)}
            >
              <Settings size={21} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="main-content">
          {shared && (
            <p className="sync-information" role="status">
              {shared.view.status === 'offline'
                ? t('Hors ligne · consultation uniquement. ')
                : shared.view.status !== 'ready'
                  ? t('Copie à actualiser · consultation uniquement. ')
                  : ''}{' '}
              {t('Dernière synchronisation :')}{' '}
              {shared.view.syncedAt
                ? new Date(shared.view.syncedAt).toLocaleString(locale())
                : t('jamais')}
              .
              {shared.view.cacheError && (
                <span role="alert"> {message(shared.view.cacheError)}</span>
              )}
            </p>
          )}
          {shared &&
            !shared.view.busy &&
            (shared.view.error || shared.view.status !== 'ready' || shared.view.pending) &&
            recovery}
          {bootError && (
            <div role="alert" className="storage-error">
              {message(bootError)}{' '}
              <button onClick={() => setSettings(true)}>{t('Gérer les données')}</button>
            </div>
          )}
          <div className="page-viewport">
            <div className="page-track" ref={swipeRef.trackRef}>
              <section
                className="page-pane"
                aria-hidden={page !== 'stock'}
                inert={page !== 'stock'}
                aria-label={t('Stock')}
              >
                <>
                  <div className="page-heading">
                    <div>
                      <h1>
                        {t('Votre stock')}
                        <span>.</span>
                      </h1>
                    </div>
                    <button
                      className="primary-button"
                      aria-label={t('Ajouter un produit')}
                      disabled={locked}
                      onClick={() => setEditor({})}
                    >
                      <Plus size={19} />
                      <span>{t('Ajouter un produit')}</span>
                    </button>
                  </div>
                  <div className="stock-summary">
                    <div>
                      <span className="summary-icon">
                        <Package size={21} />
                      </span>
                      <strong>{number(state.products.length)}</strong>
                      <span>{plural('productLabel', state.products.length)}</span>
                    </div>
                    <i />
                    <div>
                      <strong>
                        {number(state.products.reduce((sum, p) => sum + p.quantity, 0))}
                      </strong>
                      <span>
                        {plural(
                          'stockLabel',
                          state.products.reduce((sum, p) => sum + p.quantity, 0),
                        )}
                      </span>
                    </div>
                    <i />
                    <div>
                      <span className="empty-dot" />
                      <strong>
                        {number(state.products.filter((p) => p.quantity === 0).length)}
                      </strong>
                      <span>{t('épuisés')}</span>
                    </div>
                  </div>
                  {low.length > 0 && (
                    <div className="suggestion-banner">
                      <span className="suggestion-icon">
                        <ShoppingCart size={19} />
                      </span>
                      <div>
                        <strong>{restock(low.length)} </strong>
                        <span>{t('Un petit tour dans la liste de courses ?')}</span>
                      </div>
                      <button onClick={() => setReplenishment(true)}>
                        {t('Voir')} <ArrowRight size={17} />
                      </button>
                    </div>
                  )}
                  <div className="stock-tools">
                    <div className="search-input">
                      <Search size={19} />
                      <input
                        aria-label={t('Rechercher un produit')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('Rechercher dans votre réserve…')}
                      />
                      {query && (
                        <button
                          className="clear-search"
                          aria-label={t('Effacer la recherche')}
                          onClick={() => setQuery('')}
                        >
                          <X size={17} />
                        </button>
                      )}
                    </div>
                    <label className="sort-control">
                      <ArrowDownUp size={17} />
                      <span className="sr-only">{t('Trier les produits')}</span>
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
                        <option value="name">{t('Nom A → Z')}</option>
                        <option value="recent">{t('Modifiés récemment')}</option>
                      </select>
                    </label>
                  </div>
                  <div className="inventory-toolbar">
                    <div className="category-tabs" aria-label={t('Filtrer par catégorie')}>
                      {['Tout', ...categories].map((c) => (
                        <button
                          key={c}
                          aria-pressed={category === c}
                          className={category === c ? 'active' : ''}
                          onClick={() => setCategory(c)}
                        >
                          {label(c)}
                        </button>
                      ))}
                    </div>
                    <div className="display-switch">
                      <button
                        className="sb-button"
                        data-variant="secondary"
                        aria-pressed={layout === 'compact'}
                        aria-label={t(layout === 'shelf' ? 'Vue compacte' : 'Vue photographique')}
                        onClick={() => setLayout(layout === 'shelf' ? 'compact' : 'shelf')}
                      >
                        {layout === 'shelf' ? <Rows3 size={20} /> : <Grid2X2 size={20} />}
                      </button>
                    </div>
                  </div>
                  <section
                    className={'stock-list inventory-' + layout}
                    aria-label={t('Produits en stock')}
                  >
                    <div className="list-heading">
                      <span>
                        {t('PRODUIT')} <small>{number(visible.length)}</small>
                      </span>
                      <span>{t('EN STOCK')}</span>
                    </div>
                    {active.map(productRow)}
                    {empty.length > 0 && (
                      <div className="empty-heading">
                        <span /> {t('Épuisés')} <small>{number(empty.length)}</small>
                      </div>
                    )}
                    {empty.map(productRow)}
                    {visible.length === 0 && (
                      <div className="empty-state">
                        {query || category !== 'Tout' ? (
                          <Search size={30} />
                        ) : (
                          <img
                            className="empty-mascot"
                            src="/logo.png"
                            width="80"
                            height="80"
                            alt=""
                          />
                        )}
                        <h2>
                          {query || category !== 'Tout'
                            ? t('Aucun produit trouvé')
                            : t('Votre réserve commence ici')}
                        </h2>
                        <p>
                          {query || category !== 'Tout'
                            ? t('Essayez un autre nom ou une autre catégorie.')
                            : t('Ajoutez votre premier produit pour commencer.')}
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
                            ? t('Voir tous les produits')
                            : t('Ajouter un produit')}
                        </button>
                      </div>
                    )}
                  </section>
                  <div className="stock-footnote">
                    <span>
                      <CheckCheck size={15} />{' '}
                      {t('Les quantités sont sauvegardées automatiquement.')}
                    </span>
                    <button onClick={() => setPage('scanner')}>
                      <ScanLine size={16} /> {t('Ajouter avec un code-barres')}{' '}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              </section>
              <section
                className="page-pane"
                aria-hidden={page !== 'scanner'}
                inert={page !== 'scanner'}
                aria-label={t('Scanner')}
              >
                <div className={'scanner-layout scanner-session' + (scanHeld ? ' has-result' : '')}>
                  <section
                    className={'scanner-card ' + (mode === -1 ? 'removing' : '')}
                    aria-label={t('Scanner de codes-barres')}
                  >
                    <div className="mode-toggle">
                      <button
                        className={mode === 1 ? 'active' : ''}
                        aria-pressed={mode === 1}
                        disabled={locked || scanning}
                        onClick={() => {
                          recognition.suspend();
                          setMode(1);
                        }}
                      >
                        <Plus size={19} />
                        {t('Ajouter')}
                      </button>
                      <button
                        className={mode === -1 ? 'active danger' : ''}
                        aria-pressed={mode === -1}
                        disabled={locked || scanning}
                        onClick={() => {
                          recognition.suspend();
                          setMode(-1);
                        }}
                      >
                        <Minus size={19} />
                        {t('Retirer')}
                      </button>
                    </div>
                    {page === 'scanner' && (
                      <CameraScanner
                        settingsTarget={cameraSettingsTarget}
                        recognition={recognition}
                        paused={
                          locked ||
                          scanning ||
                          scanHeld ||
                          manualOpen ||
                          !!bootError ||
                          !!editor ||
                          settings
                        }
                        onCode={(barcode) => void scan(barcode, false, true)}
                      />
                    )}
                    <p className="sr-only" role="status">
                      {announcement
                        ? announcement.name +
                          ' · ' +
                          (announcement.mode === 1 ? '+' : '−') +
                          number(announcement.quantity) +
                          ' · ' +
                          scanSummary(announcement.quantity, announcement.mode, announcement.stock)
                        : ''}
                    </p>
                    {shared?.view.busy && !scanning && scanPhase === 'done' && (
                      <p role="status">{t('Enregistrement en cours…')}</p>
                    )}
                    {feedback?.error && scanHeld && (
                      <p className="form-error" role="alert">
                        {message(feedback.text)}
                      </p>
                    )}
                    <div
                      className="scan-session-result"
                      aria-busy={scanning || !!shared?.view.busy}
                    >
                      {scanning ||
                      (shared?.view.busy && scanPhase !== 'done') ||
                      shared?.view.pending ? (
                        <p role="status">
                          {shared?.view.pending && !shared.view.busy
                            ? t('Dernier stock connu · actualisation nécessaire.')
                            : scanning
                              ? t('Code détecté · enregistrement en cours…')
                              : t('Enregistrement en cours…')}{' '}
                          {detectedName}
                        </p>
                      ) : scanHeld && scanPhase === 'failed' ? (
                        <p role="status">
                          {t('Lecture non enregistrée')} · {detectedName}
                        </p>
                      ) : scanHeld && scanPhase === 'done' && lastProduct ? (
                        <section className="last-product">
                          <div className="scan-identity">
                            <ProductImage product={lastProduct} />
                            <div>
                              <small>
                                {lastScan ? t('Résultat confirmé') : t('DERNIER PRODUIT')}
                              </small>
                              <h2>{lastProduct.name}</h2>
                              <p>
                                {[lastProduct.brand, packageLabel(lastProduct)]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            </div>
                          </div>
                          {lastScan && (
                            <>
                              <div className="scan-correction">
                                <strong>
                                  {lastScan.mode === 1 ? '+' : '−'}
                                  {number(lastScan.quantity)}
                                </strong>
                                <Quantity
                                  name={lastProduct.name}
                                  value={lastScan.quantity}
                                  zeroAllowed={false}
                                  max={
                                    shared
                                      ? (shared.view.scan?.limit ?? 0)
                                      : localScan
                                        ? scanQuantityLimit(localScan)
                                        : 0
                                  }
                                  locked={locked}
                                  increaseLabel={t('Augmenter la quantité du dernier scan')}
                                  decreaseLabel={t('Réduire la quantité du dernier scan')}
                                  onChange={adjustLastScan}
                                />
                                <button
                                  className="text-button"
                                  aria-label={t('Annuler la dernière opération')}
                                  disabled={locked}
                                  onClick={undoScan}
                                >
                                  <Undo2 size={16} />
                                  {t('Annuler')}
                                </button>
                              </div>
                              <span className="muted">
                                {scanSummary(
                                  lastScan.quantity,
                                  lastScan.mode,
                                  lastProduct.quantity,
                                )}
                              </span>
                            </>
                          )}
                          {!lastScan && (
                            <p role="status">
                              {createdWithoutRemoval
                                ? t('Fiche créée · aucun retrait effectué.') +
                                  ' ' +
                                  t('{0} en stock', { 0: number(lastProduct.quantity) })
                                : message(scanInvalidation) ||
                                  t('{0} en stock', { 0: number(lastProduct.quantity) })}
                            </p>
                          )}
                        </section>
                      ) : (
                        <p className="scan-ready" ref={readyLabel} tabIndex={-1}>
                          {mode === 1
                            ? t('Prêt à scanner · Ajouter')
                            : t('Prêt à scanner · Retirer')}
                        </p>
                      )}
                    </div>
                    {scanHeld && (
                      <div className="scan-next-actions">
                        <button
                          className="secondary-button"
                          disabled={locked || scanning}
                          ref={continueButton}
                          onClick={continueScanning}
                        >
                          {t('Continuer à scanner')}
                        </button>
                        {lastProduct && scanPhase === 'done' && (
                          <button
                            className="text-button"
                            disabled={locked || scanning}
                            onClick={() => void scan(lastProduct.barcode ?? lastCode, true)}
                          >
                            <ScanLine size={17} />
                            {t('Scanner à nouveau')}
                          </button>
                        )}
                      </div>
                    )}
                    <details
                      className="manual-code"
                      open={manualOpen}
                      onToggle={(event) => {
                        setManualOpen(event.currentTarget.open);
                        if (event.currentTarget.open) input.current?.focus();
                      }}
                    >
                      <summary>{t('Saisir un code-barres')}</summary>
                      <form
                        className="scan-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void scan(code);
                        }}
                      >
                        <label htmlFor="barcode">{t('Code-barres')}</label>
                        <div>
                          <input
                            id="barcode"
                            ref={input}
                            inputMode="numeric"
                            autoComplete="off"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            placeholder={t('Ex. 8076802085738')}
                            maxLength={32}
                            required
                          />
                          <button
                            className={mode === 1 ? 'primary-button' : 'primary-button red'}
                            type="submit"
                            disabled={locked || scanning}
                          >
                            <ScanLine size={19} />
                            {t('Valider')}
                          </button>
                        </div>
                      </form>
                    </details>
                    {scanHeld && scanPhase === 'done' && lastProduct?.external && (
                      <details className="image-attribution">
                        <summary>{t('Source et crédits')}</summary>
                        <ProductAttribution
                          barcode={lastProduct.external.barcode}
                          image={!lastProduct.photo && !!lastProduct.external.imageUrl}
                        />
                      </details>
                    )}
                    <LookupIndicator provider={productProvider} />
                    {shared && (
                      <details className="scanner-diagnostics">
                        <summary>{t('Diagnostic du scanner')}</summary>
                        <p>
                          {t('Version')} {__APP_BUILD_INFO__.revision} · {number(state.revision)}
                        </p>
                        <p>
                          {t('Ajustement :')} {lastScan ? t('possible') : t('désactivé')}
                        </p>
                      </details>
                    )}
                    {!shared && (
                      <details className="demo-codes">
                        <summary>{t('ESSAYER AVEC LA DÉMO')}</summary>
                        {[
                          { name: 'Penne rigate', code: '8076802085738' },
                          { name: 'Thon au naturel', code: '3019081234567' },
                          { name: t('Produit inconnu'), code: '1234567890128' },
                        ].map((item) => (
                          <button
                            key={item.code}
                            onClick={() => {
                              setCode(item.code);
                              const details = input.current?.closest('details');
                              if (details) setManualOpen(true);
                              input.current?.focus();
                            }}
                          >
                            <span>
                              {item.name}
                              <small>{item.code}</small>
                            </span>
                            <ArrowLeft size={16} />
                          </button>
                        ))}
                      </details>
                    )}
                  </section>
                </div>
              </section>
              <section
                className="page-pane"
                aria-hidden={page !== 'shopping'}
                inert={page !== 'shopping'}
                aria-label={t('À acheter')}
              >
                <Shopping
                  state={state}
                  locked={locked}
                  draft={shoppingName}
                  setDraft={setShoppingName}
                  add={addShoppingItem}
                  replenish={() => setReplenishment(true)}
                  update={(id, patch) =>
                    shared
                      ? void shared.store.updateShopping(id, patch)
                      : void commit((s) => ({
                          ...s,
                          shopping: s.shopping.map((item) =>
                            item.id === id
                              ? {
                                  ...item,
                                  ...patch,
                                  quantity:
                                    patch.quantity ??
                                    (patch.checked === false
                                      ? Math.max(1, item.quantity)
                                      : item.quantity),
                                }
                              : item,
                          ),
                        }))
                  }
                  remove={(id) =>
                    shared
                      ? void shared.store.deleteShopping(id)
                      : void commit((s) => ({
                          ...s,
                          shopping: s.shopping.filter((item) => item.id !== id),
                        }))
                  }
                  clear={() =>
                    shared
                      ? void shared.store.clearChecked()
                      : void commit(
                          (s) => ({ ...s, shopping: s.shopping.filter((item) => !item.checked) }),
                          'Articles cochés supprimés.',
                        )
                  }
                />
              </section>
            </div>
          </div>
          {state.products.some((p) => p.external) && (
            <p className="source-credit">
              {t('Données :')}{' '}
              <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
                {t('Open Food Facts et ses contributeurs')}
              </a>
              {' · '}
              <a
                href="https://opendatacommons.org/licenses/odbl/1-0/"
                target="_blank"
                rel="noreferrer"
              >
                ODbL
              </a>
              {t(' · Photos ')}
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
              ? t('Réserve privée · actualisation toutes les 5 s.')
              : t('Données de démonstration sur cet appareil.')}
          </span>
          <span>Sacré bleu · {shared ? t('partagée') : t('démo')}</span>
        </footer>
      </div>
      <nav ref={navRef} className="mobile-nav" aria-label={t('Navigation mobile')}>
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
            <span>{label(n.label)}</span>
            {n.page === 'shopping' && remaining.length > 0 && (
              <small>{number(remaining.length)}</small>
            )}
          </button>
        ))}
      </nav>
      {feedback && !(page === 'scanner' && scanHeld) && (
        <div
          className={`toast ${feedback.error ? 'error' : ''}`}
          role={feedback.error ? 'alert' : 'status'}
        >
          {feedback.error ? <CircleHelp size={18} /> : <Check size={18} />}
          <span>{message(feedback.text)}</span>
          {canUndo && !feedback.error && (
            <button disabled={locked} onClick={undoScan}>
              {t('Annuler')}
            </button>
          )}
          <button aria-label={t('Fermer le message')} onClick={() => setFeedback(null)}>
            <X size={17} />
          </button>
        </div>
      )}
      {replenishment && (
        <Replenishment
          state={state}
          locked={locked}
          add={addShoppingItem}
          close={() => setReplenishment(false)}
          recovery={
            shared ? (
              recovery
            ) : feedback?.error ? (
              <p role="alert">{message(feedback.text)}</p>
            ) : undefined
          }
        />
      )}
      {detail && !editor && !deleting && (
        <Modal title={detail.name} close={() => setDetailId(null)}>
          {shared && recovery}
          <div className="object-detail">
            <ProductImage product={detail} describe />
            <p>
              {[detail.brand, packageLabel(detail), detail.category && label(detail.category)]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {detail.barcode && <p>{detail.barcode}</p>}
            <p className="stock-status">
              {detail.quantity === 0
                ? t('Épuisé')
                : detail.minimum !== undefined && detail.quantity < detail.minimum
                  ? t('Stock bas · minimum') + ' ' + number(detail.minimum)
                  : t('Quantité en stock')}
            </p>
            <Quantity
              name={detail.name}
              value={detail.quantity}
              locked={locked}
              onChange={(delta) => change(detail, delta)}
            />
            <div className="detail-actions">
              <button
                className="sb-button"
                disabled={locked}
                onClick={() =>
                  shared
                    ? void shared.store.addShopping(detail.name, 1, detail.id)
                    : commit(
                        (s) => addShopping(s, detail.name, 1, detail.id),
                        deferred('{0} ajouté aux courses.', { 0: detail.name }),
                      )
                }
              >
                <ShoppingBasket size={18} />
                {t('Ajouter aux courses')}
              </button>
              <button
                className="sb-button"
                data-variant="secondary"
                disabled={locked}
                onClick={() => {
                  setDetailId(null);
                  setEditor({ product: detail });
                }}
              >
                {t('Modifier le produit')}
              </button>
            </div>
            {detail.external && (
              <details className="image-attribution">
                <summary>{t('Source et crédits')}</summary>
                <ProductAttribution
                  barcode={detail.external.barcode}
                  image={!detail.photo && !!detail.external.imageUrl}
                />
              </details>
            )}
          </div>
        </Modal>
      )}
      {editor?.lookup === 'loading' && (
        <Modal
          title={t('Nouveau code-barres')}
          close={() => {
            cancelLookup();
            setEditor(null);
          }}
        >
          <p role="status" className="form-note">
            {t('Recherche du produit…')}
          </p>
          <button
            className="secondary-button"
            onClick={() => {
              cancelLookup();
              setEditor({ ...editor, lookup: 'unavailable' });
            }}
          >
            {t('Saisir manuellement')}
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
                setScanPhase('done');
                setCreatedWithoutRemoval(editor.mode === -1);
                finishManualEntry();
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
                  return saveProduct(
                    s,
                    editor.product
                      ? {
                          ...product,
                          quantity:
                            s.products.find((p) => p.id === product.id)?.quantity ??
                            product.quantity,
                        }
                      : product,
                  );
                },
                deferred(
                  editor.product ? '{0} enregistré · {1} en stock' : '{0} créé · {1} en stock',
                  { 0: product.name, 1: product.quantity },
                ),
                fromScan,
              )
            ) {
              setEditor(null);
              if (fromScan) {
                setScanPhase('done');
                finishManualEntry();
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
          title={t('Supprimer ce produit ?')}
          close={() => setDeleting(null)}
          error={feedback?.error ? feedback.text : undefined}
        >
          {shared && recovery}
          <p className="form-note">
            {t('La fiche «')} {deleting.name}{' '}
            {t(
              '» et son stock seront supprimés. Les éventuels articles de courses resteront comme articles libres.',
            )}
          </p>
          <div className="confirm-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setEditor({ product: deleting });
                setDeleting(null);
              }}
            >
              {t('Conserver')}
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
              <Trash2 size={17} /> {t('Supprimer')}
            </button>
          </div>
        </Modal>
      )}
      {settings && (
        <Modal
          title={t('Préférences')}
          close={() => setSettings(false)}
          error={feedback?.error ? feedback.text : undefined}
        >
          <div className="settings-content">
            <AppearanceSettings theme={theme} />
            {page === 'scanner' && <div ref={setCameraSettingsTarget} />}
            {shared ? (
              <details className="settings-more">
                <summary>{t('Compte et réserve')}</summary>
                {accountSettings}
              </details>
            ) : (
              <details className="settings-more">
                <summary>{t('Données de démonstration')}</summary>
                <p>
                  {t(
                    'Vos produits et votre liste sont sauvegardés dans ce navigateur. Les modifications sont disponibles hors ligne après le premier chargement de la version compilée.',
                  )}
                </p>
                <p>
                  {t(
                    'Cette démonstration reste sur cet appareil, sans synchronisation. La caméra est disponible en contexte sécurisé. La recherche Open Food Facts est désactivée dans cette démonstration ; elle est disponible dans la réserve connectée.',
                  )}
                </p>
                <button className="secondary-button" onClick={exportData}>
                  <Download size={17} /> {t('Exporter les données JSON')}
                </button>
                <small>
                  {t(
                    'L’export est une sauvegarde brute. La restauration guidée sera ajoutée à une prochaine étape.',
                  )}
                </small>
                <hr />
                <button
                  className="danger-button"
                  onClick={() => {
                    setSettings(false);
                    setResetting(true);
                  }}
                >
                  {t('Réinitialiser la démonstration')}
                </button>
                {onExitDemo && (
                  <button className="secondary-button" onClick={onExitDemo}>
                    {t('Quitter la démonstration')}
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
          title={t('Repartir avec la démonstration ?')}
          close={() => setResetting(false)}
          error={feedback?.error ? feedback.text : undefined}
        >
          <p className="form-note">
            {t(
              'Les données de ce navigateur seront remplacées par les produits d’exemple. Exportez vos données si vous souhaitez les conserver.',
            )}
          </p>
          <div className="confirm-actions">
            <button className="secondary-button" onClick={() => setResetting(false)}>
              {t('Conserver')}
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
              {t('Réinitialiser')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
