# V1.1 · 7B-D · private shared product photos

Prepared on `feat/v1.1-7b-d-private-photos` for `release/v1.1`. No hosted changes, merge, deployment or Phase 7C work is authorized by this delivery. Production operations below require **separate explicit maintainer authorization**.

## Architecture and tradeoff

The 7A Storage registry/processor/garbage-collector proposal is deliberately replaced by a smaller bounded design for two-person households: one private PostgreSQL `bytea` row per photographed product, with at most **40 photos / 20 MB encoded bytes per household**. This uses the existing Supabase PostgreSQL/Auth/Edge model and existing administrative database backup. There is no Storage bucket, Storage policy, signed/public URL, thumbnail service, staged object or cleanup worker. Do not enable Storage for this phase.

The cost is database/WAL/backup volume and base64 transport overhead. This is appropriate only for the documented small quota. Increasing the quota or adding portable photo archives needs another design review. The administrative archive's existing 64 MiB uncompressed limit remains; multiple full households can exceed it, and the backup tool must then fail explicitly. It is not silently raised.

Image priority is personal → validated OFF → category. OFF metadata and source/licence links remain independent. Image credits explicitly identify **OFF photos**, and do not license personal photographs. Removing the personal override restores the provider image. Existing unresolved `photo_path` values are preserved and never fetched as arbitrary URLs.

## Client and processor boundaries

- Browser picker: JPEG/PNG/WebP up to 20 MB and 50 MP; explicit HEIC/HEIF conversion guidance. Decodes with browser orientation handling, composites transparency onto white, reduces to at most 1024 px, and encodes JPEG at decreasing quality until at most 500,000 bytes. A decode/size failure retains the existing photo and form. No HEIC converter or promise of HEIC support is added.
- Preview/replacement/removal are drafts until Save. The existing metadata/optional scan writes run first, followed by the photo command. These steps are **not one transaction together**: a refused photo can leave saved metadata/initial stock. The UI reports that partial outcome and a form retry never recreates/rescans an already-created product. Each successful step requires its receipt and a current snapshot.
- `product-photo` accepts only the normalized JPEG representation, never a remote URL. It validates exact allowed origins, verified non-anonymous Auth identity, live reserve membership, exact intention keys, UUID/hash/version, body MIME and a streaming 500 KB budget. An account-scoped RPC limits expensive processing to 30 decode attempts/hour; removal and receipt recovery bypass that budget. Each of the two accounts has its own budget.
- Pinned `jpeg-js@0.4.4` independently decodes actual bytes with strict decoding, 1.05 MP and approximate 32 MiB decoder limits, checks both sides ≤1024 px, then encodes **pixels only** to bounded JPEG. Source comments, EXIF/GPS and profiles are discarded. The browser handles original-phone EXIF orientation before submitting normalized pixels; the server does not preserve EXIF orientation/profile metadata. Browser colour/orientation and peak phone decode memory remain physical-device risks.
- Only this processor uses the built-in server-only service-role environment credential. It never sends/logs that credential, tokens, photographs or raw SQL diagnostics. The public client cannot call its commit RPC or write photo tables directly. The processor key has broad Supabase capabilities inherently; keep access to deployed Edge code/secrets restricted.

## Migration and authorization

`supabase/migrations/20261031000100_private_photos.sql` is additive:

- `public.products.photo_version`: nonnegative monotonic version. Snapshot reads automatically include it; older snapshots default to zero in the client. Existing rows/paths and OFF data remain intact.
- `private.product_photos`: committed JPEG bytes, dimensions, immutable locator and composite product/reserve FK; RLS enabled, **no direct table grants** even to `service_role`.
- `private.photo_rate`: bounded per-account processing budget; RLS enabled, no direct grants.
- `claim_product_photo(reserve)`: authenticated only; confirmed identity + live membership/reserve lock + hourly processing budget.
- `read_product_photo(reserve, product, path)`: authenticated only; confirmed identity + live membership + exact committed product/registry association. Response has `Cache-Control: private, no-store`. Unknown/legacy/obsolete references return no bytes. No listing API.
- `commit_product_photo(actor, request, reserve, product, expected_path, expected_version, hash, data, width, height)`: **service_role execute only**. The Edge passes the actor from Auth, never from request JSON. SQL independently rechecks confirmed account and current membership under the reserve lock. Bounds are also enforced by SQL constraints.
- The product photo trigger preserves an unchanged legacy reference, requires the actual processor SQL role for reference changes (with a trusted SQL administrator maintenance exception), rejects an unregistered new reference, increments the version on actual reference change and deletes detached bytes. Generic metadata updates cannot bypass photo version checks. Product deletion cascades atomically. Existing reserve mutation/restore RPCs, RLS reads and their grants remain unchanged.

