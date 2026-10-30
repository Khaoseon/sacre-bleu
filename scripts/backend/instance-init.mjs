import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

export async function initializeReserve(client, requestId) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email_confirmed_at || data.user.is_anonymous)
    throw new Error('Confirmed account required');
  const existing = await client.from('reserves').select('id');
  if (existing.error) throw new Error('Cannot check existing membership');
  if (existing.data.length) return 'Existing reserve found; nothing created.';
  const result = await client.rpc('create_reserve', {
    p_request_id: requestId,
    p_name: 'Ma réserve',
  });
  if (result.error)
    throw new Error('Creation outcome unknown or rejected. Retry with the SAME request ID.');
  return 'Private reserve initialized. Sign in to the app to invite the second account.';
}
function password(prompt) {
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  const previousRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolvePassword, rejectPassword) => {
    const chars = [];
    function finish(error) {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(!!previousRaw);
      process.stdin.pause();
      process.stdout.write('\n');
      const result = Buffer.concat(chars);
      chars.forEach((char) => char.fill(0));
      if (error) {
        result.fill(0);
        rejectPassword(new Error('Saisie annulée.'));
      } else resolvePassword(result);
    }
    function onKey(text, key = {}) {
      if ((key.ctrl && key.name === 'c') || key.name === 'escape') return finish(true);
      if (key.name === 'return' || key.name === 'enter') return finish(false);
      if (key.name === 'backspace') {
        chars.pop()?.fill(0);
        return;
      }
      if (key.ctrl && key.name === 'u') {
        chars.splice(0).forEach((char) => char.fill(0));
        return;
      }
      if (!key.ctrl && !key.meta && text && !/[\x00-\x1f\x7f]/.test(text))
        chars.push(Buffer.from(text, 'utf8'));
    }
    process.stdin.on('keypress', onKey);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: { 'project-ref': { type: 'string' }, 'request-id': { type: 'string' } },
  });
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error('Interactive personal terminal required');
  process.loadEnvFile('.env.cloud.local');
  const ref = values['project-ref'];
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (
    !/^[a-z]{20}$/.test(ref ?? '') ||
    url !== 'https://' + ref + '.supabase.co' ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? '')
  )
    throw new Error('Explicit project reference must match the configured public URL and key');
  const requestId = values['request-id'] ?? randomUUID();
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(requestId))
    throw new Error('Invalid request UUID');
  console.log('Target: ' + url + '\nRequest ID (keep for retry): ' + requestId);
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const confirmation = await prompt.question(
    'Type the project reference again to authorize initialization: ',
  );
  if (confirmation !== ref) {
    prompt.close();
    throw new Error('Target not confirmed');
  }
  const email = await prompt.question('First authorized account email: ');
  prompt.close();
  const secret = await password('Account password (hidden): ');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const signed = await client.auth.signInWithPassword({
      email,
      password: secret.toString('utf8'),
    });
    secret.fill(0);
    if (signed.error) throw new Error('Sign-in failed');
    console.log(await initializeReserve(client, requestId));
  } finally {
    secret.fill(0);
    await client.auth.signOut({ scope: 'local' });
  }
}
