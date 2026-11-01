# Phase B — Invisible choreography

Built from verified `origin/main` **decf2c4b004590c588ea5726f3a22d74db3031c1** (PR #18), on 2026-11-01. Presentation, gestures and browser tests only. The three appearances, fonts, mascot, image sources, identifiers and business contracts are preserved. No dependency was added.

## Motion language

Contact feedback is immediate; confirmed state acknowledges a completed write. Spatial motion explains a destination or position change. Nothing loops, bounces or cascades across the catalogue.

CSS in `src/ui/foundations.css` owns the tokens. `src/ui/motion.ts` reads them for Web Animations; there is no second JS timing catalogue.

| Token                    | Duration | Use                                                       |
| ------------------------ | -------- | --------------------------------------------------------- |
| `--sb-motion-press`      | 110 ms   | Contact and release                                       |
| `--sb-motion-state`      | 180 ms   | Confirmed number, checkbox, camera/result opacity, notice |
| `--sb-motion-reflow`     | 220 ms   | Shopping positions, reveal/settle, removal collapse       |
| `--sb-motion-navigation` | 260 ms   | Page and bottom destination marker                        |
| `--sb-motion-sheet`      | 260 ms   | Native sheet and backdrop entrance                        |
| `--sb-motion-exit`       | 180 ms   | Sheet dismissal and outgoing row opacity                  |

The restricted curves are `--sb-motion-ease: cubic-bezier(.2,0,0,1)` for response/settling, `--sb-motion-enter: cubic-bezier(.2,.7,.2,1)` for entry, and `--sb-motion-exit-ease: cubic-bezier(.4,0,1,1)` for exit. Finger tracking has no easing. Displacement stays small: sheet 18px in / 12px out, number 2px, notice 4px, button 1px / 0.98 scale. No counter rolling or photo zoom.

## Five interactions

**Navigation.** The track adopts its rendered transform at gesture start, including an interrupted transition. Moves schedule one transform paint per rAF outside React, with no layout measurement per move. Release commits the destination without first writing the old origin. Tabs retarget the same transition. Cancellation, resize, blur, visibility, multitouch and blocked-state changes clear scheduled work. Edge resistance remains 18%. Fields, horizontal category scrolling, vertical scrolling, 24px system edges, camera, modal and operation guards remain protected. Checked Shopping rows own their gestures. Suppression of a gesture's synthetic click preserves fresh touch, mouse/pen and keyboard activation. An absolute bottom marker uses equal destinations; badges do not affect its geometry or the existing palette roles.

**Native sheets.** `showModal()` and focus run before paint. The backdrop fades with the sheet. Explicit dismissal samples the current presentation, including unfinished entry, and keeps native modality until exit completes. Further clicks/submissions during exit are consumed. `onClose` reconciles browser-forced closure after repeated Escape; dirty/busy editors can refuse closure before animation and reopen a forced native close. Cleanup cancels effects/listeners, calls native `close()` and restores a connected opener without scrolling.

Detail → editor, lookup → form, save/delete and owner-driven unmount remain immediate. A dismissed lookup is cancelled at the start of exit, preventing late replacement of the closing sheet. Visual viewport height/lower inset and focused-field scrolling account for resized space. Actual software keyboards remain device acceptance work. Shared-element image transfer was omitted because online/private images can arrive late and the two frames have different proportions. The existing stable contain-fit frame plus native sheet avoids duplicate photographs, stretching and loading-dependent choreography.

**Quantities.** Press acknowledges contact. Only a changed confirmed `value` animates the inner number span; the accessible wrapper and buttons keep identity/focus. Initial numbers are static. Locks/bounds and failure values remain authoritative. Rapid updates cancel the preceding number effect.

**Shopping.** Checking/unchecking changes semantic state only after persistence. Background, text and checkbox transition together. FLIP moves existing keyed rows and retargets interrupted offsets; entering the page does not cascade the list. Reveal follows the finger via rAF and adopts an interrupted reveal's current position. The red action stays painted behind the closing surface. A drag never deletes.

After confirmed removal, an inert, aria-hidden, pointer-free visual copy fades; no live control or business snapshot is retained. One **bounded list-height transition** clips it and keeps the following hint below it. This deliberate exception to transform/opacity-only animation prevents overlapping content. Geometry is read at mutation/resize boundaries; ResizeObserver skips the animated collapse. Empty state has no outgoing copy over its message. Undo retains the existing targeted unchecked addition and product association. No delayed deletion or global snapshot restoration was introduced.

**Scanner.** Running video, target/status, ready/result and next controls use brief opacity changes. Mode selection uses its existing semantic colours. Result emphasis exists only inside the existing confirmed `lastScan` branch: detection, loading, rejection and uncertainty receive no success effect. No flash, scanning line or permanent animation. Recognition, deduplication, intentions, correction/undo and existing haptic remain unchanged. Camera release stays independent of presentation and is never delayed.

Secondary options and ordinary notices fade briefly. Error/offline/conflict lifetimes and announcements stay owned by the existing application. Important errors do not get a decorative entrance or shorter lifetime. Fields and language/theme changes keep component identity.

## Reduced motion and performance

Reduced-motion tokens become zero. Scoped CSS disables keyframes, transitions and press transforms. JS checks the live preference before creating an effect; preference changes or backgrounding finish existing effects and cleanup, including exits and Shopping copies. No JS reflow/collapse is created in reduced mode. Direct user-controlled dragging remains available, with immediate settling. Movement never carries essential information alone.

No animation library, permanent `will-change`, per-frame React state, cloning during touch movement or business timer was added. Copies exist only during confirmed removal. Modal replacements and camera cleanup never await animation. See [measurements and temporal evidence](EVIDENCE.md), including CPU ×4 results that still contain long tasks.

## Validation

`npm run test:motion:browser` is in the Application et PWA CI job. It verifies rendered release trajectory, exact final transforms, gesture interruptions/arbitration, repeated native closure, focus/draft/viewport preservation, held/rejected/uncertain writes, Shopping check/reveal/delete/undo, paused removal clipping/inertness, live CSS/JS reduced motion, late images, three themes and 320/375/430/1100px. It awaits semantic state and actual animation completion, with no prescribed frame count or arbitrary animation sleep. Synthetic event clocks distinguish slow/flick release; real CDP touches exercise the main gestures. Trace: `.tmp/motion-transitions.zip`.

| Local check                                                                                  | Result                                                                                                         |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                                                   | 359 application tests + 5 configuration tests passed                                                           |
| `npm run typecheck`, `npm run build`, `npm run format:check`                                 | Passed; existing >500 kB main-chunk advisory remains                                                           |
| `test:ui:browser`, `test:polish:browser`, `test:themes:browser`, `test:motion:browser`       | Passed in headless Chrome                                                                                      |
| `test:i18n:browser`, `test:off:browser`, `node scripts/browser/shop-scanner.integration.mjs` | Passed; bilingual forms, late lookup, synthetic camera, correction/undo/release                                |
| `test:pwa:browser`                                                                           | Passed; explicit activation, drafts, pending/other-window guards, offline/server failure                       |
| `test:phase5:browser`, `test:scanners:browser`                                               | Passed on local Supabase; fictitious accounts, real RPCs, loss/replay, offline/reconnect, two scanner contexts |

Existing tests now await dialog detachment before typing into previously inert background controls. OFF still resolves its late lookup **during** dismissal. No migration/type change required a database reset or regeneration. PR CI, including backend security/restoration, must be read on the latest head, independently of this local report.

## Remaining acceptance

Phase B has **not** been tested on physical iOS Safari, Android Chrome, installed PWA chrome/safe areas, real software keyboards, optical barcodes or assistive technology. Viewport resize simulates available space, not an OS keyboard or gesture. The visibility test dispatches the event; camera suites use synthetic streams/decoding. WebKit/native dialog/focus/camera compositing remain device risks. CPU ×4 results do not establish 60 FPS on phones. No hosted mutation, migration, manual deployment or merge is part of this delivery.
