# Backend contracts

Current architecture and invariants, consolidated from the [French backend record](history/BACKEND_FR.md). Eight SQL migrations in `supabase/migrations/` are the executable schema; generated TypeScript describes structure, not permissions. [INSTALL.md](INSTALL.md) governs fresh setup; historical Cloud reports do not.

## Data and authorization

| Schema/table                  | Responsibility                                                         |
| ----------------------------- | ---------------------------------------------------------------------- |
| `public.reserves`             | Owner and monotonic reserve revision                                   |
| `public.reserve_members`      | Owner/member roles, maximum two                                        |
| `public.products`             | Catalogue, per-reserve barcode, package/category, photo/OFF provenance |
| `public.product_stock`        | One stock row per product, quantity 0–9999, minimum, version           |
| `public.shopping_items`       | Free-text or linked entries, quantity, check state and version         |
| `private.invitations`         | Target email, hashed secret, expiry/use/revocation                     |
| `private.requests`            | Per-user/request UUID payload and idempotency receipt                  |
| `private.scan_operations`     | Scan totals/versions and shopping state needed for compensation        |
| `private.product_lookup_gate` | Project-wide OFF slot and cooldown reason                              |

Composite foreign keys prevent cross-reserve links. RLS is enabled on application tables. Exposed tables grant authenticated clients SELECT with membership policies; direct client INSERT/UPDATE/DELETE is not the write path. `private` is not an API schema and its tables have no direct client access. Anonymous clients cannot read pantry data or execute application RPCs.

Mutating RPCs check non-anonymous authentication, confirmed email and membership; privileged actions also require ownership. Privileged functions use `search_path = ''`, qualified names and explicit execution grants, revoking default public execution. User-supplied role metadata grants no authority. The OFF lookup Edge Function uses a user's JWT and public project key, not a service-role key. The private-photo processor has the separate server-only privilege described below.

## Public functions and typed client

| Function                                                                     | Contract                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `create_reserve(p_request_id, p_name)`                                       | Create an empty reserve and its owner membership                     |
| `invite_member(p_request_id, p_reserve_id, p_email)`                         | Owner generates a targeted 24-hour invitation                        |
| `accept_invitation(p_request_id, p_invitation_id, p_token)`                  | Confirmed matching account accepts, within capacity                  |
| `get_reserve_snapshot(p_reserve_id)`                                         | Consistent single-statement read under RLS; outsider gets no reserve |
| `mutate_reserve(p_request_id, p_reserve_id, p_action, p_payload)`            | Catalogue, stock, shopping and scanner commands                      |
| `restore_reserve(p_request_id, p_reserve_id, p_expected_revision, p_backup)` | Owner-only validated atomic replacement                              |
| `claim_product_lookup_slot(p_cooldown_seconds)`                              | Authorized project-wide OFF budget with reason/delay                 |
| `claim_product_lookup(p_cooldown_seconds)`                                   | Legacy boolean interface to the same gate                            |

Check exact parameter types in [generated definitions](../src/backend/database.generated.ts). Commands are modeled in [contracts.ts](../src/backend/contracts.ts), implemented by [adapter.ts](../src/backend/adapter.ts). `restore` is dispatched to its dedicated RPC, not sent as a `mutate_reserve` action.

Catalogue commands create product/stock together; update only fields explicitly provided, retaining absent fields and clearing explicit nullable fields. Existing stock cannot be overwritten by metadata editing. Delete detaches shopping before removing the product. Shopping commands reject unknown/sensitive fields and never associate free text by name. `stock` applies an integer delta without changing shopping; `scan` also reduces unchecked linked shopping when positive. `adjust_scan` sends `scan_id`, its expected version and an absolute total; `undo_scan` compensates the identified operation.

## Locking, idempotency and compensation

Each intention gets one UUID. A transaction-level user/request lock serializes retries; a reused UUID with different parameters is refused. Business effects and the successful receipt commit together, with no success receipt on rollback. Each adjustment/undo is a new intention with its own UUID, retaining the original scan ID and latest confirmed scan version.

