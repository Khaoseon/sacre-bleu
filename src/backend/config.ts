export function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    return JSON.parse(atob(key.split('.')[1])).role === 'anon';
  } catch {
    return false;
  }
}

const localHosts = ['127.0.0.1', 'localhost', '[::1]'];

/** Shared by Vite and the client: a Cloud build must never fall back to local. */
export function backendEnvironmentError(
  mode: string,
  env: Record<string, string | undefined>,
): string | null {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key && mode !== 'cloud') return null; // Demonstration without a backend.
  if (!url || !key) return 'URL Supabase et clé publique requises ensemble.';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'URL Supabase invalide.';
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/')
    return 'Utilisez uniquement l’origine publique de l’API Supabase.';
  if (mode === 'cloud') {
    if (
      parsed.protocol !== 'https:' ||
      parsed.port ||
      !/^[a-z]{20}\.supabase\.co$/.test(parsed.hostname)
    )
      return 'Le mode Cloud exige l’URL HTTPS du projet Supabase hébergé.';
    if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
      return 'Le mode Cloud exige une clé publishable, sans clé secrète ni ancienne clé JWT.';
  } else if (!localHosts.includes(parsed.hostname) || parsed.protocol !== 'http:') {
    return 'Utilisez le mode cloud pour joindre un projet hébergé ; ce mode est réservé au local.';
  }
  return isPublicKey(key) ? null : 'Clé publique invalide ; les clés secrètes sont interdites.';
}

export function authStorageKey(url?: string): string {
  const base = 'app-reserve.auth.v1';
  try {
    const parsed = new URL(url ?? '');
    // Preserve phase 2B sessions while isolating each hosted project's tokens.
    return localHosts.includes(parsed.hostname) ? base : `${base}:${parsed.origin}`;
  } catch {
    return base;
  }
}
