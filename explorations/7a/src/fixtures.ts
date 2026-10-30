import type { State } from '../../../src/model';
import pasta from '../assets/pasta.png';
import tomato from '../assets/tomato.png';
import oil from '../assets/oil.png';
import chickpea from '../assets/chickpea.png';

export const sampleImages: Record<string, string> = { pasta, tomato, oil, chickpea };
export function fixtures(): State {
  const updatedAt = '2026-10-30T12:00:00.000Z';
  return {
    version: 1,
    revision: 0,
    sort: 'name',
    products: [
      {
        id: 'pasta',
        name: 'Rigatoni',
        brand: 'Maison Bleue',
        category: 'Féculents',
        size: 500,
        unit: 'g',
        quantity: 4,
        minimum: 2,
        barcode: '8076802085738',
        updatedAt,
      },
      {
        id: 'tomato',
        name: 'Tomates en purée',
        brand: 'Les Beaux Jours',
        category: 'Conserves',
        size: 400,
        unit: 'g',
        quantity: 1,
        minimum: 2,
        updatedAt,
      },
      {
        id: 'chickpea',
        name: 'Pois chiches',
        brand: 'Atelier',
        category: 'Légumineuses',
        size: 400,
        unit: 'g',
        quantity: 3,
        minimum: 1,
        updatedAt,
      },
      {
        id: 'oil',
        name: 'Huile d’olive',
        brand: 'Soléa',
        category: 'Épicerie',
        size: 750,
        unit: 'ml',
        quantity: 2,
        minimum: 1,
        updatedAt,
      },
      {
        id: 'rice',
        name: 'Riz basmati',
        category: 'Féculents',
        size: 1,
        unit: 'kg',
        quantity: 0,
        minimum: 1,
        updatedAt,
      },
    ],
    shopping: [
      { id: 's1', name: 'Tomates en purée', productId: 'tomato', quantity: 2, checked: false },
      { id: 's2', name: 'Riz basmati', productId: 'rice', quantity: 1, checked: false },
      { id: 's3', name: 'Pain au levain', quantity: 1, checked: false },
    ],
  };
}
