import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductImage, ProductForm, ProductAttribution } from '../../src/components';
import { PrivatePhotos } from '../../src/ui/PrivatePhotos';
import type { Client } from '../../src/backend/client';
import type { Product } from '../../src/model';
import { chooseLanguage, useLanguage } from '../../src/i18n';
import '../../src/style.css';

declare global {
  interface Window {
    photoSaved?: Product;
    photoCalls?: string[];
  }
}
let account = 'account-a';
const client = {
  auth: { getSession: async () => ({ data: { session: { user: { id: account } } } }) },
  rpc: (_name: string, args: unknown) => ({
    abortSignal: async (signal: AbortSignal) => {
      const response = await fetch('/photo-fixture', {
        method: 'POST',
        signal,
        headers: { 'X-Account': account },
        body: JSON.stringify(args),
      });
      return { data: await response.json(), error: null };
    },
  }),
} as unknown as Client;
const product: Product = {
  id: 'p',
  name: 'Riz',
  quantity: 0,
  updatedAt: '',
  privatePhotoPath: 'r/p/photo.jpg',
  privatePhotoVersion: 1,
  external: {
    provider: 'open-food-facts',
    barcode: '3017620422003',
    imageUrl:
      'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.1.400.jpg',
  },
};
function Harness() {
  useLanguage();
  const [identity, setIdentity] = useState(account),
    [online, setOnline] = useState(true),
    [signed, setSigned] = useState(true),
    [editor, setEditor] = useState(false);
  return (
    <main className="sb-foundation">
      <button onClick={() => setOnline(false)}>Offline fixture</button>
      <button onClick={() => setOnline(true)}>Online fixture</button>
      <button onClick={() => setSigned(false)}>Logout fixture</button>
      <button
        onClick={() => {
          account = 'account-b';
          setIdentity(account);
          setSigned(true);
        }}
      >
        Other account fixture
      </button>
      <button onClick={() => setEditor(true)}>Editor fixture</button>
      <button onClick={() => chooseLanguage('en')}>English fixture</button>
      {signed && (
        <PrivatePhotos scope={{ client, account: identity, reserve: 'r', online }}>
          <div data-testid="media" style={{ width: 120, height: 120 }}>
            <ProductImage product={product} />
          </div>
          <ProductAttribution barcode={product.external!.barcode} image />
          {editor && (
            <ProductForm
              shared
              editor={{ product }}
              blocked={!online}
              close={() => setEditor(false)}
              onDelete={() => {}}
              onSave={(p) => {
                window.photoSaved = p;
                setEditor(false);
                return true;
              }}
            />
          )}
        </PrivatePhotos>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Harness />);
