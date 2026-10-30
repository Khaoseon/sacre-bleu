import { test, expect, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import type { Database } from '../../src/backend/database.generated';
import { SupabaseBackend } from '../../src/backend/adapter';
import { ReserveAuth } from '../../src/backend/auth';
import { parseLink, invitationLink } from '../../src/backend/links';
import { SharedPantryStore } from '../../src/backend/store';
import type { ReserveBackend } from '../../src/backend/contracts';
import { publishedClient } from './legacy-client.mjs';
import { initializeReserve } from './instance-init.mjs';

const manifest = JSON.parse(readFileSync('node_modules/supabase/package.json', 'utf8'));
const status = JSON.parse(
  execFileSync(
    process.execPath,
    [resolve('node_modules/supabase', manifest.bin.supabase), 'status', '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ),
);
const api = new URL(status.API_URL);
if (!['127.0.0.1', 'localhost'].includes(api.hostname))
  throw new Error('Local fixtures refuse remote services.');
const port = Number(
  readFileSync('supabase/config.toml', 'utf8').match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1],
);
const smtpPort = Number(
  readFileSync('supabase/config.toml', 'utf8').match(
    /\[local_smtp\]\s*\nenabled\s*=\s*true\s*\nport\s*=\s*(\d+)/,
  )?.[1],
);
if (!port || !smtpPort) throw new Error('Missing local ports.');
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const mailpit = `http://127.0.0.1:${smtpPort}`;
function isolatedClient() {
  return createClient<Database>(api.toString(), publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}
function journal() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
async function confirmationToken(email: string) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const list = await (await fetch(`${mailpit}/api/v1/messages`)).json();
    const message = list.messages?.find((m: { To: { Address: string }[] }) =>
      m.To.some((to) => to.Address === email),
    );
    if (message) {
      const detail = await (await fetch(`${mailpit}/api/v1/message/${message.ID}`)).json();
      const link = String(detail.HTML).match(/href="([^"]+#confirm=[^"]+)"/);
      if (!link) throw new Error('Confirmation link missing from real Mailpit message.');
      const incoming = parseLink(new URL(link[1].replaceAll('&amp;', '&')).hash);
      if (!incoming.confirmation) throw new Error('Invalid confirmation fragment.');
      return incoming.confirmation;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Confirmation email not delivered to local Mailpit.');
}
test('two real confirmed accounts share a reserve through the frontend adapter and store', async () => {
  const admin = new pg.Client({
    host: '127.0.0.1',
    port,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    connectionTimeoutMillis: 5000,
  });
  await admin.connect();
  const users: string[] = [];
  const clients: ReturnType<typeof isolatedClient>[] = [];
  const stores: SharedPantryStore[] = [];
  try {
    async function account() {
      const client = isolatedClient();
      clients.push(client);
      const auth = new ReserveAuth(client);
      const email = `${crypto.randomUUID()}@example.test`;
      const password = `TestAa1!${crypto.randomUUID()}`;
      const signed = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: 'http://127.0.0.1:5173/auth/callback' },
      });
      if (signed.error || !signed.data.user) throw new Error('Signup failed.');
      users.push(signed.data.user.id);
      expect(signed.data.session === null).toBe(true);
      const refused = await client.auth.signInWithPassword({ email, password });
      expect(refused.error?.code).toBe('email_not_confirmed');
      // Complete the real delivered email flow; no SQL confirmation fixture.
      const confirmer = isolatedClient();
      clients.push(confirmer);
      await new ReserveAuth(confirmer).confirm(await confirmationToken(email));
      await confirmer.auth.signOut();
      await auth.signIn(email, password);
      expect((await client.auth.getSession()).data.session?.user.id === signed.data.user.id).toBe(
        true,
      );
      return { client, auth, backend: new SupabaseBackend(client), email, id: signed.data.user.id };
    }
    const owner = await account(),
      member = await account();
    console.log('PASS signup → Mailpit email → confirmation → sign in (two accounts).');
    const bootstrapId = crypto.randomUUID();
    expect(await initializeReserve(owner.client, bootstrapId)).toMatch(/initialized/);
    expect(await initializeReserve(owner.client, bootstrapId)).toMatch(/nothing created/);
    // Replay the same authorized request to obtain its receipt without a second reserve.
    const reserve = await owner.backend.createReserve(bootstrapId, 'Ma réserve');
    const reserveId = reserve.reserve_id;
    expect((await owner.backend.getSnapshot(reserveId))?.products.length).toBe(0);
    expect(await member.backend.getSnapshot(reserveId)).toBeNull();
    let refused = false;
    try {
      await member.backend.execute(crypto.randomUUID(), reserveId, {
        action: 'create_product',
        payload: { name: 'Forbidden' },
      });
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
    const invite = await owner.backend.inviteMember(crypto.randomUUID(), reserveId, member.email);
    if (!invite.token) throw new Error('Missing initial invitation secret.');
    const parsed = parseLink(
      new URL(
        invitationLink('http://localhost:5173', {
          reserveId,
          id: invite.invitation_id,
          token: invite.token,
        }),
      ).hash,
    ).invitation!;
    const acceptId = crypto.randomUUID();
    await member.backend.acceptInvitation(acceptId, parsed.id, parsed.token);
    await member.backend.acceptInvitation(acceptId, parsed.id, parsed.token);
    expect((await member.backend.getSnapshot(reserveId))?.members.length).toBe(2);
    refused = false;
    try {
      await member.backend.inviteMember(crypto.randomUUID(), reserveId, 'third@example.test');
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
    console.log(
      'PASS empty reserve, private reads, invitation, idempotent accept and owner permissions.',
    );
    const a = new SharedPantryStore(owner.backend, owner.id, reserveId, journal(), () => true);
    const b = new SharedPantryStore(member.backend, member.id, reserveId, journal(), () => true);
    stores.push(a, b);
    await Promise.all([a.refresh(), b.refresh()]);
    const product = {
      id: crypto.randomUUID(),
      name: 'Paquets partagés',
      barcode: '1234567890128',
      quantity: 0,
      minimum: 3,
      updatedAt: new Date().toISOString(),
      external: {
        provider: 'open-food-facts' as const,
        barcode: '1234567890128',
        imageUrl:
          'https://images.openfoodfacts.org/images/products/123/456/789/0128/front_fr.1.400.jpg',
      },
    };
    expect(await a.saveProduct(product, false)).toBe(true);
    const photoPath = `${reserveId}/${product.id}/reserved.webp`;
    await owner.backend.execute(crypto.randomUUID(), reserveId, {
      action: 'update_product',
      payload: { product_id: product.id, photo_path: photoPath },
    });
    await a.refresh();
    expect(await a.saveProduct({ ...product, brand: 'Marque test', quantity: 9999 }, true)).toBe(
      true,
    );
    expect(a.getSnapshot().snapshot?.products[0].photo_path === photoPath).toBe(true);
    expect(a.getSnapshot().snapshot?.products[0].off_barcode).toBe(product.external.barcode);
    expect(a.getSnapshot().snapshot?.products[0].off_image_url).toBe(product.external.imageUrl);
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(0);
    await b.refresh();
    expect(b.getSnapshot().snapshot?.products[0].quantity).toBe(0);
    expect(await a.addShopping(product.name, 5, product.id)).toBe(true);
    expect(await a.scanProduct(product.id, 1)).toBe(true);
    for (let i = 0; i < 4; i++) expect(await a.adjustScan(1)).toBe(true);
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(5);
    expect(a.getSnapshot().snapshot?.shopping[0].quantity).toBe(0);
    expect(a.getSnapshot().snapshot?.shopping[0].checked).toBe(true);
    await a.adjustScan(-1);
    await a.adjustScan(-1);
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(3);
    expect(a.getSnapshot().snapshot?.shopping[0].quantity).toBe(2);
    expect(await a.undoScan()).toBe(true);
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(0);
    expect(a.getSnapshot().snapshot?.shopping[0].quantity).toBe(5);
    console.log('PASS scanner +1 → 5 → 3 → undo, atomic stock and shopping compensation.');
    await b.refresh();
    expect(
      (await Promise.all([a.changeStock(product, 1), b.changeStock(product, 1)])).every(Boolean),
    ).toBe(true);
    await Promise.all([a.refresh(), b.refresh()]);
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(2);
    expect(b.getSnapshot().snapshot?.products[0].quantity).toBe(2);
    expect(a.getSnapshot().snapshot?.shopping[0].quantity).toBe(5);
    expect(await a.scanProduct(product.id, -1)).toBe(true);
    expect(a.getSnapshot().scan?.limit).toBe(2);
    expect(await a.adjustScan(1)).toBe(true);
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(0);
    expect(await a.undoScan()).toBe(true);
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(2);
    await a.scanProduct(product.id, 1);
    await b.refresh();
    await b.changeStock(product, 1);
    const staleScan = a.getSnapshot().scan!;
    const beforeConflict = await owner.backend.getSnapshot(reserveId);
    const conflictKey = crypto.randomUUID();
    const started = Date.now();
    const conflict = await owner.client.rpc('mutate_reserve', {
      p_request_id: conflictKey,
      p_reserve_id: reserveId,
      p_action: 'adjust_scan',
      p_payload: { scan_id: staleScan.id, expected_version: staleScan.version, quantity: 2 },
    });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(conflict.status).toBe(409);
    expect(conflict.error?.code).toBe('40001');
    expect(await owner.backend.getSnapshot(reserveId)).toEqual(beforeConflict);
    expect(
      (
        await admin.query('select count(*)::int as n from private.requests where request_id=$1', [
          conflictKey,
        ])
      ).rows[0].n,
    ).toBe(0);
    expect(await a.adjustScan(1)).toBe(false);
    expect(a.getSnapshot().scan).toBeNull();
    expect(a.getSnapshot().pending).toBeNull();
    expect(a.getSnapshot().busy).toBe(false);
    expect(a.writable).toBe(true);
    expect(a.getSnapshot().error).toContain('La réserve a changé');
    expect(a.getSnapshot().snapshot?.products[0].quantity).toBe(4);
    console.log(
      'PASS concurrent increments, independent stock controls, removal limit and stale scan refusal.',
    );
    const realExecute = owner.backend.execute.bind(owner.backend);
    let drop = true;
    const uncertainBackend: ReserveBackend = Object.assign(Object.create(owner.backend), {
      execute: async (...args: Parameters<ReserveBackend['execute']>) => {
        const receipt = await realExecute(...args);
        if (drop) {
          drop = false;
          throw new Error('Simulated lost response AFTER server commit');
        }
        return receipt;
      },
    });
    const c = new SharedPantryStore(uncertainBackend, owner.id, reserveId, journal(), () => true);
    stores.push(c);
    await c.refresh();
    expect(await c.changeStock(product, 1)).toBe(false);
    expect(c.getSnapshot().notice).toBe('');
    expect(c.getSnapshot().pending !== null).toBe(true);
    expect(c.getSnapshot().snapshot?.products[0].quantity).toBe(4);
    expect(await c.resume()).toBe(true);
    expect(c.getSnapshot().snapshot?.products[0].quantity).toBe(5);
    await b.refresh();
    expect(b.getSnapshot().snapshot?.products[0].quantity).toBe(5);
    console.log('PASS response lost after commit → same-key retry → exactly one movement.');
    await c.scanProduct(product.id, 1);
    const count = c.getSnapshot().snapshot?.products.length;
    const unknown = {
      ...product,
      id: crypto.randomUUID(),
      barcode: '9876543210987',
      name: 'Unknown',
      quantity: 2,
    };
    expect(await c.saveProduct(unknown, false, true, 1)).toBe(true);
    expect(await c.undoScan()).toBe(true);
    expect(c.getSnapshot().snapshot?.products.length).toBe(count! + 1);
    expect(c.getSnapshot().snapshot?.products.find((p) => p.id === unknown.id)?.quantity).toBe(0);
    // Independent scanner identities on the SAME real reserve, two distinct accounts.
    const concurrentProducts = ['A', 'B'].map((suffix, index) => ({
      id: crypto.randomUUID(),
      name: `Concurrence ${suffix}`,
      barcode: `000000000000${index + 1}`,
      quantity: 0,
      updatedAt: new Date().toISOString(),
    }));
    const previousLocalIdentity = a.getSnapshot().lastProductId;
    for (const entry of concurrentProducts) {
      expect(await a.saveProduct(entry, false)).toBe(true);
      expect(await a.addShopping(entry.name, 5, entry.id)).toBe(true);
    }
    expect(a.getSnapshot().lastProductId).toBe(previousLocalIdentity);
    await Promise.all([a.refresh(), b.refresh()]);
    expect(
      await Promise.all([
        a.scanProduct(concurrentProducts[0].id, 1),
        b.scanProduct(concurrentProducts[1].id, 1),
      ]),
    ).toEqual([true, true]);
    await Promise.all([a.refresh(), b.refresh()]);
    expect(a.getSnapshot().lastProductId).toBe(concurrentProducts[0].id);
    expect(b.getSnapshot().lastProductId).toBe(concurrentProducts[1].id);
    for (const entry of concurrentProducts) {
      expect(a.getSnapshot().snapshot?.products.find((p) => p.id === entry.id)?.quantity).toBe(1);
      expect(
        b.getSnapshot().snapshot?.shopping.find((p) => p.product_id === entry.id)?.quantity,
      ).toBe(4);
    }
    // >20 deliberate known scans/minute without a provider or shared OFF claim.
    for (let index = 0; index < 24; index++)
      expect(
        await (index % 2 ? a : b).scanProduct(concurrentProducts[index % 2 ? 0 : 1].id, 1),
      ).toBe(true);
    await Promise.all([a.refresh(), b.refresh()]);
    expect(a.getSnapshot().lastProductId).toBe(concurrentProducts[0].id);
    expect(b.getSnapshot().lastProductId).toBe(concurrentProducts[1].id);
    console.log(
      'PASS two independent local identities, concurrent distinct scans, 24 rapid known movements, coherent stock/shopping.',
    );
    // Polling captured before B's write arrives late while A's mutation waits.
    const liveRead = owner.backend.getSnapshot.bind(owner.backend);
    let releasePoll: (() => void) | undefined;
    let delayPoll = true;
    owner.backend.getSnapshot = async (id) => {
      const old = await liveRead(id);
      if (!delayPoll) return old;
      delayPoll = false;
      return new Promise((resolve) => {
        releasePoll = () => resolve(old);
      });
    };
    try {
      const polling = a.refresh();
      await vi.waitFor(() => expect(releasePoll).toBeTypeOf('function'));
      const localScan = a.scanProduct(concurrentProducts[0].id, 1);
      expect(await b.scanProduct(concurrentProducts[1].id, 1)).toBe(true);
      releasePoll!();
      await polling;
      expect(await localScan).toBe(true);
      await Promise.all([a.refresh(), b.refresh()]);
      expect(a.getSnapshot().lastProductId).toBe(concurrentProducts[0].id);
      expect(b.getSnapshot().lastProductId).toBe(concurrentProducts[1].id);
      expect(a.getSnapshot().snapshot?.reserve.revision).toBe(
        b.getSnapshot().snapshot?.reserve.revision,
      );
      expect(a.writable && b.writable).toBe(true);
    } finally {
      owner.backend.getSnapshot = liveRead;
    }
    console.log(
      'PASS late polling and parallel scan, local identities retained and scanner remains writable.',
    );
    // Exact old V1 store + adapter + error classifier against the new SQL/HTTP contract.
    const legacy = await publishedClient();
    const old = new legacy.Store(
      new legacy.Backend(owner.client),
      owner.id,
      reserveId,
      journal(),
      () => true,
    ) as SharedPantryStore;
    stores.push(old);
    await old.refresh();
    for (const undo of [false, true]) {
      expect(await old.scanProduct(concurrentProducts[0].id, 1)).toBe(true);
      await b.refresh();
      expect(await b.scanProduct(concurrentProducts[1].id, 1)).toBe(true);
      const start = Date.now();
      expect(await (undo ? old.undoScan() : old.adjustScan(1))).toBe(false);
      expect(Date.now() - start).toBeLessThan(5000);
      expect(old.getSnapshot().scan).toBeNull();
      expect(old.getSnapshot().pending).toBeNull();
      expect(old.getSnapshot().busy).toBe(false);
      expect(old.getSnapshot().error).toContain('La réserve a changé');
      expect(old.writable).toBe(true);
    }
    expect(await old.scanProduct(concurrentProducts[0].id, 1)).toBe(true);
    await a.refresh();
    expect(await a.scanProduct(concurrentProducts[0].id, 1)).toBe(true);
    await b.refresh();
    expect(await b.scanProduct(concurrentProducts[1].id, 1)).toBe(true);
    expect(await a.undoScan()).toBe(false);
    expect(a.getSnapshot().pending).toBeNull();
    expect(a.writable).toBe(true);
    expect(await a.scanProduct(concurrentProducts[0].id, 1)).toBe(true);
    console.log(
      'PASS HTTP 409/code 40001 is fast and atomic; published and current clients reject stale adjust/undo, clear pending and scan again.',
    );
    const linked = c.getSnapshot().snapshot!.shopping[0];
    expect(await c.updateShopping(linked.id, { checked: true })).toBe(true);
    expect(await c.updateShopping(linked.id, { checked: false })).toBe(true);
    expect(await c.addShopping('Article libre', 2)).toBe(true);
    expect(await c.deleteProduct(product.id)).toBe(true);
    expect(
      c.getSnapshot().snapshot?.shopping.find((i) => i.id === linked.id)?.product_id,
    ).toBeNull();
    c.dispose();
    expect(c.getSnapshot().snapshot).toBeNull();
    await owner.auth.signOut();
    expect((await owner.client.auth.getSession()).data.session === null).toBe(true);
    refused = false;
    try {
      await owner.backend.getSnapshot(reserveId);
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
    console.log(
      'PASS unknown fiche preserved after undo, shopping edits, deletion detaches links, sign-out privacy.',
    );
  } finally {
    stores.forEach((store) => store.dispose());
    for (const client of clients) await client.auth.signOut({ scope: 'local' });
    if (users.length) {
      await admin.query('delete from public.reserves where owner_id=any($1::uuid[])', [users]);
      await admin.query('delete from private.requests where actor_id=any($1::uuid[])', [users]);
      await admin.query('delete from auth.users where id=any($1::uuid[])', [users]);
    }
    await admin.end();
  }
});
