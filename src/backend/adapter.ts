import type { Client } from './client';
import type { Database, Json } from './database.generated';
import type {
  InvitationReceipt,
  MutationReceipt,
  ReserveBackend,
  ReserveSnapshot,
} from './contracts';
import { backendError, BackendError } from './errors';
import { categories, units } from '../model';
import { imageUrl, isLookupBarcode } from '../productInfo';

function object(value: Json): Record<string, Json | undefined> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BackendError('Réponse serveur illisible.', 'uncertain');
  return value;
}
function membership(value: Json) {
  const row = object(value);
  if (typeof row.reserve_id !== 'string' || typeof row.revision !== 'number')
    throw new BackendError('Réponse serveur incomplète.', 'uncertain');
  return { reserve_id: row.reserve_id, revision: row.revision };
}
export class SupabaseBackend implements ReserveBackend {
  constructor(readonly client: Client) {}
  private async rpc<Name extends keyof Database['public']['Functions']>(
    name: Name,
    args: Database['public']['Functions'][Name]['Args'],
    write = true,
  ): Promise<Json> {
    try {
      const signal = AbortSignal.timeout(10000);
      const { data: sessionData, error: sessionError } = await this.client.auth.getSession();
      if (signal.aborted || sessionError || !sessionData.session)
        throw new BackendError(
          'Reconnexion au compte en cours. La copie reste en lecture seule.',
          'unavailable',
        );
      const { data, error, status } = await this.client
        .rpc(name, args as never)
        .abortSignal(signal);
      if (error) throw backendError(error, write && (status === 0 || status >= 500));
      return data;
    } catch (error) {
      throw backendError(error, write);
    }
  }
  async listReserves() {
    try {
      const { data, error } = await this.client
        .from('reserves')
        .select('id,name')
        .order('created_at');
      if (error) throw error;
      return data;
    } catch (error) {
      throw backendError(error);
    }
  }
  async createReserve(requestId: string, name: string) {
    return membership(await this.rpc('create_reserve', { p_request_id: requestId, p_name: name }));
  }
  async inviteMember(
    requestId: string,
    reserveId: string,
    email: string,
  ): Promise<InvitationReceipt> {
    const row = object(
      await this.rpc('invite_member', {
        p_request_id: requestId,
        p_reserve_id: reserveId,
        p_email: email,
      }),
    );
    if (
      typeof row.invitation_id !== 'string' ||
      typeof row.reserve_id !== 'string' ||
      typeof row.expires_at !== 'string' ||
      !(row.token === null || typeof row.token === 'string')
    )
      throw new BackendError('Réponse d’invitation illisible.', 'uncertain');
    return {
      invitation_id: row.invitation_id,
      reserve_id: row.reserve_id,
      expires_at: row.expires_at,
      token: row.token,
    };
  }
  async acceptInvitation(requestId: string, invitationId: string, token: string) {
    return membership(
      await this.rpc('accept_invitation', {
        p_request_id: requestId,
        p_invitation_id: invitationId,
        p_token: token,
      }),
    );
  }
  async getSnapshot(reserveId: string): Promise<ReserveSnapshot | null> {
    const data = await this.rpc('get_reserve_snapshot', { p_reserve_id: reserveId }, false);
    if (data === null) return null;
    const row = object(data);
    const reserve = object(row.reserve ?? null);
    if (
      typeof reserve.id !== 'string' ||
      typeof reserve.revision !== 'number' ||
      !Array.isArray(row.products) ||
      !Array.isArray(row.shopping) ||
      !Array.isArray(row.members)
    )
      throw new BackendError('Réserve illisible. Actualisez pour réessayer.', 'unavailable');
    const rows = [...row.products, ...row.shopping];
    const bounded = (value: Json | undefined) =>
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 9999;
    if (
      rows.some((value) => {
        const item = object(value);
        return (
          typeof item.id !== 'string' || typeof item.name !== 'string' || !bounded(item.quantity)
        );
      }) ||
      row.products.some((value) => {
        const item = object(value);
        return (
          !(item.category === null || categories.includes(item.category as never)) ||
          !(item.unit === null || units.includes(item.unit as never)) ||
          (item.off_barcode != null &&
            (typeof item.off_barcode !== 'string' || !isLookupBarcode(item.off_barcode))) ||
          (item.off_image_url != null &&
            (imageUrl(item.off_image_url) !== item.off_image_url || !item.off_barcode))
        );
      }) ||
      row.shopping.some((value) => typeof object(value).checked !== 'boolean') ||
      row.members.some((value) => {
        const item = object(value);
        return typeof item.user_id !== 'string' || !['owner', 'member'].includes(String(item.role));
      })
    )
      throw new BackendError(
        'Contenu de la réserve illisible. Actualisez pour réessayer.',
        'unavailable',
      );
    return data as unknown as ReserveSnapshot;
  }
  async execute(
    requestId: string,
    reserveId: string,
    command: Parameters<ReserveBackend['execute']>[2],
  ): Promise<MutationReceipt> {
    const row = object(
      command.action === 'restore'
        ? await this.rpc('restore_reserve', {
            p_request_id: requestId,
            p_reserve_id: reserveId,
            p_expected_revision: command.payload.expected_revision,
            p_backup: JSON.parse(JSON.stringify(command.payload.backup)) as Json,
          })
        : await this.rpc('mutate_reserve', {
            p_request_id: requestId,
            p_reserve_id: reserveId,
            p_action: command.action,
            p_payload: command.payload,
          }),
    );
    if (typeof row.revision !== 'number')
      throw new BackendError('Résultat à vérifier par une reprise.', 'uncertain');
    return row as unknown as MutationReceipt;
  }
}
