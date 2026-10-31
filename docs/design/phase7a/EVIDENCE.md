# Phase 7A.2 · current verification

[Current validation, defect regression map and limits](convergence/VALIDATION.md) · [Interactive comparisons and decision record](convergence/README.md) · [All actual captures](convergence/SCREENS.md). The dated 7A / 7A.1 results below remain historical evidence.

# Phase 7A verification · 30 October 2026

## Phase 7A.1 refinement

Current source is the refinement documented in [REFINEMENT](REFINEMENT.md). The original Phase 7A results below are retained as dated baseline evidence.

The refinement's local `npm test` passes **334 Vitest tests in 24 files**, including six gesture-intention cases, plus five configuration tests. `npm run typecheck`, `npm run typecheck:7a`, `npm run build` and `npm run build:7a` pass. The normal build retains its pre-existing main-chunk warning. The prototype is about 99 KB gzip JS and 5.4 KB gzip CSS, plus original review imagery and about 264 KB self-hosted fonts; none enters normal production output.

`npm run test:7a:browser` passes the revised responsive and interaction matrix. It captures clean fixtures **before** running mutation tests. Four viewports (320/375/430/900 px) each cover stock, warning, scanner, immediate confirmation, shopping, English shopping, detail, editing, empty, offline, reduced-height keyboard geometry, mixed images, personal-photo example and OFF provenance. Finite transitions, local fonts and visible image decoding are awaited; no result screenshot scrolls to find the confirmed scan. Original 7A screenshots are preserved under `screenshots/before/` for comparison.

Assertions include 12 px minimum warning type, warning visibility at every width, confirmed result/repeat/manual controls above the navigation without scrolling, sticky-save visibility **and focused-field clearance**, consistent empty counts, photo tap-versus-swipe arbitration and 1:1 intermediate track movement. Shopping tests exercise both quantity directions, checking/unchecking, quantity-triggered unchecking, product-linked accumulation, removal and clearing only completed entries. Editing tests retain the draft after failure, then confirm a retry; photo selection/removal remains session-only. Scan correction/undo, new-product retention at zero, uncertain/offline blocking, guarded gestures, English user-content preservation, keyboard and reduced-motion checks remain.

The run asserts no remote runtime request, JS exception, persistent account storage or service worker, and scans the normal production bundle for prototype imagery/fonts/markers. Public font/image downloads were development-time fixture acquisition only. Actual iOS/Android keyboard, Safari, camera recognition, physical gestures and installed-PWA acceptance remain unverified. No hosted backend work was performed.

`npm run format:check` and existing V1 navigation/i18n browser regressions also passed. Empty-state primary actions and the first offline stock controls are explicitly checked above navigation at all four widths. Remote PR CI is a separate execution on the exact pushed head; its status is reported in the handoff instead of inferred here.

## Executed locally

| Command                     | Actual result                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                  | Passed: 23 Vitest files, 328 tests, plus 5 instance-configuration Node tests.                                                                                   |
| `npm run typecheck`         | Passed.                                                                                                                                                         |
| `npm run build`             | Passed. Existing >500 KB main-chunk warning remains; no attempt to change the production build architecture in a design exploration.                            |
| `npm run typecheck:7a`      | Passed with strict TypeScript.                                                                                                                                  |
| `npm run build:7a`          | Passed; separate output under `.tmp/phase7a-build`. Approximately 97 KB gzip JavaScript, 4.9 KB gzip CSS, plus deliberately unoptimized synthetic PNG fixtures. |
| `npm run format:check`      | Passed.                                                                                                                                                         |
| `npm run test:7a:browser`   | Passed in installed headless Chrome. Checks listed below.                                                                                                       |
| `npm run test:ui:browser`   | Passed existing V1 navigation, edge/cancel/scroll/modal/camera/keyboard/form checks, no stock or external requests.                                             |
| `npm run test:i18n:browser` | Passed existing V1 FR/EN, Auth/demo presentation, focus/form/category preservation, validation, reload/storage-failure/320 px checks; zero external requests.   |
| `git diff --check`          | Passed.                                                                                                                                                         |

No database migrations, generated types or backend behavior changed; no local/hosted database fixtures were needed for this prototype. Full backend CI remains configured and is a separate run on the PR. Do not infer its remote outcome from these local results.

## Browser assertions

`explorations/7a/verify.mjs` uses disposable browser contexts and intercepts all non-loopback requests. It asserts no external request, runtime exception, localStorage write, sessionStorage journal or service worker registration.

- No horizontal document overflow at 320 × 568, 375 × 812, 430 × 932 and 900 × 932.
- Content-origin forward/reverse swipes at 320/375/430 px; short/vertical/cancelled/system-edge and interactive-image gestures stay put; active simulated camera blocks swiping. Navigation is bounded in the hook; production's separate bounds and modal guards remain covered by its existing suite.
- Counts stay unchanged during simulated receipt delay, change after confirmation and stay unchanged on a failed write. Offline disables mutations.
- Detail/edit, successful metadata update, local file selection and removal, scan simulation, scan undo, free-text shopping addition and confirmed completion.
- Unknown positive scan creates the chosen quantity; undo preserves its new product at zero. Deletion opens a confirmation and cancellation preserves the product.
- Search, French/English switch, unchanged user text, keyboard navigation and reduced-motion transition removal.
- Normal `dist/assets` contains neither the 7A marker/style/fictional brands nor the synthetic image names.

This is focused regression evidence, not exhaustive gesture/human accessibility testing. No physical iPhone/Samsung, Safari/WebKit, real camera, live OFF, Auth session, two-account photo share or installed-PWA campaign was performed. Alternate themes and secondary Auth/backup screens are specification-only in 7A; the existing production implementations remain intact.

## Actual rendered evidence and refinement

Twelve PNGs in `screenshots/` are captured from the working React app by the browser script, with real image/font decode awaited. The full workflow is reproducible from the walkthrough in [README](README.md). A recording was not captured; the script and walkthrough provide interaction evidence.

Visually inspected actual renders for stock at 320/375/430 px, detail/edit, scanner/result and shopping. Initial stock composition hid quantity controls below the first viewport. Refinement reduced header spacing and photograph aspect height; compact short phones now use a horizontal product row and vertical quantity control. Taller phones retain two columns; wider browsers use three. This density change is responsive, not a new navigation destination.

Scanner result refinement collapses the inactive viewfinder and preserves explicit repeat/total/undo controls. The result screenshot is deliberately scrolled to show the whole confirmed card; it is not represented as the initial scanner viewport. Shopping evidence waits for the success notice to dismiss. Editing evidence shows the real scrollable sheet and retained input focus, before the file-picker test replaces/removes its image.

Screenshots contain synthetic fixtures only. Generation prompts and unchanged mascot attribution are recorded in [ASSETS](../../../explorations/7a/ASSETS.md). The warm packshots are generated raster assets; the screenshots themselves are browser captures.

The first sandboxed local server was unreachable because sockets were restricted. Restarting the loopback-only server with reviewed execution permission resolved it; final browser runs passed. A separate automatic-approval usage-limit interruption prevented one attempted run from executing; after resumption the checks above executed successfully. No approval rejection was bypassed.

## Review boundary

Technical checks do not approve the design. Maintainer review must decide composition, typography fallbacks, density, detail-to-edit flow and future photo scope before 7B. [Safety](SAFETY.md) records release isolation, observed Pages restrictions and required manual release-branch protection. No merge, hosted photo implementation, production deployment or V1.1 release belongs to this delivery.
