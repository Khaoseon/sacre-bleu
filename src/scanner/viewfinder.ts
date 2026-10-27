/** Shared by the overlay and decoder so the visible frame is the actual scan region. */
export const VIEWFINDER = { width: 0.9, height: 0.5 } as const;

/** Map the centered object-fit: cover preview back to camera pixels, without stretching. */
export function viewfinderCrop(
  videoWidth: number,
  videoHeight: number,
  previewWidth: number,
  previewHeight: number,
) {
  if (
    ![videoWidth, videoHeight, previewWidth, previewHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  )
    return null;
  const scale = Math.max(previewWidth / videoWidth, previewHeight / videoHeight);
  const width = (previewWidth * VIEWFINDER.width) / scale;
  const height = (previewHeight * VIEWFINDER.height) / scale;
  const canvasWidth = Math.min(960, Math.round(width));
  return {
    x: (videoWidth - width) / 2,
    y: (videoHeight - height) / 2,
    width,
    height,
    canvasWidth,
    canvasHeight: Math.max(1, Math.round((height * canvasWidth) / width)),
  };
}
