# Phase 7B-B — shopping and real scanner

Based on approved integration `8fcdebc`, targeting `release/v1.1`. Uses the 7A unified-shopping/session-scanner compositions with the existing production operations.

- One shopping input searches name, brand and barcode. Catalogue suggestions explicitly link a product; the separate free-text action never infers a link. Linked repeats accumulate through the existing operation. Rows prioritize checking and disclose quantity/deletion controls. Completed rows can be cleared.
- Replenishment opens from Stock or Shopping in a focused sheet. Each shortage has an immediate, individually confirmed add; active linked rows stay disabled. Zero stock without a minimum remains informational. No new threshold rule or claimed atomic batch is introduced.
- The existing CameraScanner/CameraSession and lazy ZXing decoder remain in use. Add/Remove stays visible; detection/pending, confirmed result, failure and uncertain recovery are distinct. Results hold recognition until Continue or explicit Repeat. Continue preserves the presentation latch; Repeat creates a new existing scan intention. Correction uses absolute totals and Undo uses the existing authorized compensation. OFF credits remain available below the primary controls.
- Manual entry pauses recognition. Unknown Add retains editable OFF/manual creation followed by an identified scan. Unknown Remove explicitly saves without removal. Pending intentions, current-snapshot confirmation, recovery UUIDs, revision invalidation, offline write locks and track cleanup retain their existing contracts.

## Validation and limits

Local: `npm test` (353 application tests and 5 configuration checks), `npm run typecheck`, `npm run build`, `npm run format:check`, `git diff --check`; focused `shop-scanner.integration.mjs`, `off.integration.mjs` and `i18n.integration.mjs` browser checks. The build retains the existing main-chunk size warning.

The focused check uses production components and disposable local fixtures, browser media streams with a synthetic decoder, and a denied-permission case. It covers 320×568 controls, held presentation/repeat, correction/undo, linked shopping, persistence failure, FR/EN and all five palettes. Existing unit tests exercise real ZXing decoding of synthetic rasters, camera lifecycle and store receipt/snapshot, uncertainty and concurrency rules. This is not physical camera, lens/torch, iOS/Android/PWA or assistive-technology acceptance. Provider responses are fixtures; no hosted service is exercised. The backend/two-account browser matrix was not rerun locally; its scanner journey now explicitly continues between presentations.

Deletion Undo remains unavailable: there is no authorized row/tombstone restoration contract. Recreating rows or restoring snapshots would bypass the required compensation guarantees. Replenishment adds are individual operations, without multi-selection/atomic-batch semantics. No migration, generated-type edit, dependency, hosted operation, merge or deployment. Commits retain `[CF-Pages-Skip]`; only the requested feature branch is published. GitHub Actions are not polled or monitored. 7B-C is not started.
