import { t, message } from './i18n';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Flashlight, Square } from 'lucide-react';
import { ScanRecognition } from './model';
import { bindCameraLifecycle, CameraSession, type CameraView } from './scanner/camera';
import { VIEWFINDER } from './scanner/viewfinder';

export function CameraScanner({
  recognition,
  paused,
  onCode,
  settingsTarget,
}: {
  recognition: ScanRecognition;
  paused: boolean;
  onCode: (code: string) => void;
  settingsTarget?: HTMLElement | null;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const session = useRef<CameraSession | null>(null);
  const latest = useRef({ paused, onCode });
  latest.current = { paused, onCode };
  const [view, setView] = useState<CameraView>({
    status: 'idle',
    error: '',
    torch: false,
    lit: false,
    cameras: [],
    cameraId: '',
  });
  useEffect(() => {
    const camera = new CameraSession(
      video.current!,
      recognition,
      () => latest.current.paused,
      (code) => latest.current.onCode(code),
      setView,
    );
    session.current = camera;
    return bindCameraLifecycle(camera);
  }, [recognition]);
  useEffect(() => {
    if (paused) recognition.suspend();
  }, [paused, recognition]);
  const active = view.status === 'running' || view.status === 'starting';
  return (
    <div className="camera-scanner" data-no-swipe>
      <div className={`camera-preview ${active ? 'camera-active' : ''}`}>
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          aria-label={t('Aperçu de la caméra arrière')}
        />
        {view.status === 'running' ? (
          <>
            <div
              className="camera-target"
              aria-hidden="true"
              style={{ width: `${VIEWFINDER.width * 100}%`, height: `${VIEWFINDER.height * 100}%` }}
            />
            <span className="camera-status" role="status">
              {paused ? t('Lecture en pause') : t('Placez le code au centre')}
            </span>
          </>
        ) : (
          <div className="camera-placeholder">
            <Camera size={36} strokeWidth={1.4} aria-hidden="true" />
            <span role="status">
              {view.status === 'starting'
                ? t('Ouverture de la caméra…')
                : view.status === 'paused'
                  ? t('Caméra en pause')
                  : t('Scannez vos produits à la suite')}
            </span>
            {!active && (
              <button
                className="primary-button"
                disabled={paused}
                onClick={() => void session.current?.start()}
              >
                {view.status === 'idle' ? t('Activer la caméra') : t('Reprendre la caméra')}
              </button>
            )}
          </div>
        )}
      </div>
      {view.error && (
        <p className="camera-error" role="alert">
          {message(view.error)}
        </p>
      )}
      {active && (
        <div className="camera-actions">
          <button className="text-button" onClick={() => session.current?.stop()}>
            <Square size={16} /> {t('Arrêter')}{' '}
          </button>
          {view.torch && (
            <button
              className="text-button"
              aria-pressed={view.lit}
              onClick={() => void session.current?.toggleTorch()}
            >
              <Flashlight size={16} /> {t('Lampe')}{' '}
            </button>
          )}
        </div>
      )}
      {settingsTarget &&
        createPortal(
          <fieldset className="theme-settings camera-choice">
            <legend>{t('Caméra')}</legend>
            {view.cameras.length ? (
              <label>
                <span className="sr-only">{t('Objectif')}</span>
                <select
                  value={view.cameraId}
                  disabled={view.status === 'starting'}
                  onChange={(event) => void session.current?.selectCamera(event.target.value)}
                >
                  <option value="">{t('Arrière automatique')}</option>
                  {view.cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {/^Caméra \d+$/.test(camera.label)
                        ? camera.label.replace('Caméra ', t('Caméra') + ' ')
                        : camera.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p>{t('Activez la caméra pour choisir un objectif.')}</p>
            )}
            {view.error && (
              <p role="alert" className="form-error">
                {message(view.error)}
              </p>
            )}
          </fieldset>,
          settingsTarget,
        )}
    </div>
  );
}
