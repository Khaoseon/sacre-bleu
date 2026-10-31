import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import { demo } from '../../src/demo';
import { useThemePreference } from '../../src/theme';
import '../../src/style.css';

// Synthetic, disposable local test state; no service or private data.
const state = demo();
state.products.push({
  id: 'off-cola',
  name: 'Coca-Cola Original',
  brand: 'Coca-Cola',
  barcode: '5449000000996',
  quantity: 2,
  size: 330,
  unit: 'ml',
  category: 'Autres',
  updatedAt: '2026-10-30T12:00:00Z',
  external: {
    provider: 'open-food-facts',
    barcode: '5449000000996',
    imageUrl: 'https://images.openfoodfacts.org/images/products/5449000000996.jpg',
  },
});

localStorage.setItem('app-reserve.local.v1', JSON.stringify(state));
function Harness() {
  const theme = useThemePreference();
  return <App theme={theme} />;
}
createRoot(document.getElementById('root')!).render(<Harness />);
