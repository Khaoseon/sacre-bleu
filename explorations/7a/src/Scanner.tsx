import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  ScanLine,
  Undo2,
  LoaderCircle,
  Camera,
} from 'lucide-react';
import { scanQuantityLimit, type Product, type ScanOperation } from '../../../src/model';
import type { Phase7aKey } from '../../../src/i18n/phase7a';
import { ImageArea, Quantity, useText } from './ui';

export function Scanner({
  mode,
  setMode,
  camera,
  setCamera,
  code,
  setCode,
  manual,
  setManual,
  scan,
  product,
  locked,
  busy,
  error,
  doScan,
  correct,
  undo,
  unknown,
  create,
  resetUnknown,
}: {
  mode: 1 | -1;
  setMode: (v: 1 | -1) => void;
  camera: boolean;
  setCamera: (v: boolean) => void;
  code: string;
  setCode: (v: string) => void;
  manual: boolean;
  setManual: (v: boolean) => void;
  scan: ScanOperation | null;
  product?: Product;
  locked: boolean;
  busy: boolean;
  error: Phase7aKey | null;
  doScan: () => void;
  correct: (q: number) => void;
  undo: () => void;
  unknown: string | null;
  create: () => void;
  resetUnknown: () => void;
}) {
  const t = useText(),
    [announcement, setAnnouncement] = useState(''),
    announced = useRef(''),
    [detected, setDetected] = useState(false);
  useEffect(() => {
    if (scan && product && announced.current !== scan.id) {
      announced.current = scan.id;
      setAnnouncement(
        `${product.name}. ${t(scan.mode === 1 ? 'Ajout confirmé' : 'Retrait confirmé')} : ${scan.quantity}. ${t('Quantité en stock')} : ${product.quantity}.`,
      );
    }
  }, [scan, product, t]);
  useEffect(() => {
    if (!camera) setDetected(false);
  }, [camera]);
  return (
    <div className="scanner-content session-scanner">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <div className="segmented" aria-label={t('Mode du scan')}>
        {([1, -1] as const).map((v) => (
          <button
            key={v}
            aria-pressed={mode === v}
            disabled={locked || camera}
            onClick={() => setMode(v)}
          >
            {v === 1 ? <Plus size={17} /> : <Minus size={17} />}{' '}
            {t(v === 1 ? 'Ajouter' : 'Retirer')}
          </button>
        ))}
      </div>
      {busy ? (
        <section className="scan-pending" role="status">
          <LoaderCircle size={30} className="spinning" />
          <h2>{t(scan ? 'Mise à jour en cours…' : 'Code détecté')}</h2>
          <p>{t('Enregistrement en cours…')}</p>
          <small>{t('Le stock reste inchangé jusqu’à confirmation.')}</small>
        </section>
      ) : unknown ? (
        <section className="unknown-code">
          <ScanLine size={30} />
          <h2>{t('Produit inconnu')}</h2>
          <p>{unknown}</p>
          <p>
            {t(
              mode === -1
                ? 'Aucun retrait effectué. Créez une fiche avec son stock initial, ou revenez au scan.'
                : 'Aucun ajout effectué. Complétez la fiche pour ajouter ce produit.',
            )}
          </p>
          <button className="primary full" disabled={locked} onClick={create}>
            {t(mode === -1 ? 'Créer sans retrait' : 'Créer et ajouter')}
          </button>
          <button className="secondary full" onClick={resetUnknown}>
            {t('Retour au scanner')}
          </button>
        </section>
      ) : scan && product && !camera ? (
        <section className="scan-result" data-scan-result>
          <span className="success-label">
            <Check size={18} />
            {t(scan.mode === 1 ? 'Ajout confirmé' : 'Retrait confirmé')}
          </span>
          <div className="scan-product">
            <ImageArea product={product} />
            <div>
              <h2>{product.name}</h2>
              <p className="scan-movement">
                {scan.mode === 1 ? '+' : '−'}
                {scan.quantity}{' '}
                <span>
                  → {product.quantity} {t('en stock')}
                </span>
              </p>
            </div>
          </div>
          <div className="scan-total">
            <span>{t('Total traité')}</span>
            <Quantity
              product={t('Total traité')}
              value={scan.quantity}
              minimum={1}
              maximum={scanQuantityLimit(scan)}
              disabled={locked}
              change={(d) => correct(scan.quantity + d)}
            />
          </div>
          <button className="text-button" disabled={locked} onClick={undo}>
            <Undo2 size={16} />
            {t('Annuler le dernier scan')}
          </button>
        </section>
      ) : error && !camera ? (
        <section className="scan-failure">
          <ScanLine size={28} />
          <h2>{t('Lecture non enregistrée')}</h2>
          <p role="alert" className="error">
            {t(error)}
          </p>
        </section>
      ) : (
        <div className={`viewfinder ${camera ? 'scanning' : ''}`} data-no-swipe>
          <div className="camera-caption">
            <Camera size={15} />
            {t('Vue caméra simulée · aucune capture')}
          </div>
          <div className="camera-scene" aria-hidden="true">
            <div className="scene-carton">
              <span>MAISON BLEUE</span>
              <strong>RIGATONI</strong>
              <span className="fake-barcode" />
            </div>
            <div className="scene-edge" />
          </div>
          <div className="scan-corners" aria-hidden="true" />
          <div className="scan-ray" aria-hidden="true" />
          <span className="viewfinder-label">
            {t(camera ? 'Placez le code au centre' : 'Prêt pour le premier article')}
          </span>
        </div>
      )}
      {error && (scan || camera) && (
        <p role="alert" className="error scan-error">
          {t(error)}
        </p>
      )}
      {!unknown && (
        <>
          <button
            className="primary full scan-continue"
            disabled={locked || detected}
            onClick={() => {
              if (camera) {
                setDetected(true);
                doScan();
              } else setCamera(true);
            }}
          >
            <ScanLine size={19} />
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
            className="text-button full manual-toggle"
            aria-expanded={manual}
            disabled={busy}
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
                doScan();
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
        </>
      )}
    </div>
  );
}