Every new privileged function has `search_path=''`, qualified object references and explicit grants/revocations. No anonymous execution, uploader-only access, cross-household path trust or widened table write policy is added.

## Transactions, concurrency and recovery

Photo writes take the same actor/request advisory lock and reserve row lock as existing writers. An immutable locator and monotonic version prevent two members overwriting a competing photo, including absent → photo → absent changes. Replacement, reference, revision and receipt commit in **one database transaction**. Removal and product deletion atomically remove the live binary; there are no orphan objects or unsafe delayed deletions to reconcile. PostgreSQL WAL/backups can retain historical bytes; this is not a secure-erasure promise.

Request receipts contain intention metadata and input hash, **never image bytes**. Browser upload bodies are held in at most one account/reserve-scoped memory entry, cleared when the first request is dispatched; session recovery stores only IDs/hash/expected path/version. A lost response retains the UUID and blocks conflicting writes. Replaying returns the historical receipt followed by a current snapshot. Recovery, including after reload, sends no body: it atomically returns the receipt or records an aborted receipt under the same locks. A delayed original upload then sees the abort and cannot commit. The user reselects the photo for a fresh request only after that resolution. Neither this nor pending metadata requests form an offline queue.

## Privacy and compatibility

Private images are downloaded through the current authenticated RPC into per-visible-image Blob URLs. There is no persistent image cache, signed URL, CDN image URL, Cache API/IndexedDB photograph or photograph in offline snapshots. Visible elements release their URLs on visibility/path/account/reserve/client change, offline transition, unmount and logout. Late responses are ignored. Downloads remain subject to the current JWT and membership at request time; already viewed pixels cannot be remotely erased. Online membership polling clears denied private views; offline revocation remains unknowable under the existing contract. Requests never forward personal locators/bytes to OFF or analytics. Existing no-referrer/CSP and app-shell-only worker rules suffice; no hosting header/settings changes are needed.

Old clients ignore the additive version, preserve absent-field metadata and can still delete products. Their existing JSON safety guard continues to block lossy export/restore when `photo_path` is non-null. JSON v1 remains byte-for-byte the same schema; no binary/path/account IDs are added. New UI explains the guard. Remove all personal photos before JSON export/restore, or use the administrative backup. There is **no portable photo archive** in this phase.

Administrative backup planning/fingerprints now include both private photo tables only when migration eight is applied. `--before-photos` accepts exactly seven applied migrations plus this one pending. Historical 4–7 migration archives remain accepted; an eight-migration archive restores the private bytes and paths with the same Auth/reserve IDs into an isolated replacement instance. Existing encrypted archive integrity, fresh-target checks and trigger-disabled transactional import remain intact. This is administrator disaster recovery, not cross-household photo import. The local fingerprint set now follows the archived history, including the pre-existing OFF gate.

## Local validation

Use only a disposable local Supabase stack. CLI status credentials are kept in process memory by fixtures; never print `supabase status -o json` or a service-role key in delivery logs.

```sh
npm run db:reset
npm run test:db
npm run test:db:concurrency
npm run test:db:api
npx supabase functions serve product-photo --no-verify-jwt
# In another terminal, against localhost only:
npm run test:photos:api
npm run db:types
npm run db:lint
npm run test:photos:browser
npm run test:backup
npm test
npm run typecheck
npm run build
npm run format:check
```

`--no-verify-jwt` is used **only for the disposable local gateway**; the handler independently validates Auth via `/auth/v1/user`. Do not use this option for hosted deployment.

Recorded results are finalized in the PR. Coverage includes both members/other household/unverified/anonymous/removed accounts, forged references, blocked processor bypass, byte/dimension/format/metadata bounds, legacy references, replacement/removal, stale/ABA versions, real overlapping HTTP replacements, deletion during upload, late-upload fencing, actual `pg_dump` binary archive/reimport, JSON restore refusal, processing-rate refusal/removal recovery, and browser scope/logout/late-response handling. The binary archive regression imports into a transaction on the disposable local database then rolls back; it is not a new hosted disaster-recovery certification.

## Exact production sequence — separate authorization required

Local results on 31 October 2026: fresh eight-migration reset; **181 pgTAP assertions**, 10 concurrency tests, existing Auth/API test and the comprehensive real photo Auth/API/Edge scenario all passed. The photo browser scenario, 13 backup tests (including real GnuPG), 361 application unit tests plus 5 instance-configuration tests passed. Typecheck, build, format check, database lint, generated types and notices check passed. Build retains the existing >500 kB main-chunk warning. No unrelated exhaustive browser campaigns were run. GitHub Actions was neither polled nor monitored.

