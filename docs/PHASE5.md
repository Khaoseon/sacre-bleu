# Offline access, user backup and restore

Current user-facing recovery contract. The [French phase-5 record](history/PHASE5_FR.md) retains the full original example and delivery context. Administrative backups including Auth are separate: [BACKUP.md](BACKUP.md).

## Private read-only copy

After authentication and a successful consistent read, store the last stock/shopping snapshot in `localStorage` under `app-reserve.private.v1:<project Auth key>:<account>`. An active-account marker prevents an old instance rewriting it after signout/account change; an older revision cannot overwrite a newer tab's copy. Pending write intentions remain separately in `sessionStorage`, scoped by account/reserve.

Offline reopening requires a previously loaded PWA shell and known local session/copy. An expired access token does not erase this local consultation permission, and grants no server access. No cache appears before first synchronization, after signout, or for another project/account. Display the last successful synchronization time and disable all writes until authentication and a fresh read succeed. Reconnect/focus/visibility, manual refresh and visible-page polling try to reread. SDK retry backoff after expiry can delay recovery by about a minute.

This copy is **unencrypted, evictable browser storage**, not a durable backup. A remote revocation is unknowable while offline. Membership refusal online clears the copy. Signout clears private views, pending intentions and cache, propagates through the SDK to other tabs and guards against late responses restoring them. A removal failure is reported with site-storage cleanup instructions. The service worker caches public shell assets, never private API responses. Browser storage/format limits can prevent caching; failures are shown without pretending it succeeded.

## User export format

In Compte et réserve, either member can export the loaded snapshot as JSON. Offline export warns that it may be old. Download is local; there is no automatic third-party upload. The file is **confidential and unencrypted**: store it outside Git/hosting in protected personal storage.

The authoritative validator is [model.ts](../src/model.ts), mirrored by the seventh SQL migration. Format `sacre-bleu`, version 1, has exactly `format`, `version`, `exportedAt`, `products` and `shopping`. All object fields are required; optional values use null. No unknown fields, coercions or future versions are accepted.

| Object   | Fields                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Product  | `id`, `name`, `barcode`, `brand`, `size`, `unit`, `category`, `quantity`, `minimum`, `off_barcode`, `off_image_url`, `updatedAt` |
| Shopping | `id`, `product_id`, `name`, `quantity`, `checked`                                                                                |

Lowercase UUIDs link rows within the file only. Names: 1–120 characters; brands: 1–80 or null; codes: 4–32 digit strings. Quantities/minimum: integers 0–9999. Package size: positive and at most 99999, paired with a supported unit or both null. Categories/units match the model. Timestamps are UTC ISO with milliseconds. Zero shopping quantity requires checked status. Reject duplicate IDs/barcodes, orphan links or a second unchecked linked entry for the same product. Maximum 2,000 products, 2,000 shopping rows and 2,000,000 bytes, enforced for the file/server representation.

OFF references/provenance survive; images remain external URLs, not embedded files or guaranteed future downloads. Non-null private `photo_path` prevents export/restore rather than claiming an incomplete image backup. Demo photos and its older raw export are not this shared format.

Excluded: accounts, emails, password hashes, sessions/tokens, memberships/rights, invitations, reserve name/UUID, secrets, server versions, receipts and scan history. A user JSON export cannot recreate Auth.

## Guided replacement

Online, owner only, on an existing accessible reserve, with no pending uncertain request:

1. Choose a file; strict local validation occurs before writes.
2. Review current/replacement products, shopping, links, quantities and totals. This replaces the entire catalogue/stock/shopping, with no implicit merge by name or barcode.
3. Download the before-replacement backup and retain it, then explicitly confirm replacement. Both actions gate the restore button.
4. `restore_reserve` independently revalidates rights/payload, acquires the same reserve lock as older writers, and checks the preview revision. If changed, HTTP 409/code `40001` requires a new preview.
5. One transaction replaces catalogue, stock and shopping, generates fresh UUIDs/remaps links, preserves exact quantities and zero-stock products, and advances the reserve revision once. It does not perform scan deductions. Existing reserve, accounts, members, rights and technical journals survive. Earlier scan compensations become stale.
6. Effects and idempotent receipt commit together. The UI also requires a current snapshot before success. SQL failure rolls everything back without a successful receipt. A lost response requires recovery of the **same intention UUID**, including after reload; do not start a new import to resolve an uncertain one.

The pending payload is private material in the tab recovery journal and protected server request journal. It never goes into the worker. Replay of the same UUID returns the original receipt without changing IDs again; reusing it with a different payload is refused. A genuinely new restore intention replaces again with fresh IDs rather than adding stock. There is no scan undo for restore: recover by preparing another reviewed replacement from the saved before-file, after resolving any uncertain request.

## Unavailable or lost hosting

Consult your provider's current Dashboard/notifications and [pause guidance](https://supabase.com/docs/guides/platform/free-project-pausing); historical free-tier deadlines are not guarantees. Keep exports outside Supabase. There is no keepalive automation.

During an outage, consult/export the dated copy if needed. If the provider offers Resume, reactivate, wait for Auth/API, sign in and refresh. Do not overwrite an intact resumed project with an older file. If the project is lost, use [INSTALL.md](INSTALL.md) for a new owned project, migrations, exact origins, new confirmed accounts and an empty reserve. Then restore through the owner's normal preview/confirmation flow and invite the second member. Do not reuse old Auth UUIDs or browser sessions blindly.

Local automated recovery validates synthetic replacement and rollback, not a real hosted disaster recovery or complete physical-device acceptance. Historical delivery evidence: [HANDOFF_5.md](HANDOFF_5.md).
