# Private household product photos · proposal only

No bucket, hosted migration, function, account or policy was created or changed in 7A. The prototype accepts a small local file into React memory only. This document proposes future architecture; it is not deployable configuration or a security certification.

## Contract and authorization

Keep image priority **personal photo → OFF image → category fallback**. Retain OFF metadata independently when a personal image overrides it. Removing the personal image reveals the provider image again. Both confirmed reserve members see the same committed photo reference; ownership of the uploader's account alone must not determine read access.

Use a **private** bucket, with authorization based on live reserve membership and a committed asset registry. Supabase private object reads are governed by Storage policies; public buckets bypass read authorization. [Bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Proposed immutable key: `<reserve-uuid>/<product-uuid>/<asset-uuid>.webp`. A path is a locator, never proof of access. A future RLS-protected registry links object ID, reserve/product, hash, dimensions, MIME, bytes, version and lifecycle state. Storage SELECT should require the correct bucket **and** a committed registry row **and** current confirmed membership. Deny anonymous/cross-reserve/listing access. Test both members, outsiders, removed members, forged folder paths and deleted products. Do not reuse the generic documentation's uploader-only policy: the household is the sharing boundary. [Storage RLS and service-key privileges](https://supabase.com/docs/guides/storage/security/access-control).

All application metadata mutations remain authorized, idempotent RPCs, with explicit grants, fully qualified names and an empty privileged `search_path`. Proposed RPCs: begin an asset intention, finalize an uploaded asset with an expected photo version, cancel an intention, and detach a committed photo. Names are illustrative; no generated types are changed now.

## Bounded upload and processing

Proposed first limits, subject to local testing: JPEG/PNG/WebP input at most 5 MB and 16 megapixels; reject animated/SVG/unknown formats; server-decoded output at most 1024 px longest side and 500 KB, plus a 256 px thumbnail. A trusted processor must check signatures, decode with bounded memory/time, normalize orientation, re-encode and strip EXIF/GPS/other metadata. Client downscaling is a usability optimization, not the security boundary. Account/reserve rate and storage quotas prevent accumulation. These future limits intentionally differ from 7A's simpler 500 KB/4096 px file picker; its error label is not a full production processing policy.

An authenticated, size-limited Edge upload endpoint verifies the current user and calls the authorized begin RPC. It processes bytes server-side and writes one immutable object through the Storage API using a server-only credential. The browser never receives service-role access or general bucket write privileges. Confirm membership again on finalize. Do not expose a long-lived signed-upload capability which could outlive membership. Investigate runtime image-processing support and cost before selecting a library; no new dependency or paid transformation feature is assumed.

## Replacement, deletion and uncertain outcomes

Storage and PostgreSQL do not share one atomic transaction. Use a staged workflow rather than pretending that a successful upload means a saved product:

1. Authorized begin RPC records the request UUID, target and expected photo version.
2. Processor uploads to a new immutable key with overwrite disabled. On timeout, check the same intention/key instead of inventing another photo change.
3. Authorized finalize RPC validates the recorded processed object, locks the reserve/product, checks current membership/version, attaches its reference and commits its receipt. Read the current snapshot before announcing success.
4. Only after confirmed finalization does the interface show the new shared image. If finalization is refused, retain the old one. An unknown outcome retains the exact intention and blocks further conflicting photo operations until resolved.
5. The transaction enqueues obsolete keys for cleanup. A trusted worker removes unreferenced objects through the Storage API, retries failures and expires orphaned staged uploads after a bounded grace period. Recheck references/lifecycle before deletion. Do not delete Storage rows directly with SQL. Detach via RPC first; cleanup follows. Product deletion and reserve replacement must enqueue corresponding photo cleanup without disturbing transactional shopping detachment.

Immutable paths avoid competing in-place replacements and stale CDN imagery; Supabase also recommends a new path rather than overwriting when cache propagation matters. [Upload and overwrite behavior](https://supabase.com/docs/guides/storage/uploads/standard-uploads). Test concurrent replacements by both members, deletion during upload, network loss after finalize and replay after cleanup.

## Loading, cache and offline privacy

Prefer an authenticated download through the current session into a bounded Blob URL cache, keyed by backend project/account/reserve/asset hash. Both members can authorize the same committed asset. Revoke object URLs on replacement, unmount and signout, and reject late responses from an old account scope. Use no-referrer handling, fixed approved origins, decoded raster content and fallbacks; do not send personal image URLs to OFF or analytics. Do not store Auth headers, JWTs or signed URLs in logs, backup JSON or the app-shell cache.

An alternative is short-lived signed image URLs held in memory. Treat these as bearer capabilities: possession grants access until expiry, and signout or membership removal must not be represented as immediate revocation of an already issued URL. Prefer authenticated downloads for this two-person private context. [Authenticated and signed downloads](https://supabase.com/docs/guides/storage/serving/downloads).

Keep the service worker's current rule: cache the app shell, not private API/image responses. For a first photo release, **do not persist private image bytes offline**: online downloads can remain in tab memory; a cold offline start uses OFF/fallback imagery and a concise unavailable-photo state. This avoids silently extending the current unencrypted private snapshot cache. If durable photo caching is later approved, use a separately scoped IndexedDB store, explicit unencrypted-cache disclosure, bounded eviction and signout removal; offline revocation remains unknowable. Offline upload/replacement stays disabled, with no deferred write queue.

## Export, restore and compatibility

Current user JSON v1 excludes personal binary photos and does not provide a portable private-object backup. Preserve its exact contract and validation. Do not insert signed URLs or current account/Storage IDs into a portable JSON v1 file. Existing `photo_path` references must remain readable/preserved until an explicitly versioned migration makes them resolvable; never assume an old path is safe or belongs to the current reserve.

Propose an optional versioned archive export: current portable catalogue/shopping JSON, a manifest mapping portable product IDs to image hashes/MIME/dimensions, and sanitized image binaries. No access tokens or household membership IDs. Bound archive size, entry count, paths, decompression ratio, image decode and checksums. Export from one confirmed logical snapshot, report missing photos explicitly, and distinguish user export from administrator disaster backup. Plain exports contain private data; encryption remains an explicit operator/user choice.

Restore validates the complete archive locally, stages sanitized immutable objects into the destination reserve, then an owner-only preview/confirmation RPC checks expected revision and atomically swaps catalogue, shopping and committed photo references. Remap identifiers; never reuse another instance's path. Failed/stale replacement leaves existing references and objects intact; staged orphans are later cleaned. A JSON-only restore must state that photos are not included. Backward-compatible v1 import stays supported. A failed image stage must not silently produce a partial “complete” photo restoration.

Before implementation, design forward/backward schema compatibility for installed V1 clients, unavailable/malformed legacy paths, older exports and rollback. Any new migration requires a fresh disposable local database, pgTAP permissions/rollback coverage, concurrency and Auth/API tests, then `npm run db:types`; generated types are never handwritten. Additional local integration coverage must exercise two-account visibility, revocation, failed cleanup, archive validation and account-scoped cache clearing. Hosted rollout and physical-device acceptance require separate authorization.

## Decisions required

Approve photo storage/processing as a separately scoped feature; choose processing infrastructure and tested limits; accept online-only private photos initially or explicitly approve durable caching; decide whether portable photo archives are required for the first photo release. The premium UI can ship using existing OFF images and fallbacks before these choices are implemented.
