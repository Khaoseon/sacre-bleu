/** Private upload bodies are tab memory only, never the recovery journal. */
const drafts = new Map<string, Uint8Array>();
const generations = new Map<string, object>();
const scope = (account: string, reserve: string) => `${account}:${reserve}:`;
export async function stagePhoto(account: string, reserve: string, dataUrl: string) {
  const key = scope(account, reserve);
  const generation = {};
  generations.set(key, generation);
  if (!dataUrl.startsWith('data:image/jpeg;base64,'))
    throw new Error('Impossible de lire cette image.');
  const raw = atob(dataUrl.slice('data:image/jpeg;base64,'.length));
  if (raw.length > 500_000) throw new Error('Impossible de lire cette image.');
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  if (generations.get(key) !== generation) throw new Error('Impossible de lire cette image.');
  for (const entry of drafts.keys()) if (entry.startsWith(key)) drafts.delete(entry);
  drafts.set(scope(account, reserve) + hash, bytes);
  return hash;
}
export function photoDraft(account: string, reserve: string, hash: string) {
  return drafts.get(scope(account, reserve) + hash);
}
export function clearPhotoDrafts(account: string, reserve: string) {
  generations.delete(scope(account, reserve));
  for (const key of drafts.keys()) if (key.startsWith(scope(account, reserve))) drafts.delete(key);
}

/** Browser convenience only; the processor independently decodes and re-encodes. */
export async function preparePhoto(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    /\.(heic|heif)$/i.test(file.name)
  )
    throw new Error('Format non pris en charge. Convertissez la photo en JPG, PNG ou WebP.');
  if (!file.size || file.size > 20_000_000)
    throw new Error('Choisissez une photo de moins de 20 Mo et 50 mégapixels.');
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    if (bitmap.width * bitmap.height > 50_000_000)
      throw new Error('Choisissez une photo de moins de 20 Mo et 50 mégapixels.');
    const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error();
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.45]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.startsWith('data:image/jpeg;base64,') && atob(data.split(',')[1]).length <= 500000)
        return data;
    }
    throw new Error();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Choisissez une photo de moins de 20 Mo et 50 mégapixels.'
    )
      throw error;
    throw new Error('Impossible de lire cette image.');
  } finally {
    bitmap?.close();
  }
}
