import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScanRecognition } from '../model';
import {
  bindCameraLifecycle,
  CameraSession,
  type CameraRuntime,
  type CameraView,
  type Decoder,
} from './camera';

const code = '4006381333931';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fixture() {
  vi.useFakeTimers();
  const track = Object.assign(new EventTarget(), {
    readyState: 'live',
    stop: vi.fn(),
    getCapabilities: () => ({ torch: true }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  });
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  const video = Object.assign(new EventTarget(), {
    muted: false,
    playsInline: false,
    srcObject: null,
    readyState: 2,
    videoWidth: 1280,
    videoHeight: 720,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  }) as unknown as HTMLVideoElement;
  const decoder: Decoder = { read: vi.fn().mockReturnValue(code), dispose: vi.fn() };
  const getMedia = vi.fn().mockResolvedValue(stream);
  const loadDecoder = vi.fn().mockResolvedValue(decoder);
  const runtime: CameraRuntime = {
    secure: () => true,
    getMedia,
    loadDecoder,
    later: (callback, delay) => setTimeout(callback, delay),
    cancel: clearTimeout,
    now: Date.now,
  };
  let blocked = false;
  const onCode = vi.fn();
  const views: CameraView[] = [];
  const filter = new ScanRecognition();
  const camera = new CameraSession(
    video,
    filter,
    () => blocked,
    onCode,
    (view) => views.push(view),
    runtime,
  );
  return {
    camera,
    track,
    stream,
    video,
    decoder,
    getMedia,
    loadDecoder,
    runtime,
    onCode,
    views,
    filter,
    block: (value: boolean) => {
      blocked = value;
    },
  };
}
afterEach(() => {
  vi.useRealTimers();
});
describe('cycle caméra (MediaStream simulé)', () => {
  it('ne demande rien à la construction, ouvre une seule caméra arrière sans audio et lit en continu', async () => {
    const f = fixture();
    expect(f.getMedia).not.toHaveBeenCalled();
    const start = f.camera.start();
    await f.camera.start();
    await start;
    expect(f.getMedia).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        audio: false,
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
      }),
    );
    expect(f.video.playsInline && f.video.muted).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(f.onCode).toHaveBeenCalledExactlyOnceWith(code);
    expect(f.track.stop).not.toHaveBeenCalled();
    f.camera.dispose();
    expect(f.track.stop).toHaveBeenCalledOnce();
    expect(f.decoder.dispose).toHaveBeenCalledOnce();
    expect(f.video.srcObject).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['NotAllowedError', 'NotFoundError', 'NotReadableError', 'AbortError'])(
    'gère %s puis permet une nouvelle tentative',
    async (name) => {
      const f = fixture();
      f.getMedia.mockRejectedValueOnce({ name });
      await f.camera.start();
      expect(f.views.at(-1)).toMatchObject({ status: 'error', error: expect.any(String) });
      expect(f.loadDecoder).not.toHaveBeenCalled();
      await f.camera.start();
      expect(f.views.at(-1)?.status).toBe('running');
      f.camera.dispose();
    },
  );
  it('refuse HTTP non sécurisé sans déclencher de permission', async () => {
    const f = fixture();
    f.runtime.secure = () => false;
    await f.camera.start();
    expect(f.getMedia).not.toHaveBeenCalled();
    expect(f.views.at(-1)?.error).toContain('HTTPS');
  });
  it('ferme un flux tardif après annulation de la permission, sans toucher à la nouvelle session', async () => {
    const f = fixture();
    const pending = deferred<MediaStream>();
    f.getMedia.mockReturnValueOnce(pending.promise);
    const first = f.camera.start();
    f.camera.stop();
    const lateStop = vi.fn();
    const lateStream = { getTracks: () => [{ stop: lateStop }] } as unknown as MediaStream;
    await f.camera.start();
    pending.resolve(lateStream);
    await first;
    expect(lateStop).toHaveBeenCalledOnce();
    expect(f.track.stop).not.toHaveBeenCalled();
    expect(f.video.srcObject).toBe(f.stream);
    f.camera.dispose();
  });
  it('libère aussi un lecteur chargé après la fermeture et ne redémarre jamais après dispose', async () => {
    const f = fixture();
    const pending = deferred<Decoder>();
    f.loadDecoder.mockReturnValue(pending.promise);
    const start = f.camera.start();
    await Promise.resolve();
    await Promise.resolve();
    f.camera.dispose();
    pending.resolve(f.decoder);
    await start;
    expect(f.decoder.dispose).toHaveBeenCalledOnce();
    expect(f.track.stop).toHaveBeenCalledOnce();
    await f.camera.start();
    expect(f.getMedia).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('un inconnu, un réseau lent ou incertain suspendent le décodage sans fermer la caméra ni réarmer', async () => {
    const f = fixture();
    await f.camera.start();
    vi.advanceTimersByTime(300);
    expect(f.onCode).toHaveBeenCalledOnce();
    f.block(true);
    const reads = vi.mocked(f.decoder.read).mock.calls.length;
    vi.advanceTimersByTime(10000);
    expect(vi.mocked(f.decoder.read).mock.calls.length).toBe(reads);
    expect(f.track.stop).not.toHaveBeenCalled();
    f.block(false);
    vi.advanceTimersByTime(1200);
    expect(f.onCode).toHaveBeenCalledOnce();
    vi.mocked(f.decoder.read).mockReturnValue('96385074');
    vi.advanceTimersByTime(450);
    expect(f.onCode).toHaveBeenLastCalledWith('96385074');
    f.camera.dispose();
  });
  it('arrête les pistes en arrière-plan et pagehide, reprend explicitement sans recompter le code', async () => {
    const f = fixture();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const win = new EventTarget();
    const cleanup = bindCameraLifecycle(
      f.camera,
      doc as unknown as Document,
      win as unknown as Window,
    );
    await f.camera.start();
    vi.advanceTimersByTime(300);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.views.at(-1)?.status).toBe('paused');
    expect(f.track.stop).toHaveBeenCalledOnce();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.getMedia).toHaveBeenCalledOnce();
    await f.camera.start();
    vi.advanceTimersByTime(1000);
    expect(f.onCode).toHaveBeenCalledOnce();
    win.dispatchEvent(new Event('pagehide'));
    expect(f.track.stop).toHaveBeenCalledTimes(2);
    cleanup();
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['ended', 'mute'])('gère une interruption système %s', async (event) => {
    const f = fixture();
    await f.camera.start();
    f.track.dispatchEvent(new Event(event));
    expect(f.views.at(-1)?.status).toBe('paused');
    expect(vi.getTimerCount()).toBe(0);
    f.camera.dispose();
  });
  it('libère le flux après échec de play, de chargement ou de décodage', async () => {
    for (const failure of ['play', 'load', 'read']) {
      const f = fixture();
      if (failure === 'play') vi.mocked(f.video.play).mockRejectedValue(new Error());
      if (failure === 'load') f.loadDecoder.mockRejectedValue(new Error());
      if (failure === 'read')
        vi.mocked(f.decoder.read).mockImplementation(() => {
          throw new Error();
        });
      await f.camera.start();
      expect(f.views.at(-1)?.status).toBe('error');
      expect(f.track.stop).toHaveBeenCalledOnce();
      expect(f.video.srcObject).toBeNull();
      f.camera.dispose();
    }
  });
  it('la lampe est facultative et son échec ne coupe pas le scanner', async () => {
    const f = fixture();
    await f.camera.start();
    await f.camera.toggleTorch();
    expect(f.track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
    expect(f.views.at(-1)?.lit).toBe(true);
    f.track.applyConstraints.mockRejectedValue(new Error());
    await f.camera.toggleTorch();
    expect(f.views.at(-1)).toMatchObject({ status: 'running', torch: false });
    expect(f.track.stop).not.toHaveBeenCalled();
    f.camera.dispose();
  });
  it('une API de capacités absente ou défaillante ne bloque pas les lectures', async () => {
    const f = fixture();
    vi.spyOn(f.track, 'getCapabilities').mockImplementation(() => {
      throw new Error();
    });
    await f.camera.start();
    vi.advanceTimersByTime(450);
    expect(f.onCode).toHaveBeenCalledOnce();
    expect(f.views.at(-1)).toMatchObject({ status: 'running', torch: false });
    f.camera.dispose();
  });
});
