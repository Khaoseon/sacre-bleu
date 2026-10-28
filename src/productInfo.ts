/** Public product metadata only. No inventory, user or storage dependency. */
export interface ExternalReference {
  provider: 'open-food-facts';
  barcode: string;
  imageUrl?: string;
}
export interface ProductSuggestion {
  name?: string;
  brand?: string;
  size?: number;
  unit?: 'g' | 'kg' | 'ml' | 'L' | 'pièce';
  category?: 'Féculents' | 'Conserves' | 'Légumineuses' | 'Épicerie' | 'Autres';
  packageText?: string;
  external: ExternalReference;
}
export type LookupResult =
  | { status: 'found'; product: ProductSuggestion }
  | { status: 'missing' }
  | { status: 'unavailable'; reason: 'network' | 'invalid' | 'rate-limit' | 'disabled' };
export interface ProductProvider {
  lookup(barcode: string, signal: AbortSignal): Promise<LookupResult>;
}
export const isLookupBarcode = (code: string) => /^\d{4,32}$/.test(code);
export const sourceUrl = (code: string) => `https://world.openfoodfacts.org/product/${code}`;
export function imageUrl(value: unknown): string | undefined {
  // Strict allowlist, no credentials, port, query, fragment or redirect service.
  return typeof value === 'string' &&
    value.length <= 512 &&
    /^https:\/\/images\.openfoodfacts\.org\/images\/products\/[a-zA-Z0-9/_.-]+\.(?:jpg|jpeg|png|webp)$/.test(
      value,
    ) &&
    !value.includes('..')
    ? value
    : undefined;
}
export function isExternalReference(value: unknown): value is ExternalReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    r.provider === 'open-food-facts' &&
    typeof r.barcode === 'string' &&
    isLookupBarcode(r.barcode) &&
    (r.imageUrl === undefined || imageUrl(r.imageUrl) === r.imageUrl) &&
    Object.keys(r).every((key) => ['provider', 'barcode', 'imageUrl'].includes(key))
  );
}
export const record = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
const text = (v: unknown, max: number) => {
  if (typeof v !== 'string') return undefined;
  const s = v
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s && s.length <= max ? s : undefined;
};

/** A multipack describes one stock package: 6 × 125 g becomes 750 g, never six stock units. */
export function parsePackage(value: unknown): Pick<ProductSuggestion, 'size' | 'unit'> {
  const s = text(value, 100)?.toLowerCase();
  if (!s) return {};
  const match = s.match(
    /^(?:(\d{1,3})\s*[x×*]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|mg|ml|cl|dl|l|pièces?|pcs?)$/,
  );
  if (!match) return {};
  const count = match[1] ? Number(match[1]) : 1;
  const unit = match[3];
  const factor = unit === 'mg' ? 0.001 : unit === 'cl' ? 10 : unit === 'dl' ? 100 : 1;
  const exactSize = count * Number(match[2].replace(',', '.')) * factor;
  const size = Math.round(exactSize * 100) / 100;
  if (Math.abs(exactSize - size) > 0.0000001) return {};
  if (count < 1 || size < 0.01 || size > 99999) return {};
  return {
    size,
    unit:
      unit === 'l'
        ? 'L'
        : ['mg', 'g'].includes(unit)
          ? 'g'
          : ['ml', 'cl', 'dl'].includes(unit)
            ? 'ml'
            : unit === 'kg'
              ? 'kg'
              : 'pièce',
  };
}

export function parseOffProduct(value: unknown, barcode: string): LookupResult {
  const data = record(value);
  if (!data || !['success', 'success_with_warnings'].includes(String(data.status)))
    return { status: 'unavailable', reason: 'invalid' };
  const p = record(data.product);
  if (
    !p ||
    typeof p.code !== 'string' ||
    // OFF normalizes UPC-A to EAN-13. Preserve the caller's original string.
    (p.code !== barcode &&
      !(barcode.length === 12 && p.code === `0${barcode}`) &&
      !(barcode.length === 13 && barcode.startsWith('0') && p.code === barcode.slice(1)))
  )
    return { status: 'unavailable', reason: 'invalid' };
  const packageText = text(p.quantity, 100);
  // Taxonomy identifiers are used, never arbitrary substring/name matching.
  const tags = Array.isArray(p.categories_tags) ? p.categories_tags : [];
  const category = tags.includes('en:canned-foods')
    ? 'Conserves'
    : tags.includes('en:legumes')
      ? 'Légumineuses'
      : tags.some((t) => ['en:pastas', 'en:rices', 'en:cereals'].includes(String(t)))
        ? 'Féculents'
        : undefined;
  return {
    status: 'found',
    product: {
      name: text(p.product_name_fr, 120) ?? text(p.product_name, 120),
      brand: text(p.brands, 80),
      ...parsePackage(packageText),
      packageText,
      category,
      external: { provider: 'open-food-facts', barcode, imageUrl: imageUrl(p.image_front_url) },
    },
  };
}

/** Validate the normalized Edge response again at the browser trust boundary. */
export function parseLookupResult(value: unknown, barcode: string): LookupResult {
  const r = record(value);
  if (r?.status === 'missing') return { status: 'missing' };
  if (
    r?.status === 'unavailable' &&
    ['network', 'invalid', 'rate-limit', 'disabled'].includes(String(r.reason))
  )
    return {
      status: 'unavailable',
      reason: r.reason as Extract<LookupResult, { status: 'unavailable' }>['reason'],
    };
  const p = record(r?.product);
  if (
    r?.status !== 'found' ||
    !p ||
    !isExternalReference(p.external) ||
    p.external.barcode !== barcode
  )
    return { status: 'unavailable', reason: 'invalid' };
  return {
    status: 'found',
    product: {
      name: text(p.name, 120),
      brand: text(p.brand, 80),
      ...parsePackage(typeof p.size === 'number' ? `${p.size} ${String(p.unit)}` : undefined),
      packageText: text(p.packageText, 100),
      category: ['Féculents', 'Conserves', 'Légumineuses', 'Épicerie', 'Autres'].includes(
        String(p.category),
      )
        ? (p.category as ProductSuggestion['category'])
        : undefined,
      external: p.external,
    },
  };
}
