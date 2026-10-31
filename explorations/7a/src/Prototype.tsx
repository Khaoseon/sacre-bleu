import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  Check,
  CloudOff,
  LoaderCircle,
  Plus,
  ScanLine,
  ShoppingBasket,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import {
  addShopping,
  adjustScan,
  changeStock,
  deleteProduct,
  findProductByBarcode,
  saveProduct,
  startScan,
  StaleOperationError,
  undoOperation,
  type Product,
  type ScanOperation,
  type State,
} from '../../../src/model';
import type { Phase7aKey } from '../../../src/i18n/phase7a';
import mascot from '../../../public/icon-192.png';
import { fixtures, realityFixtures, largeFixtures } from './fixtures';
import { useContentSwipe } from './useContentSwipe';
import { Language, SheetFrame, useText, ImageArea, PhotoFits } from './ui';
import { Editor } from './Editor';
import { Inventory } from './Inventory';
import { Details } from './Details';
import { Shopping } from './Shopping';
import { Scanner } from './Scanner';
import { QuantityProposal } from './QuantityProposal';
import {
  adjustStockBy,
  errorKey,
  replenishment,
  restoreRemoved,
  SimulationFailure,
  type Scenario,
} from './operations';
import './convergence.css';

const params = new URLSearchParams(location.search);
type Sheet =
  | { kind: 'detail' | 'edit' | 'delete' | 'quantity'; product: Product }
  | { kind: 'create'; barcode?: string; mode?: 1 | -1 }
  | { kind: 'settings' | 'restock' };