The following is a manual runbook, **not an action performed by this PR**. Stop if any prerequisite differs; do not repair hosted settings automatically. Use the reviewed feature commit and an operator shell with the correct Supabase CLI login/project link. `<PROJECT_REF>`, `<APP_ORIGIN>` and absolute backup locations are maintainer-supplied values, never credentials committed to Git.

1. Obtain explicit authorization for the database migration, Edge deployment and frontend rollout as distinct operations. Schedule a quiet write window; resolve pending requests and retain the existing frontend artifact. Independently review the bounded binary architecture/quotas and the lack of portable photo backup. Do not merge this PR as an implicit deployment approval.
2. Run `npx supabase migration list --linked`; verify the intended project and exactly the seven existing migrations. Verify the only pending migration is `20261031000100_private_photos.sql`. Use the existing `docs/BACKUP.md` operator procedure and run `npm run backup:cloud -- --destination <ABSOLUTE_PRIVATE_ARCHIVE> --project-ref <PROJECT_REF> --before-photos`. Verify/decrypt/extract into protected storage and rehearse that seven-migration archive on the isolated local restore target with `npm run backup:restore:local -- <ABSOLUTE_PRIVATE_EXTRACTION> --project-ref <PROJECT_REF>`. Do not run fixtures on hosted services.
3. After the backup is verified, authorize/apply **only** migration eight with `npx supabase db push --linked`. Inspect the CLI's pending list before confirming; abort if any other SQL is included. Review function privileges/RLS and unchanged legacy snapshot/read/write behavior using authorized maintainer checks. Do not enable Storage or change existing Auth/RLS/Cloudflare settings.
4. Separately authorize the processor deployment. Set its exact public app origin with `npx supabase secrets set --project-ref <PROJECT_REF> PHOTO_ALLOWED_ORIGINS=<APP_ORIGIN>` (comma-separated exact origins only if multiple are intentionally supported). `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are built-in server environment values: do not copy the service key into Vite, files, commands or browser storage. Deploy with `npx supabase functions deploy product-photo --project-ref <PROJECT_REF>`; keep `verify_jwt=true` from config. No `--no-verify-jwt`, Storage change, public bucket, signed-upload permission or third-party image endpoint.
5. Separately authorize building/publishing the reviewed frontend with the existing instance configuration and normal `npm run build:cloud`/hosting procedure. There are no new Vite secrets or Cloudflare settings. The backend must precede the frontend. Do not run an intentional deployment from this task; the maintainer must follow the existing hosting authorization/release rules.
6. With explicitly authorized test products/accounts belonging to that instance, manually verify owner/member visibility, outsider denial, replace/remove/OFF attribution, logout/account switch, unsupported-format recovery and JSON guard. These are maintainer smoke checks, not permission to run local fixture scripts on production. Remove only those authorized test products through normal application RPCs. Take a new eight-migration administrative backup including both private tables and rehearse isolated recovery. Monitor database/WAL/backup size through the provider's normal authorized operational process.

## Rollback — separate authorization required

Prefer an application rollback while retaining the additive schema/data. Quiesce new photo writes, resolve/fence every pending photo intention, and retain a verified **eight-migration** administrative backup before changing deployment. Stop/remove the photo Edge function only with explicit authorization, then restore the previous frontend artifact under the existing hosting procedure. Older clients display OFF/fallback and preserve private references; JSON guards remain. Keep `read_product_photo` and the private table so a later repaired frontend can access retained photos. Do not clear product paths or drop tables as a convenience rollback.

A destructive schema downgrade is **not supplied or automatically executed**. It requires separate approval, a reviewed photo data recovery/export strategy, zero live private photo rows/references (including legacy references), no unresolved new intentions and a fresh local downgrade/recovery rehearsal. Removing migration history or dropping the table would irreversibly discard private photos and must never masquerade as rollback. Administrative archive restore goes only to a fresh isolated replacement target, never blindly over the live instance.

## Remaining acceptance limits

No hosted migration, processor deployment, hosted smoke test, full-instance disaster exercise or physical iPhone/Samsung test was performed. Browser orientation/colour, 20 MB/50 MP peak decode memory, malformed decoder CPU limits under the hosted Edge runtime, and production database backup capacity require maintainer acceptance. These are limits of this implementation's evidence, not Phase 7C work started here. The decoder is synchronous but input/resolution/memory bounded; the platform's runtime timeout remains a final CPU boundary.
