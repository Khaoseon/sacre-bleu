import { useEffect, useRef, useState } from 'react';
import { Camera, Flashlight, Square } from 'lucide-react';
import { ScanRecognition } from './model';
import { bindCameraLifecycle, CameraSession, type CameraView } from './scanner/camera';

export function CameraScanner({
  recognition,
  paused,
  onCode,
}: {
  recognition: ScanRecognition;
  paused: boolean;
  onCode: (code: string) => void;
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
    <div className="camera-scanner">
      <div className={`camera-preview ${active ? 'camera-active' : ''}`}>
        <video ref={video} muted playsInline autoPlay aria-label="Aperçu de la caméra arrière" />
        {view.status === 'running' ? (
          <>
            <div className="camera-target" aria-hidden="true" />
            <span className="camera-status" role="status">
              {paused ? 'Lecture en pause' : 'Placez le code au centre'}
            </span>
          </>
        ) : (
          <div className="camera-placeholder">
            <Camera size={36} strokeWidth={1.4} aria-hidden="true" />
            <span role="status">
              {view.status === 'starting'
                ? 'Ouverture de la caméra…'
                : view.status === 'paused'
                  ? 'Caméra en pause'
                  : 'Scannez vos produits à la suite'}
            </span>
            {!active && (
              <button
                className="primary-button"
                disabled={paused}
                onClick={() => void session.current?.start()}
              >
                {view.status === 'idle' ? 'Activer la caméra' : 'Reprendre la caméra'}
              </button>
            )}
          </div>
        )}
      </div>
      {view.error && (
        <p className="camera-error" role="alert">
          {view.error}
        </p>
      )}
      {active && (
        <div className="camera-actions">
          <button className="text-button" onClick={() => session.current?.stop()}>
            <Square size={16} /> Arrêter
          </button>
          {view.torch && (
            <button
              className="text-button"
              aria-pressed={view.lit}
              onClick={() => void session.current?.toggleTorch()}
            >
              <Flashlight size={16} /> Lampe
            </button>
          )}
        </div>
      )}
    </div>
  );
}
