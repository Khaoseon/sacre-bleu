# Phase 7B-C — complete UI integration

Integrates the remaining production surfaces on `feat/v1.1-7b-c-app-finishing`, targeting `release/v1.1`, from merged 7B-B baseline `d880e0d`. Uses the approved [7B foundations](PHASE7B1.md) and [final 7A decisions](phase7a/final/README.md).

## Completed surfaces

- Authentication and membership gates adopt warm paper, blue ink, local Manrope/Fraunces fonts, accessible fields and consistent actions. Sign-in/signup, confirmation, invitations and account isolation keep their existing operations and messages.
- Settings before sign-in and within the app share spacing, language selection, theme choices, account/reserve disclosures, membership cards and application information. All five resolved palettes use semantic tokens; narrow theme choices stack without reducing text or targets.
- Export, file selection and restoration previews receive readable safety copy, wrapping comparison tables, comfortable confirmation labels and coherent destructive controls. The owner restriction, online requirement, recovery download, explicit checkbox, stale-revision protection and uncertain-request recovery remain unchanged.
- Offline/read-only and recovery messages, errors, warnings, confirmations, feedback toasts and update surfaces adopt the same visual language. The header status dot no longer stays green during offline, stale, pending or saving states; its existing text remains authoritative. No optimistic success is introduced.
- Native dialogs retain modal semantics, viewport/keyboard fitting, Escape handling and return focus. Settings now start on their visible title instead of a visually hidden theme radio. Existing forms still focus their first field. Native radio keyboard navigation remains available.
- The empty, unfiltered pantry uses the original mascot without recolouring; search misses retain the search icon. Product imagery remains contain-fit with its existing fallback/provenance. Stock, Shopping and Scanner compositions remain intact.

`src/ui/finishing.css` is a scoped extension of the existing foundations, with no new dependency or component architecture. Business rules, persistence, RPCs, update controller, security and account boundaries are unchanged. Existing French/English catalogue strings and stored identifiers are retained.

## Local verification

- `npm test`: 353 application tests in 26 files plus 5 instance-configuration checks passed.
- `npm run typecheck`, one `npm run build`, `npm run format:check` and `git diff --check`: passed. The existing main-chunk warning remains (approximately 644 kB minified).
- `node scripts/browser/i18n.integration.mjs`: passed; FR/EN Auth/demo, immediate switching, form/focus preservation, storage failure and 320px layouts.
- `node scripts/browser/shop-scanner.integration.mjs`: passed; existing shopping and scanner operations, failed persistence, camera lifecycle with synthetic decoder, 320px controls, English, themes and reduced motion.
- `node scripts/browser/finishing.integration.mjs`: targeted local presentation check for Auth drafts, visible initial focus and keyboard navigation, reduced-motion sheet entrance, English settings, 320px restoration guards, five palettes, offline/uncertain recovery and a simulated update notice with Later. The update notice fixture does not validate service-worker activation. All external requests are blocked.

Four representative captures only: [authentication](phase7bc/authentication-en-375.png), [preferences](phase7bc/preferences-en-375.png), [restore preview](phase7bc/restore-en-320.png), [uncertain request](phase7bc/uncertain-en-375.png). Screens use disposable fixtures; the authentication capture includes development-only signup, which remains absent in Cloud mode. The restore preview deliberately scrolls to expose all safety information rather than condensing or hiding it. No full screenshot matrix was repeated.

## Remaining gaps and boundaries

Private-photo integration remains 7B-D. Themes retain their existing palette adapters and names; this does not introduce a separately designed dark-blue palette. Existing unavailable multi-unit stock and deletion compensation workflows remain unchanged. Long restoration previews require vertical scrolling, especially with a keyboard or enlarged text.

No physical iPhone/Safari/Android, installed PWA, real camera/lens/torch, screen-reader or real mobile keyboard acceptance was performed; focused desktop Chrome emulation does not certify those devices. Production service-worker activation and the backend/two-account browser matrix were not rerun for these presentation-only changes. Final device/accessibility acceptance belongs to Phase 7C, which is not started here.

No migration, generated-type change, backend/database campaign, hosted Supabase operation, production deployment or merge. Commits retain `[CF-Pages-Skip]`; only the requested feature branch is published. GitHub Actions are never polled or monitored as part of this delivery.
