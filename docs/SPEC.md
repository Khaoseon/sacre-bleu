# Product rules

This is the current English specification, consolidated from the [French development record](history/SPEC_FR.md). It describes implemented behavior, not a promise that every device scenario has been validated. See [scope](PLAN.md), [testing](TESTING.md) and [installation](INSTALL.md).

## Purpose and boundaries

Sacré bleu is a personal, mobile-first pantry PWA for two confirmed accounts sharing one reserve. The French (default) and English interface has Stock, Scanner and À acheter/Shopping views, keyboard/touch controls, themes and device-local sort preferences. Products count whole packages, not opened-package contents. Expiry dates and storage locations are out of scope.

Production Cloud mode has no public signup or reserve-creation UI. Independent administrators privately provision accounts and initialize the first reserve through the authorized helper in INSTALL.md. Local development permits signup with Mailpit confirmation. The isolated demo uses local examples and never becomes a fallback for a failed shared write.

## Catalogue, stock and shopping

A product has a required name, optional barcode/brand/package size and unit/category/minimum, and a quantity from 0 through 9999. Barcodes are strings; leading zeroes matter. A non-null barcode is unique within a reserve. Distinct brands/packages can have distinct products; no fuzzy merge by name. Zero stock preserves the product, displayed with exhausted items at the bottom. Search is accent-insensitive; alphabetical/recent sort is local.

Creating a product writes catalogue and stock together. Existing-product edits change metadata/minimum only; stock buttons apply deltas independently so a form cannot overwrite a newer quantity. Deletion requires confirmation and detaches linked shopping rows into free-text items transactionally. Shared private photo uploads are disabled; future `photo_path` references are preserved. OFF images have separate provenance and licensing.

Shopping entries are free-text or explicitly product-linked. Free-text items never merge by similar name. Only one unchecked linked entry per product is allowed; repeated additions accumulate quantities. Checking retains quantity; unchecking zero restores at least one. Explicit quantity changes uncheck unless a check state is also supplied. Minimum thresholds suggest entries but never add them automatically.

## Scanner

Camera activation is explicit, in a secure context, with manual entry available. EAN-13, EAN-8 and UPC-A are supported with stable/checksummed recognition and a presentation lock. Keeping a code visible is not a request to add it repeatedly; withdrawal/re-presentation or an explicit repeat can create another intention. See [SCANNER.md](SCANNER.md) for timing and UPC representation.

Ajouter is the initial mode. A recognized known product automatically applies a positive or negative movement. A positive scan atomically updates stock and reduces unchecked product-linked shopping, checking at zero. A negative scan does not change shopping. Stock buttons outside the scanner do not touch shopping or the scan counter.

Adjustments send an absolute processed total, not another blind delta. Undo is a targeted compensation. The scan author, scan version, stock/shopping state and reserve revision must still match. Any later reserve mutation can invalidate correction/undo; refuse explicitly instead of overwriting newer work. Example: stock 0/shopping 5 → scan +1 gives 1/4 → total 5 gives 5/0 → total 3 gives 3/2 → undo gives 0/5.

For an unknown code, personal catalogue lookup precedes OFF and editable manual entry remains available. In Ajouter, create at zero then submit an identified scan for the chosen amount. Interrupted movement recovery retains its UUID; undo keeps the created product at zero. In Retirer, an unknown product is created with the entered initial quantity without an automatic removal. No automatic product creation occurs before form validation.

Pause detection during a modal or uncertain operation. Leave the stream alive during a product lookup, but release camera tracks on exit/background and require explicit resumption after interruption. Late lookups cannot replace manual input. No camera frames are uploaded by the decoder.

## Shared state and privacy

PostgreSQL is authoritative. All shared mutations use authorized RPCs and idempotent intention UUIDs. The client requires a server receipt and current snapshot before success; uncertain writes block further mutations and retain their exact intention in account/reserve-scoped `sessionStorage`. A replay returns the original receipt, followed by a current read. Poll every five seconds while visible, and refresh on foreground/reconnection or explicit request.

Invitations are owner-only, targeted to a confirmed email, expire after 24 hours and allow at most two members. New invitations revoke older usable links. Only a token hash is stored server-side. The secret is shared in the URL fragment, consumed in memory and immediately removed from the URL; it must not enter logs or durable browser storage.

The last confirmed private snapshot is cached separately by backend project/account for read-only offline use. Signout removes private views, pending intentions and cache; late responses cannot restore them. Offline access cannot discover remote revocation and is not encrypted. No offline write queue. See [PHASE5.md](PHASE5.md) for expiry, cache failures, JSON export and transactional replacement.

## PWA and navigation

App-shell resources are cached by the service worker; private API responses are not. Camera decoding is a separate lazy-loaded same-origin chunk. Updates offer Actualiser/Plus tard and activate/reload only after the user's action and checks for forms, pending/uncertain work, scanner activity and other windows. No automatic clearing of Auth/demo/private storage to force an update.

Mobile edge swipes navigate Stock → Scanner → À acheter without wrapping; buttons remain available. Interactive fields, vertical/multi-touch gestures and busy/modal states are protected. Android requests fullscreen; actual behavior and icon refresh depend on the browser/OS. Installed-device acceptance is separate from responsive/browser testing.

## Interface language

The existing settings include Français/English before sign-in, in the demo and in the shared pantry. Switching is immediate and preserves forms, Auth and confirmed/pending operations. Only a separate device-local display preference is written; signout retains it. Missing, invalid or inaccessible storage defaults to French on startup. Storage-write failure keeps the selection in memory and announces the failure. Categories/units are translated only for display; user/provider text, backups and RPC contracts stay unchanged. See [I18N.md](I18N.md).
