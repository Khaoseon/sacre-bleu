# Phase 7A verification · 30 October 2026

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
