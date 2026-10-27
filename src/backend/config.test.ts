import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { authStorageKey, backendEnvironmentError } from './config';

const remote = 'https://abcdefghijklmnopqrst.supabase.co';
const env = (url = remote, key = 'sb_publishable_example') => ({
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
});

it('keeps the reviewed Cloud confirmation template identical to the locally validated callback', () => {
  const template = (path: string) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n').trim();
  expect(template('config/cloud-email/supabase/templates/confirmation.html')).toBe(
    template('supabase/templates/confirmation.html'),
  );
});

it('requires an explicit Cloud mode and keeps local development and demonstration available', () => {
  expect(backendEnvironmentError('development', {})).toBeNull();
  expect(backendEnvironmentError('development', env('http://127.0.0.1:55321'))).toBeNull();
  expect(backendEnvironmentError('production', env('http://localhost:55321'))).toBeNull();
  expect(backendEnvironmentError('cloud', env())).toBeNull();
  expect(backendEnvironmentError('development', env())).toBeTruthy();
  expect(backendEnvironmentError('cloud', {})).toBeTruthy();
  expect(backendEnvironmentError('cloud', env('http://127.0.0.1:55321'))).toBeTruthy();
  expect(backendEnvironmentError('cloud', { VITE_SUPABASE_URL: remote })).toBeTruthy();
});

it('refuses Cloud credentials or URLs that could expose secrets or target a different service', () => {
  for (const key of [
    'sb_secret_example',
    `x.${btoa(JSON.stringify({ role: 'service_role' }))}.x`,
    `x.${btoa(JSON.stringify({ role: 'anon' }))}.x`,
    'sb_publishable_example\nVITE_SECRET=example',
  ])
    expect(backendEnvironmentError('cloud', env(remote, key))).toBeTruthy();
  for (const url of [
    remote.replace('https:', 'http:'),
    remote + '.example.test',
    remote + '/rest/v1',
    remote + '?password=example',
    remote.replace('https://', 'https://user:password@'),
    'invalid',
  ])
    expect(backendEnvironmentError('cloud', env(url))).toBeTruthy();
});

it('isolates persistent Auth sessions per Cloud project while retaining existing local sessions', () => {
  expect(authStorageKey('http://127.0.0.1:55321')).toBe('app-reserve.auth.v1');
  expect(authStorageKey(remote)).not.toBe(authStorageKey('http://127.0.0.1:55321'));
  expect(authStorageKey(remote)).not.toBe(
    authStorageKey('https://tsrqponmlkjihgfedcba.supabase.co'),
  );
  expect(authStorageKey(remote)).toBe(authStorageKey(remote + '/'));
});
