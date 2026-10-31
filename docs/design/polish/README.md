# V1.1 mobile polish

This branch starts at the actual remote `main`, `d74a7bac732b1e58974139ed8807ad7dea4dcb6e` (V1.1 production release), rather than the older prototype reference. PR #9 is already merged; its final head is `295d0371cba7abf53f648116c01f5a5b6a07147a`. No hosted application or service was used for these checks. The mission attachment contained the brief; additional device screenshots were not available in this workspace.

## Implemented behavior and causes

- The permanent last-sync timestamp is now in Preferences. The header retains its compact live status; offline/read-only, stale data, cache failures, errors and pending intentions remain visible. A refresh button in Preferences performs the existing snapshot read.
- Product sheets previously rendered the shared `recovery` JSX unconditionally, including its successful-state fallback and refresh action. The recovery component now renders only when a problem/pending intention exists, and never calls a ready pantry a warning. Ordinary success feedback expires after five seconds; errors remain explicit.
- The camera preview previously had a 120px phone override (96px after a result). Idle and active previews now scale with viewport height, retaining a compact confirmed-result view and a short-screen exception so correction, repeat and manual entry remain reachable. Safe areas and existing camera teardown/recognition/ROI behavior are retained. Camera controls use explicit high-contrast overlay roles.
- The circular shopping check inherited an older square `::before` on phones. That pseudo-element is removed at its source. The control exposes checkbox semantics and the entire completed row uses a readable muted surface, tick and strikethrough.
- Checked rows reserve their horizontal gesture through `data-no-swipe`. Direction/intent locking, vertical scrolling, multiple touches, cancellation, system edges and a protected options area prevent accidental page changes. Dragging reveals a red localized action; only an explicit press deletes. The same action remains in keyboard-accessible row options. Escape closes a revealed action and restores checkbox focus.
- Deletion waits for persistence/receipt and snapshot confirmation. A temporary notification offers targeted undo, pauses its timer during hover/focus, and receives keyboard focus when its deleted trigger disappears. It is portaled outside the translated page track so fixed positioning remains correct. Duplicate submissions are fenced locally and uncertain shared writes retain their existing durable intention.
- Dark/custom palettes inherited semantic roles pointing at legacy roles which the app then pointed back at the semantic roles, forming CSS variable cycles. Palette values now have one source and the semantic adapter points only toward it. Slate, cream and petrol have matching surfaces, borders and primary controls; dark primary text is paired with its own light fill. Automatic and the pre-paint preference script remain unchanged.
- Search and sort had both wrapper `:focus-within` and control `:focus-visible` outlines. The wrappers no longer own focus: each actual control retains one keyboard outline. Sort spacing, open shopping options, detail metadata and missing-photo whitespace are refined without removing useful information or actions.

## Undo behavior under the existing RPC contract

Deletion is sent immediately and the row disappears only after the write and current snapshot are confirmed. A delayed device-only deletion would leave a row visible to the other member during the grace period, allow that row to change before a later destructive write, and lose an unsent intention if the PWA closes. The application has no shared reversible-delete protocol or offline write queue. Delayed deletion was therefore rejected.

As explicitly selected by the maintainer, Undo **puts the item back on the list as unchecked**, preserving its product association. It uses the existing atomic add_shopping operation, with the original quantity or at least one package for an item previously at zero. If another member has already added the linked product, quantities accumulate through the established rule. Free-text entries remain independent. No global snapshot is restored and neither stock nor scan data is overwritten.

The notification says that Undo puts the item back on the shopping list; it does not claim to restore its previous checked state. Shared success still requires a receipt and current snapshot, and uncertain responses retain the same intention UUID. If the linked product was deleted meanwhile, re-adding is explicitly refused instead of silently converting to free text. The user may dismiss the notification; real errors and recovery remain visible. No backend change is needed.

## Visual evidence

Actual local Chrome captures use synthetic inventory and block external requests. Camera imagery is the browser's synthetic device, not a physical optical test. Before captures use the unchanged production App through the existing isolated harness; matching after captures use the same harness and viewport.

| Surface            | Before, 375px                             | After, 375px                            |
| ------------------ | ----------------------------------------- | --------------------------------------- |
| Stock              | [Before](screenshots/before-stock.png)    | [After](screenshots/after-stock.png)    |
| Completed shopping | [Before](screenshots/before-shopping.png) | [After](screenshots/after-shopping.png) |
| Scanner idle       | [Before](screenshots/before-scanner.png)  | [After](screenshots/after-scanner.png)  |
| Dark scanner       | [Before](screenshots/before-dark.png)     | [After](screenshots/after-dark.png)     |

