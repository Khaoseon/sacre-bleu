import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { imageUrl, parseLookupResult, parseOffProduct, parsePackage } from './productInfo';
import { ProductForm, ProductImage } from './components';
import { demo } from './demo';
import { parseState } from './storage';

const code = '3017620422003';
export const publicImage =
  'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.1.400.jpg';
export const offFixture = {
  status: 'success',
  product: {
    code,
    product_name_fr: 'Pâte à tartiner',
    product_name: 'Spread',
    brands: 'Marque exemple',
    quantity: '6 × 125 g',
    image_front_url: publicImage,
  },
};

describe('metadata supplied by Open Food Facts', () => {
  it('selects French, the brand, one multipack weight and a public image', () => {
    expect(parseOffProduct(offFixture, code)).toEqual({
      status: 'found',
      product: {
        name: 'Pâte à tartiner',
        brand: 'Marque exemple',
        size: 750,
        unit: 'g',
        packageText: '6 × 125 g',
        category: undefined,
        external: { provider: 'open-food-facts', barcode: code, imageUrl: publicImage },
      },
    });
  });
  it('keeps incomplete products editable and uses another language when necessary', () => {
    expect(parseOffProduct({ status: 'success', product: { code } }, code)).toMatchObject({
      status: 'found',
      product: { name: undefined, external: { imageUrl: undefined } },
    });
    expect(
      parseOffProduct({ status: 'success', product: { code, product_name: 'Haferflocken' } }, code),
    ).toMatchObject({ product: { name: 'Haferflocken' } });
  });
  it('preserves leading zeros and permits only the established UPC/EAN equivalence', () => {
    expect(
      parseOffProduct({ status: 'success', product: { code: '0036000291452' } }, '036000291452'),
    ).toMatchObject({ product: { external: { barcode: '036000291452' } } });
    expect(parseOffProduct(offFixture, '7612345678900').status).toBe('unavailable');
  });
  it.each([
    null,
    [],
    {},
    { status: 'failure' },
    { status: 'success', product: [] },
    { status: 'success', product: { code: 3017620422003 } },
  ])('rejects an invalid envelope %j', (value) => {
    expect(parseOffProduct(value, code)).toEqual({ status: 'unavailable', reason: 'invalid' });
  });
  it('discards overlong or wrongly typed optional fields', () => {
    expect(
      parseOffProduct(
        {
          status: 'success',
          product: {
            code,
            product_name_fr: 42,
            brands: 'x'.repeat(81),
            quantity: [],
            image_front_url: 'javascript:alert(1)',
          },
        },
        code,
      ),
    ).toMatchObject({
      product: { name: undefined, brand: undefined, external: { imageUrl: undefined } },
    });
  });
  it.each([
    ['500 g', { size: 500, unit: 'g' }],
    ['1,5 L', { size: 1.5, unit: 'L' }],
    ['6 x 125g', { size: 750, unit: 'g' }],
    ['6×33cl', { size: 1980, unit: 'ml' }],
    ['250 mg', { size: 0.25, unit: 'g' }],
    ['2 pièces', { size: 2, unit: 'pièce' }],
    ['6 x 125g (750g)', {}],
    ['500 g / 300 g égouttés', {}],
    ['0g', {}],
    ['999999g', {}],
    ['0 x 125g', {}],
    ['1.234 g', {}],
  ])('normalizes only explicit packages: %s', (input, expected) =>
    expect(parsePackage(input)).toEqual(expected),
  );
  it.each([
    'https://evil.test/photo.jpg',
    'https://images.openfoodfacts.org.evil.test/images/products/a.jpg',
    'http://images.openfoodfacts.org/images/products/a.jpg',
    'https://images.openfoodfacts.org/images/products/../a.jpg',
    'https://images.openfoodfacts.org/images/products/a.jpg?redirect=evil',
  ])('rejects unsafe image %s', (input) => expect(imageUrl(input)).toBeUndefined());
  it('validates the normalized frontend response, not only the upstream API', () => {
    const found = parseOffProduct(offFixture, code);
    expect(parseLookupResult(JSON.parse(JSON.stringify(found)), code)).toEqual(found);
    expect(parseLookupResult(found, '00001234').status).toBe('unavailable');
    expect(
      parseLookupResult(
        { status: 'found', product: { external: { provider: 'other', barcode: code } } },
        code,
      ).status,
    ).toBe('unavailable');
  });
  it('renders editable prefilled fields, quantity one and attribution in the existing form', () => {
    const result = parseOffProduct(offFixture, code);
    if (result.status !== 'found') throw new Error();
    const html = renderToStaticMarkup(
      createElement(ProductForm, {
        editor: { barcode: code, fromScan: true, mode: 1, suggestion: result.product },
        onSave: () => true,
        onDelete: () => {},
        close: () => {},
      }),
    );
    expect(html).toContain('value="Pâte à tartiner"');
    expect(html).toContain('value="Marque exemple"');
    expect(html).toContain('value="750"');
    expect(html).toMatch(/name="quantity"[^>]+value="1"/);
    expect(html).toContain('CC BY-SA 3.0');
    expect(html).not.toContain('readonly');
  });
  it('uses a placeholder without a usable image and persists provenance separately from local photos', () => {
    const p = {
      ...demo().products[0],
      external: { provider: 'open-food-facts' as const, barcode: code, imageUrl: publicImage },
    };
    expect(
      renderToStaticMarkup(
        createElement(ProductImage, { product: { ...p, external: undefined, photo: undefined } }),
      ),
    ).not.toContain('<img');
    const stored = parseState(JSON.stringify({ ...demo(), products: [p], shopping: [] }));
    expect(stored.products[0].external).toEqual(p.external);
    expect(() =>
      parseState(
        JSON.stringify({
          ...stored,
          products: [{ ...p, external: { ...p.external, imageUrl: 'https://evil.test/a.jpg' } }],
        }),
      ),
    ).toThrow();
  });
});
