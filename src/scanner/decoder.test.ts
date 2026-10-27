import { afterEach, expect, it, vi } from 'vitest';
import { createDecoder } from './decoder';

// Deterministic raster fixtures, encoded independently of ZXing (EAN left/right parity).
const left = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const parity = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];
const invert = (bits: string) => bits.replace(/[01]/g, (bit) => (bit === '1' ? '0' : '1'));
function raster(code: string) {
  const ean = code.length === 12 ? `0${code}` : code;
  const short = ean.length === 8;
  const half = short ? 4 : 6;
  const first = short ? ean.slice(0, 4) : ean.slice(1, 7);
  const sequence = short ? 'LLLL' : parity[Number(ean[0])];
  const l = [...first]
    .map((digit, i) => {
      const bits = left[Number(digit)];
      return sequence[i] === 'L' ? bits : invert([...bits].reverse().join(''));
    })
    .join('');
  const r = [...ean.slice(-half)].map((digit) => invert(left[Number(digit)])).join('');
  return `000000000000101${l}01010${r}101000000000000`;
}
afterEach(() => vi.unstubAllGlobals());
it.each(['4006381333931', '96385074', '036000291452', '0036000291452'])(
  'décode réellement un raster synthétique %s avec le lecteur livré',
  (code) => {
    const bits = raster(code);
    const canvas = { width: 0, height: 0, getContext: () => context };
    const context = {
      drawImage: vi.fn(),
      getImageData: () => {
        const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        for (let y = 0; y < canvas.height; y++)
          for (let x = 0; x < canvas.width; x++) {
            const value = bits[Math.floor((x * bits.length) / canvas.width)] === '1' ? 0 : 255;
            const offset = (y * canvas.width + x) * 4;
            data.set([value, value, value, 255], offset);
          }
        return { data };
      },
    };
    vi.stubGlobal('document', { createElement: () => canvas });
    const decoder = createDecoder();
    const video = {
      videoWidth: 1280,
      videoHeight: 720,
      clientWidth: 320,
      clientHeight: 180,
    } as HTMLVideoElement;
    const result = decoder.read(video);
    // UPC-A uses its equivalent EAN-13 representation; an existing leading zero is never stripped.
    expect(result).toBe(code.length === 12 ? `0${code}` : code);
    expect(context.drawImage).toHaveBeenCalledWith(video, 64, 180, 1152, 360, 0, 0, 960, 300);
    expect(canvas.width).toBe(960);
    decoder.dispose();
    expect(canvas.width + canvas.height).toBe(0);
  },
);
