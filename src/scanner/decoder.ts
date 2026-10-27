import { BrowserMultiFormatOneDReader } from '@zxing/browser';
import {
  BarcodeFormat,
  ChecksumException,
  DecodeHintType,
  FormatException,
  NotFoundException,
} from '@zxing/library';
import { viewfinderCrop } from './viewfinder';

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
      const crop = viewfinderCrop(
        video.videoWidth,
        video.videoHeight,
        video.clientWidth,
        video.clientHeight,
      );
      if (!crop) return null;
      canvas.width = crop.canvasWidth;
      canvas.height = crop.canvasHeight;
      context.drawImage(
        video,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
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
