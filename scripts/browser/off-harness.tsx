import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import { parseOffProduct, type ProductProvider } from '../../src/productInfo';
import '../../src/style.css';
import '../../src/theme.css';
declare global {
  interface Window {
    calls: string[];
    finishLookup: (mode?: 'found' | 'missing') => void;
  }
}
const state = {
  version: 1,
  revision: 0,
  sort: 'name',
  products: [
    {
      id: 'known',
      name: 'Mon produit personnel',
      barcode: '4006381333931',
      quantity: 2,
      updatedAt: new Date().toISOString(),
    },
  ],
  shopping: [
    { id: 'shop', productId: 'known', name: 'Mon produit personnel', quantity: 5, checked: false },
  ],
};
localStorage.setItem('app-reserve.local.v1', JSON.stringify(state));
window.calls = [];
const provider: ProductProvider = {
  lookup: (barcode) =>
    new Promise((resolve) => {
      window.calls.push(barcode);
      window.finishLookup = (mode = 'found') =>
        resolve(
          mode === 'found'
            ? parseOffProduct(
                {
                  status: 'success',
                  product: {
                    code: barcode,
                    product_name_fr: 'Nom proposé',
                    brands: 'Marque proposée',
                    quantity: '6 × 125 g',
                    image_front_url:
                      'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.1.400.jpg',
                  },
                },
                barcode,
              )
            : { status: mode },
        );
    }),
};
createRoot(document.getElementById('root')!).render(
  <App
    theme={{ preference: 'auto', chooseTheme: () => {}, error: '' }}
    productProvider={provider}
  />,
);
