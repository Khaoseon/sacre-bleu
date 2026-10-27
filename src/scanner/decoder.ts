import { BrowserMultiFormatOneDReader } from '@zxing/browser';
import {
  BarcodeFormat,
  ChecksumException,
  DecodeHintType,
  FormatException,
  NotFoundException,
} from '@zxing/library';

/** Loaded only after an explicit camera request. No images leave the browser. */
export function createDecoder() {
  const reader = new BrowserMultiFormatOneDReader(
    new Map([
      [
        DecodeHintType.POSSIBLE_FORMATS,
        // UPC-A has the same bars as zero-prefixed EAN-13. Keep that zero instead
        // of letting ZXing strip it; catalogue lookup also accepts the 12-digit alias.
        [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8],
      ],
    ]),
  );
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas indisponible.');
  return {
    read(video: HTMLVideoElement): string | null {
      // Decode the same central strip shown by the viewfinder, with bounded work per frame.
      const width = video.videoWidth;
      const height = video.videoHeight;
      const cropHeight = Math.min(height, width * 0.55);
      canvas.width = Math.min(width, 960);
      canvas.height = Math.round((cropHeight * canvas.width) / width);
      context.drawImage(
        video,
        0,
        (height - cropHeight) / 2,
        width,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      try {
        return reader.decodeFromCanvas(canvas).getText();
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof ChecksumException ||
          error instanceof FormatException
        )
          return null;
        throw error;
      }
    },
    dispose() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
