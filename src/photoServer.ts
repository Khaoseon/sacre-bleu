import jpeg from 'jpeg-js';

/** Server boundary: never trust MIME, dimensions or client re-encoding. */
export function sanitizePhoto(input: Uint8Array) {
  if (input.length < 100 || input.length > 500_000 || input[0] !== 255 || input[1] !== 216)
    throw new Error('Invalid photo');
  const decoded = jpeg.decode(input, {
    useTArray: true,
    tolerantDecoding: false,
    maxResolutionInMP: 1.05,
    maxMemoryUsageInMB: 32,
  });
  if (decoded.width > 1024 || decoded.height > 1024) throw new Error('Invalid dimensions');
  // Deliberately pass pixels only: no EXIF/GPS, comments or source profiles.
  for (const quality of [80, 65, 45]) {
    const output = jpeg.encode(
      { data: decoded.data, width: decoded.width, height: decoded.height },
      quality,
    ).data;
    if (output.length <= 500_000)
      return { bytes: new Uint8Array(output), width: decoded.width, height: decoded.height };
  }
  throw new Error('Photo too large');
}
