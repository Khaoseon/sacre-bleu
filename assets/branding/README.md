# Sacré bleu mascot and icons

The established illustrated blue grocery bag was created by the application's second user and supplied for the app's branding. It is reused without redesign. The restrained navy (`#0d3161`), blue and cream palette in the artwork supplies the README's visual identity; the README references the existing 192 px icon, displayed at 112 px. No new bitmap, screenshot or font was introduced for Phase 6B2.

## Permission and credit before publication

The creator has agreed in principle to redistribution under MIT. **Written confirmation must be retained before public release**, and the maintainer must finalize their preferred public credit. No legal name or completed written authorization is asserted. Until resolved, the root MIT license for project code/documentation is not a claim that this separate artwork grant is already complete. Do not put private correspondence into the public repository; record completion and the approved public credit here when available.

Affected artwork: `sacre-bleu-source.png`, `icon-master.png`, and all six PNG derivatives in the table below. Proposed credit for review: “Mascot by the app's second user”; replace only with the creator's agreed preference. This is a public-release prerequisite, not a request for another design.

## Source and deterministic derivatives

`sacre-bleu-source.png` is the original supplied 1080 × 1350 image, retained unchanged outside the published directory. The central region `(x=300, y=350, width=480, height=650)` was resized/centered on its original opaque navy background, removing outer margins without redrawing illustrated elements. Sharp 0.35.5 was available in the tooling environment; it is not a project build dependency.

`icon-master.png` is a 1024 × 1024 square master with the drawing centered at 880 px high. It is not published or precached. Only useful derivatives are served:

| Public file            | Dimensions | Use                                                    |
| ---------------------- | ---------- | ------------------------------------------------------ |
| `icon-192.png`         | 192 × 192  | Android PWA; README illustration                       |
| `icon-512.png`         | 512 × 512  | High-resolution PWA icon                               |
| `icon-maskable.png`    | 512 × 512  | Android adaptive icon, drawing centered at 352 px high |
| `apple-touch-icon.png` | 180 × 180  | iPhone home-screen icon                                |
| `logo.png`             | 96 × 96    | Application header, displayed at 40 px                 |
| `favicon.png`          | 32 × 32    | Browser tab/bookmark                                   |

The operating system applies rounding/masks; retain the opaque background and adaptive safe area rather than adding white margins. Declarations live in `vite.config.ts` and `index.html`. Correct build files do not certify a phone's installed icon: an older shortcut can keep an old image. Physical acceptance and icon update remain separate from asset verification.