function initialState() {
  return params.get('count')
    ? largeFixtures(Number(params.get('count')))
    : params.get('fixtures') === 'mixed'
      ? realityFixtures()
      : fixtures();
}
function App() {
  const [language, setLanguage] = useState<'fr' | 'en'>(params.get('lang') === 'en' ? 'en' : 'fr');
  const [fits, setFits] = useState<Record<string, 'contain' | 'cover'>>({});
  return (
    <PhotoFits.Provider value={fits}>
      <Language.Provider value={language}>
        <Prototype
          language={language}
          setLanguage={setLanguage}
          setFit={(id, fit) => setFits((current) => ({ ...current, [id]: fit }))}
        />
      </Language.Provider>
    </PhotoFits.Provider>
  );
}
function Prototype({
  language,
  setLanguage,
  setFit,
}: {
  language: 'fr' | 'en';
  setLanguage: (v: 'fr' | 'en') => void;
  setFit: (id: string, fit: 'contain' | 'cover') => void;
}) {
  const t = useText(),
    [state, setState] = useState(initialState),
    current = useRef(state);
  current.current = state;
  const [page, setPage] = useState(Number(params.get('page') ?? 0)),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('Tout'),
    [sorted, setSorted] = useState(false);
  const [layout, setLayout] = useState<'shelf' | 'compact'>(
      params.get('layout') === 'shelf' ? 'shelf' : 'compact',
    ),
    [composition, setComposition] = useState<'object' | 'split'>(
      params.get('detail') === 'split' ? 'split' : 'object',
    );
  const [sheet, setSheet] = useState<Sheet | null>(() =>
    params.has('detail')
      ? { kind: 'detail', product: initialState().products.find((p) => p.id === 'pasta')! }
      : null,
  );
  const [scenario, setScenario] = useState<Scenario>('ready'),
    [busy, setBusy] = useState(false),
    writing = useRef(false),
    [notice, setNotice] = useState<Phase7aKey | null>(null),
    [error, setError] = useState<Phase7aKey | null>(null);
  const [shoppingName, setShoppingName] = useState(''),
    [camera, setCamera] = useState(false),
    [mode, setMode] = useState<1 | -1>(1),
    [code, setCode] = useState(''),
    [scan, setScan] = useState<ScanOperation | null>(null),
    [manual, setManual] = useState(false),
    [unknown, setUnknown] = useState<string | null>(null);
  const [imageSet, setImageSet] = useState(params.get('fixtures') === 'mixed' ? 'mixed' : 'studio'),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [removed, setRemoved] = useState<State['shopping'][number] | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [checking, setChecking] = useState(false),
    heading = useRef<HTMLHeadingElement>(null),
    navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current!;
    const fit = () =>
      nav
        .closest<HTMLElement>('.app-shell')
        ?.style.setProperty('--nav-height', `${nav.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    fit();
    return () => observer.disconnect();
  }, []);
  const locked = busy || checking || ['offline', 'uncertain', 'loading'].includes(scenario);
  function navigate(next: number) {
    if (writing.current || sheet) return;
    setPage(next);
    setCamera(false);
    setError(null);
    setNotice(null);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  const swipe = useContentSwipe(
    page,
    navigate,
    locked ||
      !!sheet ||
      camera ||
      (page === 2 && !!shoppingName) ||
      (page === 1 && manual && !!code),
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `Sacré bleu · ${t('Atelier 7A.2 · simulation')}`;
  }, [language]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setCamera(false);
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  useEffect(() => {
    if (!notice || error) return;
    const timer = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(timer);
  }, [notice, error]);
  useEffect(() => {
    if (scan) document.querySelector('.page-1')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [scan?.id]);
  function open(next: Sheet) {
    setDirty(false);
    setDiscard(false);
    setError(null);
    setSheet(next);
  }
  function close() {
    if (dirty && (sheet?.kind === 'edit' || sheet?.kind === 'create')) setDiscard(true);
    else {
      setSheet(null);
      setError(null);
      setDirty(false);
    }
  }
  async function mutate(transform: (s: State) => State, after?: (s: State) => void) {
    if (writing.current) return;
    if (scenario === 'offline') {
      setError('Copie hors ligne · lecture seule');
      return;
    }
    if (scenario === 'uncertain') {
      setError('Résultat incertain · vérifiez avant de continuer.');
      return;
    }
    if (scenario === 'loading') return;
    writing.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await new Promise<void>((r) => setTimeout(r, 550));
      if (scenario === 'failure') {
        setScenario('ready');
        throw new SimulationFailure();
      }
      if (scenario === 'conflict') {
        setScenario('ready');
        throw new StaleOperationError();
      }
      if (scenario === 'unexpected') {
        setScenario('ready');
        throw new Error('unexpected');
      }
      const saved = { ...transform(current.current), revision: current.current.revision + 1 };
      current.current = saved;
      setState(saved);
      setScan(null);
      setNotice('Enregistré dans la simulation.');
      after?.(saved);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  function doScan() {
    const raw = manual ? code.trim() : '8076802085738';
    if (!/^\d{4,32}$/.test(raw)) {
      setError('Le code-barres doit contenir de 4 à 32 chiffres.');
      return;
    }
    const p = findProductByBarcode(current.current.products, raw);
    setCamera(false);
    setError(null);
    if (!p) {
      setUnknown(raw);
      setScan(null);
      return;
    }
    if ((mode === -1 && p.quantity === 0) || (mode === 1 && p.quantity === 9999)) {
      setError(
        mode === -1
          ? 'Stock insuffisant pour ce retrait.'
          : 'La quantité doit être un entier entre 0 et 9 999.',
      );
      return;
    }
    let op: ScanOperation;
    void mutate(
      (s) => {
        const r = startScan(s, p.id, mode);
        op = r.operation;
        return r.state;
      },
      (s) => {
        setScan({ ...op!, revision: s.revision });
        setCode('');
        setManual(false);
        setUnknown(null);
      },
    );
  }
  function correct(quantity: number) {
    if (!scan) return;
    let op: ScanOperation;
    void mutate(
      (s) => {
        const r = adjustScan(s, scan, quantity);
        op = r.operation;
        return r.state;
      },
      (s) => setScan({ ...op!, revision: s.revision }),
    );
  }
  function reset(next: State = fixtures()) {
    setState(next);
    current.current = next;
    setCode('');
    setManual(false);
    setShoppingName('');
    setCamera(false);
    setSorted(false);
    setScenario('ready');
    setScan(null);
    setUnknown(null);
    setRemoved(null);
    setQuery('');
    setCategory('Tout');
    setNotice(null);
    setError(null);
  }
  const low = replenishment(state),
    remaining = state.shopping.filter((i) => !i.checked),
    scannedProduct = state.products.find((p) => p.id === scan?.productId);
  const activeProduct =
    sheet && 'product' in sheet
      ? (state.products.find((p) => p.id === sheet.product.id) ?? sheet.product)
      : undefined;
  const navItems = [
    { label: 'Stock', icon: Archive },
    { label: 'Scanner', icon: ScanLine },
    { label: 'À acheter', icon: ShoppingBasket },
  ] as const;
  const titles = ['La réserve', 'Scanner', 'Les courses'] as const;
  const sheetTitle =
    sheet?.kind === 'detail'
      ? activeProduct!.name
      : t(
          sheet?.kind === 'settings'
            ? 'Paramètres'
            : sheet?.kind === 'restock'
              ? 'Compléter la réserve'
              : sheet?.kind === 'quantity'
                ? 'Ajuster la quantité'
                : sheet?.kind === 'edit'
                  ? 'Modifier le produit'
                  : sheet?.kind === 'delete'
                    ? 'Supprimer le produit ?'
                    : 'Ajouter un produit',
        );
  async function verifyMock() {
    if (checking) return;
    setChecking(true);
    await new Promise((r) => setTimeout(r, 550));
    setScenario('ready');
    setChecking(false);
    setError(null);
    setNotice('Vérification locale terminée · aucune écriture à rejouer.');
  }
  return (
    <div className="atelier">
      <div className="prototype-ribbon">
        <span>{t('Atelier 7A.2 · simulation')}</span>
        <a href="/compare.html">{t('Comparer')}</a>
      </div>
      <div className="app-shell">
        <header className="brand-bar">
          <span className="wordmark">sacré bleu</span>
          <button
            className="round"
            aria-label={t('Paramètres')}
            onClick={() => open({ kind: 'settings' })}
          >
            <SlidersHorizontal size={20} />
          </button>
        </header>
        <main
          ref={swipe.ref}
          onClickCapture={(e) => {
            const p = e.nativeEvent as PointerEvent & {
              sourceCapabilities?: { firesTouchEvents?: boolean };
            };
            if (
              swipe.suppressClick() &&
              (p.pointerType === 'touch' || p.sourceCapabilities?.firesTouchEvents)
            ) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <div className="page-track" ref={swipe.trackRef}>
            {[0, 1, 2].map((destination) => (
              <div
                key={destination}
                className={`page-content page-${destination}`}
                aria-hidden={destination !== page}
                inert={destination !== page}
                style={{ left: `${destination * 100}%` }}
              >
                <header className="page-title">
                  <div className="title-line">
                    <h1 ref={destination === page ? heading : undefined} tabIndex={-1}>
                      {t(titles[destination])}
                      <span>.</span>
                    </h1>
                    {destination === 0 && (
                      <button
                        className="add-product"
                        aria-label={t('Ajouter un produit')}
                        disabled={locked}
                        onClick={() => open({ kind: 'create' })}
                      >
                        <Plus size={24} />
                      </button>
                    )}
                  </div>
                </header>
                {['offline', 'uncertain'].includes(scenario) && (
                  <div className="state-banner" role="status">
                    <CloudOff size={19} />
                    <span>
                      {t(
                        scenario === 'offline'
                          ? 'Simulation hors ligne · lecture seule'
                          : 'Résultat incertain · vérifiez avant de continuer.',
                      )}
                    </span>
                    <button disabled={checking} onClick={() => void verifyMock()}>
                      {t(checking ? 'Vérification…' : 'Vérifier la simulation')}
                    </button>
                  </div>
                )}
                {destination === 0 && (
                  <Inventory
                    state={state}
                    query={query}
                    setQuery={setQuery}
                    category={category}
                    setCategory={setCategory}
                    sorted={sorted}
                    setSorted={setSorted}
                    layout={layout}
                    setLayout={setLayout}
                    locked={locked}
                    loading={scenario === 'loading'}
                    open={(p) => open({ kind: 'detail', product: p })}
                    create={() => open({ kind: 'create' })}
                    adjust={(p) => open({ kind: 'quantity', product: p })}
                    change={(p, d) => void mutate((s) => changeStock(s, p.id, d))}
                    restock={() => {
                      setSelected([]);
                      open({ kind: 'restock' });
                    }}
                  />
                )}
                {destination === 1 && (
                  <Scanner
                    mode={mode}
                    setMode={(v) => {
                      setMode(v);
                      setScan(null);
                      setError(null);
                      setUnknown(null);
                    }}
                    camera={camera}
                    setCamera={setCamera}
                    code={code}
                    setCode={setCode}
                    manual={manual}
                    setManual={setManual}
                    scan={scan}
                    product={scannedProduct}
                    locked={locked}
                    busy={busy}
                    error={error}
                    doScan={doScan}
                    correct={correct}
                    undo={() =>
                      scan && void mutate((s) => undoOperation(s, scan.before, scan.revision))
                    }
                    unknown={unknown}
                    resetUnknown={() => {
                      setUnknown(null);
                      setCode('');
                      setManual(false);
                      setError(null);
                    }}
                    create={() => open({ kind: 'create', barcode: unknown ?? undefined, mode })}
                  />
                )}
                {destination === 2 && (
                  <Shopping
                    state={state}
                    name={shoppingName}
                    setName={setShoppingName}
                    locked={locked}
                    add={(name, p) =>
                      void mutate(
                        (s) => addShopping(s, name, 1, p?.id),
                        () => setShoppingName(''),
                      )
                    }
                    check={(item) =>
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
                    change={(item, delta) =>
                      void mutate((s) => ({
                        ...s,
                        shopping: s.shopping.map((i) =>
                          i.id === item.id
                            ? { ...i, quantity: i.quantity + delta, checked: false }
                            : i,
                        ),
                      }))
                    }
                    remove={(item) =>
                      void mutate(
                        (s) => ({ ...s, shopping: s.shopping.filter((i) => i.id !== item.id) }),
                        () => setRemoved(item),
                      )
                    }
                    clear={() =>
                      void mutate((s) => ({ ...s, shopping: s.shopping.filter((i) => !i.checked) }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </main>
        <div
          className={`feedback ${error ? 'feedback-error' : ''}`}
          hidden={!!removed && page === 2}
          role="status"
          aria-live="polite"
        >
          {busy && page !== 1 ? (
            <>
              <LoaderCircle className="spinning" size={17} />
              {t('Enregistrement en cours…')}
            </>
          ) : error && page !== 1 && !sheet ? (
            t(error)
          ) : notice && !(scan && page === 1) ? (
            <>
              <Check size={17} />
              {t(notice)}
            </>
          ) : null}
        </div>
        {removed && page === 2 && (
          <div className="undo-removal" role="status">
            <span>
              {removed.name} · {t('Article supprimé')}
              {error && <small role="alert">{t(error)}</small>}
            </span>
            <button
              disabled={locked}
              onClick={() =>
                void mutate(
                  (s) => restoreRemoved(s, removed),
                  () => setRemoved(null),
                )
              }
            >
              <Undo2 size={17} />
              {t('Annuler')}
            </button>
          </div>
        )}
        <nav ref={navRef} className="bottom-nav" aria-label={t('Navigation mobile')}>
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
          title={sheetTitle}
          busy={busy}
          close={close}
          className={sheet.kind === 'detail' ? `product-sheet composition-${composition}` : ''}
        >
          {discard && (
            <div className="confirmation" role="alert">
              <h3>{t('Conserver vos modifications ?')}</h3>
              <p>{t('Votre saisie n’est pas enregistrée.')}</p>
              <button autoFocus className="primary full" onClick={() => setDiscard(false)}>
                {t('Continuer l’édition')}
              </button>
              <button
                className="text-button danger-text full"
                onClick={() => {
                  setSheet(null);
                  setDirty(false);
                  setDiscard(false);
                }}
              >
                {t('Abandonner les modifications')}
              </button>
            </div>
          )}
          <div hidden={discard} inert={discard}>
            {error && sheet.kind !== 'edit' && sheet.kind !== 'create' && (
              <p className="error" role="alert">
                {t(error)}
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
                <a className="secondary full" href="/compare.html">
                  {t('Comparer les propositions')}
                </a>
                <label>
                  {t('Composition de la fiche')}
                  <select
                    value={composition}
                    onChange={(e) => setComposition(e.target.value as 'object' | 'split')}
                  >
                    <option value="object">{t('Objet · photographique')}</option>
                    <option value="split">{t('Essentiel · compact')}</option>
                  </select>
                </label>
                <label>
                  {t('Exemples d’images')}
                  <select
                    aria-label={t('Exemples d’images')}
                    value={imageSet}
                    onChange={(e) => {
                      setImageSet(e.target.value);
                      reset(e.target.value === 'mixed' ? realityFixtures() : fixtures());
                    }}
                  >
                    <option value="studio">{t('Packshots studio')}</option>
                    <option value="mixed">{t('Conditions variées')}</option>
                  </select>
                </label>
                <label>
                  {t('Taille du catalogue')}
                  <select
                    defaultValue="5"
                    onChange={(e) =>
                      reset(
                        Number(e.target.value) === 5
                          ? fixtures()
                          : largeFixtures(Number(e.target.value)),
                      )
                    }
                  >
                    <option value="5">5</option>
                    <option value="100">100</option>
                    <option value="300">300</option>
                  </select>
                </label>
                <label>
                  {t('Simuler un état')}
                  <select
                    value={scenario}
                    onChange={(e) => {
                      const next = e.target.value as Scenario;
                      if (next === 'empty')
                        reset({ ...current.current, products: [], shopping: [] });
                      setScenario(next);
                      setError(null);
                      setCamera(false);
                    }}
                  >
                    {(
                      [
                        ['ready', 'Prêt'],
                        ['offline', 'Hors ligne'],
                        ['failure', 'Échec au prochain enregistrement'],
                        ['conflict', 'Conflit au prochain enregistrement'],
                        ['unexpected', 'Erreur inattendue au prochain enregistrement'],
                        ['uncertain', 'Opération incertaine'],
                        ['empty', 'Réserve vide'],
                        ['loading', 'Chargement'],
                      ] as const
                    ).map(([v, k]) => (
                      <option key={v} value={v}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary full"
                  onClick={() => {
                    reset();
                    setImageSet('studio');
                    setSheet(null);
                  }}
                >
                  {t('Retrouver les exemples')}
                </button>
                <div className="credits">
                  <img src={mascot} alt="" />
                  <p>{t('Visuels synthétiques et images OFF locales. Aucun appel distant.')}</p>
                  <small>{t('Mascotte : Eloane ROURE · MIT')}</small>
                  <p>
                    <a href={new URL('../assets/fonts/Fraunces-OFL.txt', import.meta.url).href}>
                      Fraunces · SIL OFL 1.1
                    </a>
                    <br />
                    <a href={new URL('../assets/fonts/Manrope-OFL.txt', import.meta.url).href}>
                      Manrope · SIL OFL 1.1
                    </a>
                  </p>
                </div>
              </div>
            ) : sheet.kind === 'restock' ? (
              <div className="restock-content">
                <p className="inline-note">{t('Sous le seuil défini')}</p>
                {low.map(({ product: p, quantity, linked }) => (
                  <label className="restock-row" key={p.id}>
                    <input
                      type="checkbox"
                      disabled={locked || linked}
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, p.id]
                            : selected.filter((id) => id !== p.id),
                        )
                      }
                    />
                    <ImageArea product={p} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.quantity} / {p.minimum} ·{' '}
                        {linked ? t('Déjà dans les courses') : `+${quantity}`}
                      </small>
                    </span>
                  </label>
                ))}
                {state.products.some((p) => p.quantity === 0 && p.minimum === undefined) && (
                  <section className="zero-without-min">
                    <h3>{t('Épuisés sans seuil')}</h3>
                    <p>{t('Aucune quantité suggérée sans minimum défini.')}</p>
                    {state.products
                      .filter((p) => p.quantity === 0 && p.minimum === undefined)
                      .map((p) => (
                        <button
                          className="text-button"
                          key={p.id}
                          onClick={() => open({ kind: 'edit', product: p })}
                        >
                          {p.name} · {t('Modifier')}
                        </button>
                      ))}
                  </section>
                )}
                <button
                  className="primary full"
                  disabled={locked || !selected.length}
                  onClick={() =>
                    void mutate(
                      (s) =>
                        selected.reduce((next, pid) => {
                          const candidate = replenishment(next).find((c) => c.product.id === pid);
                          return !candidate || candidate.linked
                            ? next
                            : addShopping(next, candidate.product.name, candidate.quantity, pid);
                        }, s),
                      () => setSheet(null),
                    )
                  }
                >
                  {t('Ajouter la sélection aux courses')}
                </button>
              </div>
            ) : sheet.kind === 'quantity' ? (
              <QuantityProposal
                product={activeProduct!}
                busy={locked}
                confirm={(delta) =>
                  void mutate(
                    (s) => adjustStockBy(s, activeProduct!.id, delta),
                    () => setSheet(null),
                  )
                }
              />
            ) : sheet.kind === 'edit' || sheet.kind === 'create' ? (
              <Editor
                product={sheet.kind === 'edit' ? sheet.product : undefined}
                barcode={sheet.kind === 'create' ? sheet.barcode : undefined}
                scanMode={sheet.kind === 'create' ? sheet.mode : undefined}
                busy={locked}
                error={error}
                dirtyChanged={setDirty}
                save={(p, fit) => {
                  let createdScan: ScanOperation | undefined;
                  void mutate(
                    (s) => {
                      if (sheet.kind === 'create' && sheet.mode === 1) {
                        const created = saveProduct(s, { ...p, quantity: 0 }),
                          r = startScan(created, p.id, 1, p.quantity);
                        createdScan = r.operation;
                        return r.state;
                      }
                      return saveProduct(s, {
                        ...p,
                        quantity:
                          s.products.find((existing) => existing.id === p.id)?.quantity ??
                          p.quantity,
                      });
                    },
                    (s) => {
                      setSheet(null);
                      setDirty(false);
                      setFit(p.id, fit);
                      setUnknown(null);
                      setCode('');
                      setManual(false);
                      if (createdScan) setScan({ ...createdScan, revision: s.revision });
                      if (sheet.kind === 'create' && sheet.mode === -1)
                        setNotice('Fiche créée · aucun retrait effectué.');
                      if (scenario === 'empty') setScenario('ready');
                    },
                  );
                }}
              />
            ) : sheet.kind === 'delete' ? (
              <div className="confirmation">
                <p>{activeProduct!.name}</p>
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
                      (s) => deleteProduct(s, activeProduct!.id),
                      () => setSheet(null),
                    )
                  }
                >
                  {t('Supprimer')}
                </button>
                <button
                  className="secondary full"
                  onClick={() => open({ kind: 'detail', product: activeProduct! })}
                >
                  {t('Annuler')}
                </button>
              </div>
            ) : (
              <Details
                product={activeProduct!}
                composition={composition}
                locked={locked}
                change={(d) => void mutate((s) => changeStock(s, activeProduct!.id, d))}
                adjust={() => open({ kind: 'quantity', product: activeProduct! })}
                add={() =>
                  void mutate(
                    (s) => addShopping(s, activeProduct!.name, 1, activeProduct!.id),
                    () => setSheet(null),
                  )
                }
                edit={() => open({ kind: 'edit', product: activeProduct! })}
                remove={() => open({ kind: 'delete', product: activeProduct! })}
              />
            )}
          </div>
        </SheetFrame>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
