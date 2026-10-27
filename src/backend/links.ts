export type Invitation = { reserveId: string; id: string; token: string };
export type IncomingLink = { invitation?: Invitation; confirmation?: string; error?: string };
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function parseLink(hash: string): IncomingLink {
  if (!hash || hash === '#stock') return {};
  const invitation = new RegExp(`^#invite=(${uuid})\\.(${uuid})\\.([0-9a-f]{64})$`, 'i').exec(hash);
  if (invitation)
    return { invitation: { reserveId: invitation[1], id: invitation[2], token: invitation[3] } };
  const confirmation = /^#confirm=([a-zA-Z0-9_-]{20,256})$/.exec(hash);
  if (confirmation) return { confirmation: confirmation[1] };
  if (/^#(invite|confirm|error)/.test(hash))
    return {
      error: 'Ce lien est invalide ou expiré. Rouvrez le lien complet ou demandez-en un nouveau.',
    };
  return {};
}
export function consumeLink(
  location: Pick<Location, 'hash' | 'pathname' | 'search'>,
  history: Pick<History, 'replaceState'>,
): IncomingLink {
  const result = parseLink(location.hash);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  return result;
}
export const invitationLink = (origin: string, invitation: Invitation) =>
  `${origin}/#invite=${invitation.reserveId}.${invitation.id}.${invitation.token}`;
