import { describe, expect, it } from 'vitest';
import { viewfinderCrop } from './viewfinder';

describe('aperçu caméra rempli et cadre réellement analysé', () => {
  it('recadre un flux portrait sans bandes noires dans un aperçu horizontal', () => {
    expect(viewfinderCrop(720, 1280, 320, 200)).toEqual({
      x: 36,
      y: 527.5,
      width: 648,
      height: 225,
      canvasWidth: 648,
      canvasHeight: 225,
    });
  });
  it.each([
    [720, 1280, 320, 200],
    [1920, 1080, 320, 200],
    [720, 720, 390, 240],
    [1280, 720, 640, 300],
    [1080, 1920, 300, 340],
  ])('projette le crop sur le cadre visible, source %sx%s, aperçu %sx%s', (vw, vh, pw, ph) => {
    const crop = viewfinderCrop(vw, vh, pw, ph)!;
    // Independent forward projection of object-fit: cover, including the hidden overflow.
    const scale = Math.max(pw / vw, ph / vh);
    const offsetX = (pw - vw * scale) / 2;
    const offsetY = (ph - vh * scale) / 2;
    expect(crop.x * scale + offsetX).toBeCloseTo(pw * 0.05);
    expect(crop.y * scale + offsetY).toBeCloseTo(ph * 0.25);
    expect(crop.width * scale).toBeCloseTo(pw * 0.9);
    expect(crop.height * scale).toBeCloseTo(ph * 0.5);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(vw);
    expect(crop.y + crop.height).toBeLessThanOrEqual(vh);
    expect(crop.canvasWidth).toBeLessThanOrEqual(960);
    expect(
      Math.abs(crop.canvasHeight - (crop.height * crop.canvasWidth) / crop.width),
    ).toBeLessThanOrEqual(0.5);
  });
  it('recalcule la zone après rotation sans conserver le crop précédent', () => {
    const portrait = viewfinderCrop(720, 1280, 320, 200)!;
    const landscape = viewfinderCrop(1280, 720, 640, 200)!;
    expect(landscape).not.toEqual(portrait);
    expect(landscape).toMatchObject({ x: 64, y: 260, width: 1152, height: 200 });
  });
  it.each([
    [0, 720, 320, 200],
    [720, 0, 320, 200],
    [720, 1280, 0, 200],
    [720, 1280, 320, 0],
    [NaN, 720, 320, 200],
    [720, Infinity, 320, 200],
  ])('ignore les dimensions indisponibles %j', (...sizes) => {
    expect(viewfinderCrop(sizes[0], sizes[1], sizes[2], sizes[3])).toBeNull();
  });
});
