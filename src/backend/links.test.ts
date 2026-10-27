import { expect, it, vi } from 'vitest';
import { consumeLink, invitationLink, parseLink } from './links';
import { isPublicKey } from './client';
it('consumes invitation secrets only in memory and removes the URL fragment immediately', () => {
  const invitation = {
    reserveId: crypto.randomUUID(),
    id: crypto.randomUUID(),
    token: 'a'.repeat(64),
  };
  const link = new URL(invitationLink('http://localhost:5173', invitation));
  const history = { replaceState: vi.fn() };
  expect(consumeLink(link, history)).toEqual({ invitation });
  expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
  expect(parseLink('#invite=broken').error).toBeTruthy();
});
it('supports a confirmation token in the fragment without requiring a PKCE verifier on another browser', () => {
  expect(parseLink('#confirm=' + 'a'.repeat(64))).toEqual({ confirmation: 'a'.repeat(64) });
});
it('refuses secret and service role credentials at the frontend boundary', () => {
  expect(isPublicKey('sb_secret_abc')).toBe(false);
  expect(isPublicKey('sb_publishable_abc')).toBe(true);
  expect(isPublicKey(`x.${btoa(JSON.stringify({ role: 'service_role' }))}.x`)).toBe(false);
  expect(isPublicKey(`x.${btoa(JSON.stringify({ role: 'anon' }))}.x`)).toBe(true);
});
