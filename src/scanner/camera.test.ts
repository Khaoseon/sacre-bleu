import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScanRecognition } from '../model';
import {
  bindCameraLifecycle,
  CameraSession,
  preferredCamera,
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
    getCapabilities: vi
      .fn<() => MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] }>()
      .mockReturnValue({ torch: true }),
    getSettings: vi.fn().mockReturnValue({ deviceId: 'rear-0' }),
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
  const devices = vi.fn().mockResolvedValue([]);
  const runtime: CameraRuntime = {
    secure: () => true,
    getMedia,
    loadDecoder,
    later: (callback, delay) => setTimeout(callback, delay),
    cancel: clearTimeout,
    now: Date.now,
    devices,
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
    devices,
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
  it('retrouve après rechargement le choix mémorisé même si son identifiant a changé', async () => {
    const f = fixture();
    f.runtime.readChoice = () => ({ id: 'old-id', label: 'Back camera' });
    f.devices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'rear-0', label: 'Back camera' },
      { kind: 'videoinput', deviceId: 'auto', label: 'camera 0, facing back' },
    ]);
    await f.camera.start();
    expect(f.getMedia).toHaveBeenCalledOnce();
    expect(f.views.at(-1)?.cameraId).toBe('rear-0');
    f.camera.dispose();
  });
  it('sauvegarde le choix manuel et permet de revenir à Automatique', async () => {
    const f = fixture();
    const save = vi.fn();
    f.runtime.saveChoice = save;
    f.devices.mockResolvedValue([{ kind: 'videoinput', deviceId: 'rear-0', label: 'Back' }]);
    await f.camera.start();
    await f.camera.selectCamera('rear-0');
    expect(save).toHaveBeenLastCalledWith({ id: 'rear-0', label: 'Back' });
    await f.camera.selectCamera('');
    expect(save).toHaveBeenLastCalledWith(null);
    f.camera.dispose();
  });
  it('conserve le flux et le choix précédent si la mémorisation échoue', async () => {
    const f = fixture();
    f.runtime.saveChoice = () => {
      throw new Error('quota');
    };
    f.devices.mockResolvedValue([{ kind: 'videoinput', deviceId: 'rear-0', label: 'Back' }]);
    await f.camera.start();
    await f.camera.selectCamera('rear-0');
    expect(f.getMedia).toHaveBeenCalledOnce();
    expect(f.track.stop).not.toHaveBeenCalled();
    expect(f.views.at(-1)?.error).toContain('Impossible de mémoriser');
    f.camera.dispose();
  });
  it.each([
    'camera 0, facing back',
    'Double caméra grand angle arrière',
    'Double camera grand angle arriere',
    'Back Dual Wide Camera',
  ])('privilégie le nom validé %s sans dépendre de son indice dans la liste', (label) => {
    expect(
      preferredCamera([
        { id: 'front', label: 'Front camera' },
        { id: 'tele', label: 'Téléobjectif arrière' },
        { id: 'preferred', label },
      ]),
    ).toBe('preferred');
    expect(preferredCamera([{ id: 'unknown', label: 'Caméra 1' }])).toBeUndefined();
  });
  it('choisit l’objectif validé avant tout décodage, ferme le flux provisoire et garde le choix à la reprise', async () => {
    const f = fixture();
    f.devices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'rear-0', label: 'Back camera' },
      { kind: 'videoinput', deviceId: 'preferred', label: 'Double caméra grand angle arrière' },
    ]);
    const preferredTrack = Object.assign(new EventTarget(), {
      readyState: 'live',
      stop: vi.fn(),
      getSettings: () => ({ deviceId: 'preferred' }),
    });
    const preferredStream = {
      getTracks: () => [preferredTrack],
      getVideoTracks: () => [preferredTrack],
    } as unknown as MediaStream;
    f.getMedia.mockResolvedValueOnce(f.stream).mockImplementation(async () => {
      expect(f.track.stop).toHaveBeenCalledOnce();
      expect(f.decoder.read).not.toHaveBeenCalled();
      return preferredStream;
    });
    await f.camera.start();
    expect(f.getMedia).toHaveBeenCalledTimes(2);
    expect(f.getMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ deviceId: { exact: 'preferred' } }),
      }),
    );
    expect(f.video.srcObject).toBe(preferredStream);
    expect(f.views.at(-1)).toMatchObject({ status: 'running', cameraId: 'preferred' });
    vi.advanceTimersByTime(450);
    expect(f.onCode).toHaveBeenCalledOnce();
    f.getMedia.mockResolvedValue(preferredStream);
    f.camera.stop('paused');
    await f.camera.start();
    vi.advanceTimersByTime(450);
    expect(f.onCode).toHaveBeenCalledOnce();
    f.camera.dispose();
  });
  it('ne rouvre pas une caméra déjà sélectionnée par le navigateur et respecte le choix manuel', async () => {
    const f = fixture();
    f.devices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'rear-0', label: 'camera 0, facing back' },
      { kind: 'videoinput', deviceId: 'other', label: 'Back camera' },
    ]);
    await f.camera.start();
    expect(f.getMedia).toHaveBeenCalledOnce();
    await f.camera.selectCamera('other');
    expect(f.getMedia).toHaveBeenCalledTimes(2);
    expect(f.getMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ deviceId: { exact: 'other' } }),
      }),
    );
    f.camera.dispose();
  });
  it('revient au choix arrière du navigateur si l’objectif préféré échoue, sans boucle', async () => {
    const f = fixture();
    f.devices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'preferred', label: 'Double caméra grand angle arrière' },
    ]);
    f.getMedia
      .mockResolvedValueOnce(f.stream)
      .mockRejectedValueOnce({ name: 'OverconstrainedError' })
      .mockResolvedValue(f.stream);
    await f.camera.start();
    expect(f.getMedia).toHaveBeenCalledTimes(3);
    expect(f.getMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
      }),
    );
    expect(f.views.at(-1)?.status).toBe('running');
    f.camera.dispose();
  });
  it('ne réessaie pas automatiquement une permission refusée sur l’objectif préféré', async () => {
    const f = fixture();
    f.devices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'preferred', label: 'camera 0, facing back' },
    ]);
    f.getMedia.mockResolvedValueOnce(f.stream).mockRejectedValueOnce({ name: 'NotAllowedError' });
    await f.camera.start();
    expect(f.getMedia).toHaveBeenCalledTimes(2);
    expect(f.loadDecoder).not.toHaveBeenCalled();
    expect(f.views.at(-1)?.status).toBe('error');
    f.camera.dispose();
  });
  it('demande une meilleure définition sans minimum strict et active la mise au point continue seulement si annoncée', async () => {
    const f = fixture();
    f.track.getCapabilities.mockReturnValue({ torch: true, focusMode: ['manual', 'continuous'] });
    await f.camera.start();
    expect(f.getMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    expect(f.track.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ focusMode: 'continuous' }],
    });
    await f.camera.toggleTorch();
    expect(f.track.applyConstraints).toHaveBeenLastCalledWith({
      advanced: [{ torch: true, focusMode: 'continuous' }],
    });
    vi.advanceTimersByTime(450);
    expect(f.onCode).toHaveBeenCalledOnce();
    f.camera.dispose();
  });
  it('conserve les lectures si le réglage autofocus est refusé', async () => {
    const f = fixture();
    f.track.getCapabilities.mockReturnValue({ focusMode: ['continuous'] });
    f.track.applyConstraints.mockRejectedValue(new Error('Option unsupported'));
    await f.camera.start();
    vi.advanceTimersByTime(450);
    expect(f.views.at(-1)?.status).toBe('running');
    expect(f.onCode).toHaveBeenCalledOnce();
    f.camera.dispose();
  });
  it('n’impose pas l’autofocus si le navigateur ne l’annonce pas', async () => {
    const f = fixture();
    f.track.getCapabilities.mockReturnValue({ focusMode: ['none'] });
    await f.camera.start();
    expect(f.track.applyConstraints).not.toHaveBeenCalled();
    expect(f.views.at(-1)?.status).toBe('running');
    f.camera.dispose();
  });
  it('annule un démarrage pendant le réglage de mise au point sans ressusciter le flux', async () => {
    const f = fixture();
    const focus = deferred<void>();
    f.track.getCapabilities.mockReturnValue({ focusMode: ['continuous'] });
    f.track.applyConstraints.mockReturnValue(focus.promise);
    const opening = f.camera.start();
    await Promise.resolve();
    f.camera.stop();
    focus.resolve();
    await opening;
    expect(f.track.stop).toHaveBeenCalledOnce();
    expect(f.loadDecoder).not.toHaveBeenCalled();
    expect(f.video.srcObject).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    f.camera.dispose();
  });
  it('ne liste les caméras qu’après permission et exclut microphones et identifiants vides', async () => {
    const f = fixture();
    const permission = deferred<MediaStream>();
    f.getMedia.mockReturnValueOnce(permission.promise);
    f.devices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'rear-0', label: 'Back camera' },
      { kind: 'videoinput', deviceId: 'rear-1', label: '' },
      { kind: 'videoinput', deviceId: '', label: '' },
      { kind: 'audioinput', deviceId: 'mic', label: 'Microphone' },
    ]);
    const opening = f.camera.start();
    expect(f.devices).not.toHaveBeenCalled();
    permission.resolve(f.stream);
    await opening;
    expect(f.views.at(-1)).toMatchObject({
      cameraId: 'rear-0',
      cameras: [
        { id: 'rear-0', label: 'Back camera' },
        { id: 'rear-1', label: 'Caméra 2' },
      ],
    });
    f.camera.dispose();
  });
  it('un échec de liste des objectifs ne bloque pas le lecteur', async () => {
    const f = fixture();
    f.devices.mockRejectedValue(new Error());
    await f.camera.start();
    vi.advanceTimersByTime(450);
    expect(f.onCode).toHaveBeenCalledOnce();
    expect(f.views.at(-1)).toMatchObject({ status: 'running', cameras: [] });
    f.camera.dispose();
  });
  it('change d’objectif en fermant le premier flux et conserve le verrou anti-doublon, puis reprend le même choix', async () => {
    const f = fixture();
    f.devices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'rear-0', label: 'Back' },
      { kind: 'videoinput', deviceId: 'rear-1', label: 'Back 1' },
    ]);
    await f.camera.start();
    vi.advanceTimersByTime(450);
    expect(f.onCode).toHaveBeenCalledOnce();
    await f.camera.selectCamera('not-listed');
    expect(f.getMedia).toHaveBeenCalledOnce();
    const nextTrack = Object.assign(new EventTarget(), {
      readyState: 'live',
      stop: vi.fn(),
      getCapabilities: () => ({}),
      getSettings: () => ({ deviceId: 'rear-1' }),
    });
    const nextStream = {
      getTracks: () => [nextTrack],
      getVideoTracks: () => [nextTrack],
    } as unknown as MediaStream;
    f.getMedia.mockResolvedValue(nextStream);
    await f.camera.selectCamera('rear-1');
    expect(f.track.stop).toHaveBeenCalledOnce();
    expect(f.getMedia).toHaveBeenLastCalledWith({
      audio: false,
      video: { deviceId: { exact: 'rear-1' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    expect(f.video.srcObject).toBe(nextStream);
    expect(f.views.at(-1)?.cameraId).toBe('rear-1');
    vi.advanceTimersByTime(1500);
    expect(f.onCode).toHaveBeenCalledOnce();
    f.camera.stop('paused');
    await f.camera.start();
    expect(f.getMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({ deviceId: { exact: 'rear-1' } }),
      }),
    );
    f.camera.dispose();
  });
  it('ignore les listes tardives d’un flux fermé', async () => {
    const f = fixture();
    const inventory = deferred<[]>();
    f.devices.mockReturnValueOnce(inventory.promise);
    const opening = f.camera.start();
    await Promise.resolve();
    f.camera.stop();
    const count = f.views.length;
    inventory.resolve([]);
    await opening;
    expect(f.views.length).toBe(count);
    f.camera.dispose();
  });
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
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(f.loadDecoder).toHaveBeenCalledOnce();
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
