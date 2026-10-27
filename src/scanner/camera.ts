import { ScanRecognition } from '../model';

export type CameraStatus = 'idle' | 'starting' | 'running' | 'paused' | 'error';
export interface CameraView {
  status: CameraStatus;
  error: string;
  torch: boolean;
  lit: boolean;
}
export interface Decoder {
  read(video: HTMLVideoElement): string | null;
  dispose(): void;
}
export interface CameraRuntime {
  secure: () => boolean;
  getMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  loadDecoder: () => Promise<Decoder>;
  later: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel: (timer: ReturnType<typeof setTimeout>) => void;
  now: () => number;
}
const browserRuntime: CameraRuntime = {
  secure: () => window.isSecureContext && !!navigator.mediaDevices?.getUserMedia,
  getMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  loadDecoder: async () => (await import('./decoder')).createDecoder(),
  later: (callback, delay) => setTimeout(callback, delay),
  cancel: (timer) => clearTimeout(timer),
  now: () => performance.now(),
};

export function cameraError(error: unknown): string {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Caméra refusée. Autorisez-la dans les réglages du navigateur, puis réessayez.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'Aucune caméra disponible. Utilisez la saisie du code.';
  if (name === 'NotReadableError' || name === 'AbortError')
    return 'Caméra interrompue ou occupée. Fermez les autres applications puis réessayez.';
  return 'Caméra indisponible. Réessayez ou saisissez le code.';
}

/** Owns every track, including streams arriving after cancellation of a permission prompt. */
export class CameraSession {
  private generation = 0;
  private disposed = false;
  private stream: MediaStream | null = null;
  private decoder: Decoder | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private detach: (() => void) | null = null;
  private view: CameraView = { status: 'idle', error: '', torch: false, lit: false };

  constructor(
    private video: HTMLVideoElement,
    private recognition: ScanRecognition,
    private blocked: () => boolean,
    private onCode: (code: string) => void,
    private changed: (view: CameraView) => void,
    private runtime: CameraRuntime = browserRuntime,
  ) {}

  private publish(patch: Partial<CameraView>) {
    if (this.disposed) return;
    this.view = { ...this.view, ...patch };
    this.changed(this.view);
  }

  stop(status: CameraStatus = 'idle') {
    this.generation++;
    if (this.timer !== null) this.runtime.cancel(this.timer);
    this.timer = null;
    this.detach?.();
    this.detach = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.decoder?.dispose();
    this.decoder = null;
    this.video.pause();
    this.video.srcObject = null;
    // A pause, mode change or network wait is never evidence that an item left the frame.
    this.recognition.suspend();
    this.publish({ status, torch: false, lit: false, error: '' });
  }

  async start() {
    if (this.disposed || this.view.status === 'starting' || this.view.status === 'running') return;
    this.stop();
    if (!this.runtime.secure()) {
      this.publish({
        status: 'error',
        error: 'La caméra nécessite une connexion HTTPS sécurisée et un navigateur compatible.',
      });
      return;
    }
    const generation = this.generation;
    this.publish({ status: 'starting' });
    try {
      const stream = await this.runtime.getMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (generation !== this.generation || this.disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const interrupted = () => this.stop('paused');
      const track = stream.getVideoTracks()[0];
      if (!track || track.readyState === 'ended') throw new DOMException('', 'NotReadableError');
      track.addEventListener('ended', interrupted);
      track.addEventListener('mute', interrupted);
      this.video.addEventListener('pause', interrupted);
      this.detach = () => {
        track.removeEventListener('ended', interrupted);
        track.removeEventListener('mute', interrupted);
        this.video.removeEventListener('pause', interrupted);
      };
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.srcObject = stream;
      await this.video.play();
      if (generation !== this.generation || this.disposed) return;
      const decoder = await this.runtime.loadDecoder();
      if (generation !== this.generation || this.disposed) {
        decoder.dispose();
        return;
      }
      this.decoder = decoder;
      let torch = false;
      try {
        const capabilities = track.getCapabilities?.() as
          (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        torch = capabilities?.torch === true;
      } catch {
        // Optional hardware capabilities must never prevent barcode scanning.
      }
      this.publish({ status: 'running', torch });
      const tick = () => {
        if (generation !== this.generation || this.disposed) return;
        try {
          if (
            this.blocked() ||
            this.video.readyState < 2 ||
            !this.video.videoWidth ||
            !this.video.videoHeight
          )
            this.recognition.suspend();
          else {
            const code = this.recognition.observe(decoder.read(this.video), this.runtime.now());
            if (code) this.onCode(code);
          }
          if (generation === this.generation) this.timer = this.runtime.later(tick, 150);
        } catch (error) {
          this.stop();
          this.publish({ status: 'error', error: cameraError(error) });
        }
      };
      tick();
    } catch (error) {
      if (generation !== this.generation || this.disposed) return;
      this.stop();
      this.publish({ status: 'error', error: cameraError(error) });
    }
  }

  async toggleTorch() {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || !this.view.torch) return;
    const generation = this.generation;
    const lit = !this.view.lit;
    try {
      await track.applyConstraints({ advanced: [{ torch: lit } as MediaTrackConstraintSet] });
      if (generation === this.generation) this.publish({ lit, error: '' });
    } catch {
      if (generation === this.generation)
        this.publish({ error: 'Lampe indisponible sur cet appareil.', torch: false });
    }
  }

  dispose() {
    this.stop();
    this.disposed = true;
  }
}

/** Foreground return is explicit: no automatic permission prompt or competing restart. */
export function bindCameraLifecycle(
  session: CameraSession,
  doc: Document = document,
  win: Window = window,
) {
  const visibility = () => {
    if (doc.visibilityState !== 'visible') session.stop('paused');
  };
  const hide = () => session.stop('paused');
  doc.addEventListener('visibilitychange', visibility);
  win.addEventListener('pagehide', hide);
  return () => {
    doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener('pagehide', hide);
    session.dispose();
  };
}