| Palette      | Stock                                          | Shopping                                          | Scanner                                          |
| ------------ | ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Light sage   | [View](screenshots/light-stock-375.png)        | [View](screenshots/light-shopping-375.png)        | [View](screenshots/light-scanner-375.png)        |
| Dark sage    | [View](screenshots/dark-stock-375.png)         | [View](screenshots/dark-shopping-375.png)         | [View](screenshots/dark-scanner-375.png)         |
| Slate        | [View](screenshots/slate-stock-375.png)        | [View](screenshots/slate-shopping-375.png)        | [View](screenshots/slate-scanner-375.png)        |
| Retro cream  | [View](screenshots/retro-cream-stock-375.png)  | [View](screenshots/retro-cream-shopping-375.png)  | [View](screenshots/retro-cream-scanner-375.png)  |
| Retro petrol | [View](screenshots/retro-petrol-stock-375.png) | [View](screenshots/retro-petrol-shopping-375.png) | [View](screenshots/retro-petrol-scanner-375.png) |

Further captures: [revealed deletion](screenshots/shopping-revealed-375.png), [Undo notification](screenshots/shopping-undo-375.png), [completed dark row](screenshots/dark-completed-375.png), [completed petrol row](screenshots/retro-petrol-completed-375.png), [product sheet](screenshots/shared-detail-375.png), [Preferences and last sync](screenshots/shared-settings-375.png), [offline](screenshots/shared-offline-375.png), [uncertain write recovery](screenshots/shared-recovery-375.png), active camera at [320px](screenshots/camera-active-320.png), [430px](screenshots/camera-active-430.png), [landscape](screenshots/camera-active-812.png) and [desktop](screenshots/camera-active-900.png). The evidence directory contains 38 captures, including completed rows in all five palettes.

## Validation

`npm run test:polish:browser` exercises the production App with synthetic local data and the real shared store over an isolated in-memory transport. It checks completed/uncompleted state, touch direction and threshold, cancellation, multitouch, vertical scroll, explicit deletion, targeted undo, keyboard alternative/focus, FR/EN labels, all five themes, Automatic/system changes and reload, control focus versus wrapper focus, confirmed-write timing, offline/recovery, sync date placement and responsive camera dimensions. It is included in PR CI. `--before` is reserved for a baseline checkout; it should not overwrite preserved before captures on the changed branch.

The existing shopping/scanner browser regression additionally exercises a real synthetic stream with a controlled decoder, permission denial, manual fallback, correction/undo, known/unknown products, linked-shopping reduction, camera cleanup and controls above navigation at 320×568. The navigation and i18n browser regressions verify existing gestures, modal/keyboard guards, form/language preservation and storage failure. Pure/model/store tests include product-link retention, zero-to-one re-addition, concurrent accumulation, unchanged stock, deleted-product refusal and exact uncertain-intention replay.

Final command results and CI are recorded in the PR. The repository has no separate lint command; strict TypeScript and Prettier are its applicable static checks.

Local results on 2026-10-31: `npm test` passed 370 Vitest tests and 5 configuration tests; `npm run typecheck`, `npm run build`, `npm run format:check` and `git diff --check` passed. `test:polish:browser`, `test:ui:browser`, `test:i18n:browser` and `node scripts/browser/shop-scanner.integration.mjs` passed in Chrome. The polish suite also verifies Undo expiry/focus, concurrent linked additions and a subsequent positive scan consuming the re-added linked shopping. Vite reports a non-failing chunk-size advisory (main chunk about 658 kB uncompressed); the decoder remains a separate lazy chunk. No dependencies were added.

## Remaining manual acceptance and risks

- Physical iOS Safari, installed iOS PWA and Android Chrome/PWA were **not tested**. Verify live optics at the larger viewport crop, camera denial/resumption, background release, torch/lens selection and barcode withdrawal/re-presentation on actual devices.
- Verify browser chrome and installed safe areas in both orientations, system back gestures beside checked shopping rows, VoiceOver/TalkBack checkbox/Undo announcements, keyboard appearance with a focused final product field, sheet scroll retention and 200% text/zoom.
- The existing camera ROI maps the visible preview to source pixels; changing preview proportions changes the sampled region's geometry even though the decoder implementation is untouched. Optical acceptance remains necessary.
- Undo intentionally re-adds an unchecked item rather than restoring the previous checked state, as requested. The local browser transport validates frontend/store sequencing, not new server behavior; no local database fixtures or hosted mutations were run for this frontend-only change. Existing backend CI remains authoritative for the unchanged RPCs.
- No database schema, migration, RLS, Auth, Edge Function, secret, production configuration, deployment or merge is part of this branch.
