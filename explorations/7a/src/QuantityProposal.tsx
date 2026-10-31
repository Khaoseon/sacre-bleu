import { useState } from 'react';
import type { Product } from '../../../src/model';
import { useText } from './ui';

export function QuantityProposal({
  product,
  busy,
  confirm,
}: {
  product: Product;
  busy: boolean;
  confirm: (delta: number) => void;
}) {
  const t = useText(),
    [delta, setDelta] = useState('1');
  const number = Number(delta),
    valid =
      delta !== '' &&
      Number.isSafeInteger(number) &&
      number !== 0 &&
      product.quantity + number >= 0 &&
      product.quantity + number <= 9999;
  return (
    <form
      className="quantity-proposal"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) confirm(number);
      }}
    >
      <p>
        {t('Stock confirmé')} <strong>{product.quantity}</strong>
      </p>
      <label>
        {t('Variation proposée')}
        <input
          autoFocus
          aria-label={t('Variation proposée')}
          type="number"
          min={-product.quantity}
          max={9999 - product.quantity}
          step="1"
          required
          value={delta}
          disabled={busy}
          onChange={(e) => setDelta(e.target.value)}
        />
      </label>
      <p className="proposal-preview">
        {t('Après confirmation')} <strong>{valid ? product.quantity + number : '—'}</strong>
      </p>
      <small>
        {t('Une seule opération, après votre validation. Les courses ne sont pas modifiées.')}
      </small>
      <button className="primary full" disabled={busy || !valid}>
        {t(busy ? 'Enregistrement en cours…' : 'Confirmer la variation')}
      </button>
    </form>
  );
}
