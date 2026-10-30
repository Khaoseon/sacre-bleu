import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('changes only the two stale-scan business raises, preserving guards, transactions and grants verbatim', () => {
  const prior = readFileSync('supabase/migrations/20261028000100_product_sources.sql', 'utf8');
  const start = prior.indexOf('create or replace function public.mutate_reserve(');
  const expected = prior
    .slice(start)
    .replace(
      /raise exception using errcode = '40001', message = '([^']+)';/g,
      (_, message: string) =>
        `raise sqlstate 'PGRST' using\n        message = jsonb_build_object('code','40001','message','${message}','details',null,'hint',null)::text,\n        detail = '{"status":409,"headers":{}}';`,
    );
  const actual = readFileSync('supabase/migrations/20261029000200_scan_conflict_http.sql', 'utf8');
  expect(actual.slice(actual.indexOf('create or replace function'))).toBe(expected);
  expect(actual.match(/raise sqlstate 'PGRST'/g)).toHaveLength(2);
  expect(actual).not.toContain("errcode = '40001'");
});
