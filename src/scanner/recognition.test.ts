import { describe, expect, it } from 'vitest';
import {
  barcodeIdentity,
  findProductByBarcode,
  ScanRecognition,
  validCameraBarcode,
} from '../model';
import { demo } from '../demo';

const a = '4006381333931';
const b = '96385074';
function present(filter: ScanRecognition, code = a, time = 0) {
  return [0, 150, 300].map((offset) => filter.observe(code, time + offset));
}
describe('validation caméra', () => {
  it.each([a, b, '036000291452', '0036000291452', '00012345600012'.slice(1)])(
    'valide la clé et conserve la chaîne %s',
    (code) => {
      expect(validCameraBarcode(code)).toBe(true);
    },
  );
  it.each([
    '',
    '00000000',
    '000000000000',
    '4006381333932',
    '96385075',
    '036000291453',
    '1234',
    ' 96385074',
    '9638507a',
    '12345678901234',
  ])('rejette %s', (code) => {
    expect(validCameraBarcode(code)).toBe(false);
  });
  it('retrouve UPC-A et EAN-13 équivalents sans réécrire les zéros du catalogue', () => {
    const product = { ...demo().products[0], barcode: '0036000291452' };
    expect(findProductByBarcode([product], '036000291452')).toBe(product);
    expect(product.barcode).toBe('0036000291452');
    expect(barcodeIdentity('0036000291452')).toBe('0036000291452');
    const exact = { ...product, id: 'exact', barcode: '036000291452' };
    expect(findProductByBarcode([product, exact], exact.barcode)).toBe(exact);
    expect(findProductByBarcode([product], '36000291452')).toBeUndefined();
  });
});
describe('une présentation = une intention', () => {
  it('attend trois lectures concordantes espacées et bloque un code immobile sans expiration', () => {
    const filter = new ScanRecognition();
    expect(present(filter)).toEqual([null, null, a]);
    for (let time = 450; time < 30000; time += 150) expect(filter.observe(a, time)).toBeNull();
  });
  it('ignore les lectures isolées, instables, trop rapprochées ou séparées de plus de 500 ms', () => {
    const filter = new ScanRecognition();
    expect(filter.observe(a, 0)).toBeNull();
    expect(filter.observe(b, 150)).toBeNull();
    expect(filter.observe(a, 300)).toBeNull();
    expect(filter.observe(a, 301)).toBeNull();
    expect(filter.observe(a, 302)).toBeNull();
    expect(filter.observe(a, 1000)).toBeNull();
    expect(filter.observe(a, 1150)).toBeNull();
    expect(filter.observe(a, 1300)).toBe(a);
  });
  it('reconnaît A puis B puis A sans attendre un délai global', () => {
    const filter = new ScanRecognition();
    expect(present(filter).at(-1)).toBe(a);
    expect(present(filter, b, 450).at(-1)).toBe(b);
    expect(present(filter, a, 900).at(-1)).toBe(a);
  });
  it('réarme le même produit après une absence réellement observée sur plusieurs images', () => {
    const filter = new ScanRecognition();
    present(filter);
    filter.observe(null, 450);
    filter.observe(null, 600);
    expect(filter.observe(a, 750)).toBeNull();
    for (let time = 900; time <= 1950; time += 150) filter.observe(null, time);
    expect(present(filter, a, 2100).at(-1)).toBe(a);
  });
  it('une longue pause sans images, une erreur de format ou un changement de mode ne réarment pas', () => {
    const filter = new ScanRecognition();
    present(filter);
    filter.observe(null, 450);
    filter.suspend();
    filter.observe('4006381333932', 12000);
    expect(present(filter, a, 15000)).toEqual([null, null, null]);
    expect(filter.observe(null, 16000)).toBeNull();
    expect(present(filter, a, 20000)).toEqual([null, null, null]);
  });
  it('une répétition explicite ou manuelle conserve le verrou caméra', () => {
    const filter = new ScanRecognition();
    filter.hold(a); // An explicit repeat creates its own business intention, outside observe().
    expect(present(filter)).toEqual([null, null, null]);
    filter.hold('036000291452');
    expect(present(filter, '0036000291452', 1000)).toEqual([null, null, null]);
  });
  it('une pause avant confirmation oblige à recommencer la stabilisation', () => {
    const filter = new ScanRecognition();
    filter.observe(a, 0);
    filter.observe(a, 150);
    filter.suspend();
    expect(present(filter, a, 300)).toEqual([null, null, a]);
  });
});
