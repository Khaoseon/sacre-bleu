import { afterEach, describe, expect, it, vi } from 'vitest';
import { CAMERA_KEY, readCameraChoice, saveCameraChoice } from './preference';
afterEach(() => vi.unstubAllGlobals());
describe('préférence caméra locale', () => {
  it('conserve le choix entre deux lectures sans toucher aux autres données', () => {
    const values = new Map([['stock', 'intact']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    const choice = { id: 'rear', label: 'Back camera' };
    saveCameraChoice(choice);
    expect(readCameraChoice()).toEqual(choice);
    saveCameraChoice(null);
    expect(values.has(CAMERA_KEY)).toBe(false);
    expect(values.get('stock')).toBe('intact');
  });
  it.each(['invalid', '{}', '{"id":7,"label":"camera"}', '{"id":"","label":"camera"}'])(
    'ignore une préférence invalide : %s',
    (raw) => {
      vi.stubGlobal('localStorage', { getItem: () => raw });
      expect(readCameraChoice()).toBeNull();
    },
  );
  it('signale un stockage bloqué sans annoncer de mémorisation', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readCameraChoice()).toBeNull();
    expect(() => saveCameraChoice({ id: 'rear', label: 'Back' })).toThrow('blocked');
  });
});
