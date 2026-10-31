import type { State } from '../../../src/model';
import pasta from '../assets/pasta.png';
import tomato from '../assets/tomato.png';
import oil from '../assets/oil.png';
import chickpea from '../assets/chickpea.png';
import spread from '../assets/reality/3017620422003.jpg';
import cola from '../assets/reality/5449000000996.jpg';
import personal from '../assets/reality/personal-lentils.png';

export const sampleImages: Record<string, string> = {
  pasta,
  tomato,
  oil,
  chickpea,
  spread,
  cola,
  crop: spread,
  personal,
  long: pasta,
};
export const imageConditions: Record<string, string> = {
  crop: 'poor-crop',
  cola: 'low-resolution',
  personal: 'personal-photo',
};
export const offCredits: Record<string, { code: string; author: string }> = {
  spread: { code: '3017620422003', author: 'org-ferrero-france-commerciale' },
  crop: { code: '3017620422003', author: 'org-ferrero-france-commerciale' },
  cola: { code: '5449000000996', author: 'zeynepozturk11' },
};
export function realityFixtures(): State {
  const state = fixtures();
  const updatedAt = '2026-10-30T12:00:00.000Z';
  return {
    ...state,
    products: [
      {
        id: 'spread',
        name: 'Nutella',
        brand: 'Ferrero',
        category: 'Épicerie',
        size: 400,
        unit: 'g',
        quantity: 1,
        minimum: 2,
        updatedAt,
      },
      {
        id: 'cola',
        name: 'Coca-Cola Original',
        category: 'Épicerie',
        size: 330,
        unit: 'ml',
        quantity: 2,
        updatedAt,
      },
      { id: 'crop', name: 'Cadrage difficile', category: 'Autres', quantity: 1, updatedAt },
      {
        id: 'personal',
        name: 'Lentilles du placard',
        category: 'Légumineuses',
        quantity: 2,
        updatedAt,
      },
      ...state.products,
      {
        id: 'long',
        name: 'Rigatoni au blé dur complet, fabrication artisanale et séchage lent — grand format familial',
        brand: 'Maison Bleue',
        category: 'Féculents',
        size: 1500,
        unit: 'g',
        quantity: 9999,
        updatedAt,
      },
      { id: 'salt', name: 'Sel de mer', category: 'Épicerie', quantity: 0, updatedAt },
      {
        id: 'broken',
        name: 'Image indisponible',
        category: 'Autres',
        quantity: 0,
        minimum: 1,
        photo: '/missing-test-image.jpg',
        updatedAt,
      },
    ],
  };
}
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

/** Public/synthetic catalogue only; deterministic, bounded, never persisted. */
export function largeFixtures(count: number): State {
  const base = fixtures(),
    size = Math.max(5, Math.min(1000, Number.isFinite(count) ? Math.floor(count) : 5));
  return {
    ...base,
    shopping: [],
    products: Array.from({ length: size }, (_, i) => {
      const p = base.products[i % base.products.length];
      if (i >= 5 && sampleImages[p.id]) sampleImages[`sample-${i}`] = sampleImages[p.id];
      return {
        ...p,
        id: i < 5 ? p.id : `sample-${i}`,
        barcode: i < 5 ? p.barcode : undefined,
        name: i < 5 ? p.name : `${p.name} · ${String(i + 1).padStart(3, '0')}`,
        quantity: i % 7 === 0 ? 0 : p.quantity,
      };
    }),
  };
}
