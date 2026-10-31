// Domain port shared by the typed Supabase adapter and isolated tests.
import type { Database, Tables } from './database.generated';
import type { UserBackup } from '../model';
export type UUID = string;
export type RequestId = UUID; // Generate once per user intent; reuse for network retries.
export type ReserveRow = Tables<'reserves'>;
export type MemberRow = Omit<Tables<'reserve_members'>, 'role'> & {
  role: 'owner' | 'member';
};
export type CatalogRow = Omit<Tables<'products'>, 'unit' | 'category' | 'photo_version'> & {
  photo_version?: number; // Older servers / offline snapshots omit this additive field.
  unit: 'g' | 'kg' | 'ml' | 'L' | 'pièce' | null;
  category: 'Féculents' | 'Conserves' | 'Légumineuses' | 'Épicerie' | 'Autres' | null;
};
export type StockRow = Tables<'product_stock'>;
export type ShoppingRow = Tables<'shopping_items'>;
export interface ReserveSnapshot {
  reserve: ReserveRow;
  members: MemberRow[];
  products: (CatalogRow & Pick<StockRow, 'quantity' | 'minimum'> & { stock_version: number })[];
  shopping: ShoppingRow[];
}
export type ProductFields = Pick<
  CatalogRow,
  | 'name'
  | 'barcode'
  | 'brand'
  | 'size'
  | 'unit'
  | 'category'
  | 'photo_path'
  | 'off_barcode'
  | 'off_image_url'
> & { minimum: number | null };
export type ReserveCommand =
  | {
      action: 'photo';
      payload: {
        product_id: UUID;
        expected_path: string | null;
        expected_version: number;
        hash: string | null;
      };
    }
  | { action: 'restore'; payload: { backup: UserBackup; expected_revision: number } }
  | {
      action: 'create_product';
      payload: { id?: UUID; name: string; initial_quantity?: number } & Partial<
        Omit<ProductFields, 'name'>
      >;
    }
  | { action: 'update_product'; payload: { product_id: UUID } & Partial<ProductFields> }
  | { action: 'delete_product'; payload: { product_id: UUID } }
  | {
      action: 'add_shopping';
      payload: { id?: UUID; product_id?: UUID | null; name?: string; quantity: number };
    }
  | {
      action: 'update_shopping';
      payload: { shopping_id: UUID; name?: string; quantity?: number; checked?: boolean };
    }
  | { action: 'delete_shopping'; payload: { shopping_id: UUID } }
  | { action: 'stock' | 'scan'; payload: { product_id: UUID; delta: number } }
  | {
      action: 'adjust_scan';
      payload: { scan_id: UUID; expected_version: number; quantity: number };
    }
  | { action: 'undo_scan'; payload: { scan_id: UUID; expected_version: number } };
export interface MutationReceipt {
  revision: number;
  product_id?: UUID;
  shopping_id?: UUID;
  stock?: number;
  stock_version?: number;
  scan_id?: UUID;
  scan_version?: number;
  processed?: number;
  cancelled?: boolean;
  deleted?: boolean;
}
export interface InvitationReceipt {
  invitation_id: UUID;
  reserve_id: UUID;
  expires_at: string;
  token: string | null; // Secret available only on first response; never log/cache this field.
}
export interface ReserveBackend {
  createReserve(
    requestId: RequestId,
    name: string,
  ): Promise<{ reserve_id: UUID; revision: number }>;
  inviteMember(requestId: RequestId, reserveId: UUID, email: string): Promise<InvitationReceipt>;
  acceptInvitation(
    requestId: RequestId,
    invitationId: UUID,
    token: string,
  ): Promise<{ reserve_id: UUID; revision: number }>;
  getSnapshot(reserveId: UUID): Promise<ReserveSnapshot | null>;
  execute(requestId: RequestId, reserveId: UUID, command: ReserveCommand): Promise<MutationReceipt>;
}
export const backendRpcNames = {
  createReserve: 'create_reserve',
  inviteMember: 'invite_member',
  acceptInvitation: 'accept_invitation',
  getSnapshot: 'get_reserve_snapshot',
  execute: 'mutate_reserve',
} as const satisfies Record<keyof ReserveBackend, keyof Database['public']['Functions']>;
