import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { instanceHeaders } from './headers';
const template = readFileSync('public/_headers', 'utf8');
it('permits only the configured independent Cloud origin', () => {
  const url = 'https://abcdefghijklmnopqrst.supabase.co';
  const result = instanceHeaders(template, 'cloud', {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  });
  expect(result).toContain("connect-src 'self' " + url + ';');
  expect(result).not.toMatch(/uznbnih|__SUPABASE_ORIGIN__|https:\/\/\*/);
});
it('has no backend in demo and permits only loopback for local builds', () => {
  expect(instanceHeaders(template, 'production', {})).toContain("connect-src 'self' ;");
  expect(
    instanceHeaders(template, 'production', {
      VITE_SUPABASE_URL: 'http://127.0.0.1:55321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
    }),
  ).toContain('http://127.0.0.1:55321');
});
it('fails closed for missing Cloud settings and header injection', () => {
  for (const url of [
    undefined,
    'https://evil.test',
    'https://abcdefghijklmnopqrst.supabase.co/;x',
    'https://abcdefghijklmnopqrst.supabase.co\n*',
  ])
    expect(() =>
      instanceHeaders(template, 'cloud', {
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
      }),
    ).toThrow();
});
