import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Local SDK recipe only: exercise the actual published V1 sources, not a reimplementation. */
export async function publishedClient() {
  const ref = '9eca5d11a42d8839d822f56dadc9fbbb7aa6c801';
  const target = resolve('.tmp/legacy-v1');
  mkdirSync(target, { recursive: true });
  for (const name of ['errors', 'store', 'adapter']) {
    let source = execFileSync('git', ['show', `${ref}:src/backend/${name}.ts`], {
      encoding: 'utf8',
      windowsHide: true,
    });
    source = source
      .replace(/from '\.\/contracts'/g, "from '../../src/backend/contracts'")
      .replace(/from '\.\/database.generated'/g, "from '../../src/backend/database.generated'")
      .replace(/from '\.\/client'/g, "from '../../src/backend/client'")
      .replace(/from '\.\.\/model'/g, "from '../../src/model'")
      .replace(/from '\.\.\/productInfo'/g, "from '../../src/productInfo'");
    writeFileSync(resolve(target, `${name}.ts`), source);
  }
  const storePath = pathToFileURL(resolve(target, 'store.ts')).href;
  const adapterPath = pathToFileURL(resolve(target, 'adapter.ts')).href;
  const store = await import(/* @vite-ignore */ storePath);
  const adapter = await import(/* @vite-ignore */ adapterPath);
  return { Store: store.SharedPantryStore, Backend: adapter.SupabaseBackend };
}
