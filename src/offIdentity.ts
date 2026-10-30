/** Preserve the deployed identity when an existing instance has no override. */
export const DEFAULT_OFF_USER_AGENT = 'App_reserve/0.1.0 (https://github.com/Khaoseon)';

/** Operator configuration only: bounded ASCII app/version and a public HTTPS contact page. */
export function isOffUserAgent(value: string): boolean {
  if (value.length > 256) return false;
  const match =
    /^([A-Za-z][A-Za-z0-9._-]{0,63})\/([0-9][A-Za-z0-9._+-]{0,31}) \((https:\/\/[A-Za-z0-9.-]+(?:\/[A-Za-z0-9._~%/-]*)?)\)$/.exec(
      value,
    );
  if (!match) return false;
  try {
    const contact = new URL(match[3]);
    return contact.hostname.includes('.') && !contact.hostname.endsWith('.');
  } catch {
    return false;
  }
}
