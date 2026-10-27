import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const manifest = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
const entry = resolve('node_modules/supabase', manifest.bin.supabase);
const generated = execFileSync(
  process.execPath,
  [entry, 'gen', 'types', 'typescript', '--local', '--schema', 'public'],
  { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
);
if (!generated.includes('export type Database'))
  throw new Error('Supabase returned no database type definition');
writeFileSync('src/backend/database.generated.ts', generated);
execFileSync(
  process.execPath,
  [
    resolve('node_modules/prettier/bin/prettier.cjs'),
    '--write',
    'src/backend/database.generated.ts',
  ],
  { stdio: 'inherit' },
);