All reserve writers acquire the reserve row lock before changing its rows. This deliberately coarse serialization suits two users and simplifies lock order. Two additions accumulate; two withdrawals of the last package produce one success and one refusal. Constraints also enforce quantity bounds. No general automatic deadlock/retry loop is used to reinterpret a refused business operation.

Compensation belongs to the scan author and requires matching scan/stock/shopping versions and reserve revision. An intervening change elsewhere in the reserve also invalidates it conservatively. Apply only the affected inverse movement/shopping projection, never an old global snapshot. HTTP 409 with JSON code `40001` indicates stale compensation; the sixth migration uses SQLSTATE `PGRST` to avoid PostgREST's automatic serialization retry behavior while preserving that client-visible code.

Replays return historical receipts. The [client store](../src/backend/store.ts) reads a current snapshot before success, checks its revision against the receipt, and invalidates stale scan controls. Unknown write outcomes retain the same UUID and parameters in account/reserve-scoped `sessionStorage`, blocking subsequent writes until resolved. The journal is not an offline write queue. Receipts have no automatic purge; retention is part of the idempotency promise.

Metadata/manual shopping changes are partial writes with the last explicitly submitted value winning. They do not have the stricter scan-compensation semantics. Atomic replacement uses the same reserve lock, a preview revision, fresh remapped IDs and one receipt transaction; see [PHASE5.md](PHASE5.md).

## Invitations and session boundary

Only the owner invites. A 256-bit random secret is stored as a SHA-256 hash, expires in 24 hours and is consumable only by the confirmed matching email. Reserve/invitation locking prevents a third member or double consumption. New invitations revoke older usable links. The secret is returned on first creation only; replay returns metadata with a null token. If that first response is lost, a newly identified invitation is needed.

The UI removes the invitation fragment immediately after consuming it in memory. No invitation email is sent by the RPC. Do not persist/log fragments or conflate business invitations with Supabase Dashboard account invitations. Production bootstrap/provisioning and unsupported recovery flows are described in [INSTALL.md](INSTALL.md).

## Private product photos (V1.1 7B-D)

The eighth migration adds a product photo version, private bounded JPEG rows and processing-rate counters. Only authenticated confirmed members can execute the download/budget RPCs; only the trusted photo Edge processor can execute the commit RPC. Table writes remain ungranted, and all new privileged functions retain an empty `search_path`. Photo bytes/reference/revision/receipt replace or delete transactionally, including legacy product deletion. No Supabase Storage bucket or policy is needed. [7B-D architecture, evidence and separately authorized rollout/rollback](design/PHASE7BD.md) describes quotas, lost-response fencing, online-only Blob URLs and photo-aware administrative backup. User JSON v1 and its non-null-photo loss guard remain unchanged.

## Code and verification map

- `Root.tsx`: Auth, active data source and sharing; `backend/auth.ts` and `links.ts`: session/link handling.
- `backend/store.ts` and `usePantry.ts`: confirmed snapshots, bounded requests, recovery and visible-page polling.
- `model.ts` and `storage.ts`: pure rules/backup validation and account/project-scoped browser persistence.
- `supabase/migrations/`: eight ordered migrations, ending in private product photos. No demo seeds.
- `supabase/tests/database/`: pgTAP authorization, grants, constraints, rollback, provider budget and restore assertions.
- `scripts/backend/concurrency.integration.mjs`: overlapping real connections, observed lock contention, retries/corrections/restore races.
- Auth/API and shared SDK tests cover identities, outsiders and mail confirmation; the historical API fixture confirms accounts through SQL, while the shared test exercises Mailpit delivery.

After a migration, deliberately reset a disposable local stack, run the database/contention/Auth suites, then `npm run db:types` and review generated changes. Do not hand-edit generated types or run fixtures against hosted projects. [TESTING.md](TESTING.md) gives commands and separates automation from device evidence.
