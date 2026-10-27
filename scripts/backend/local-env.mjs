import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const cli = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
const status = JSON.parse(
  execFileSync(
    process.execPath,
    [resolve('node_modules/supabase', cli.bin.supabase), 'status', '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (
  !url ||
  !key ||
  !(
    key.startsWith('sb_publishable_') ||
    JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'
  )
)
  throw new Error('Clé publique locale introuvable.');
writeFileSync('.env.local', `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`);
console.log('.env.local configuré avec l’URL locale et la clé publique uniquement.');
