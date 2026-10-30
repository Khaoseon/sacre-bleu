# Sacré bleu mascot and icons

Mascot by **Eloane ROURE**. The original artwork and its derivatives are redistributed under the [MIT license](LICENSE), with the creator's copyright retained. The maintainer confirms that permission has been obtained for MIT redistribution of the original and derivatives and authorizes this public credit. This records the maintainer's confirmation; no private correspondence is included or independently certified.

Affected artwork: `sacre-bleu-source.png`, `icon-master.png`, and all six PNG derivatives below. Preserve the artwork license when redistributing these files. The existing blue grocery bag is retained without redesign.

## Source and deterministic derivatives

`sacre-bleu-source.png` is the supplied 1080 × 1350 image, retained outside the published directory. Phase 6D removed private Canva team/account/document metadata and normalized its author credit to Eloane ROURE; the compressed pixel stream is unchanged. Nonprivate AI-source provenance remains. The original metadata remains in Git history with the maintainer’s explicit authorization for historical disclosure: see the [exposure review](../../docs/RELEASE.md#public-exposure-audit). The central region `(x=300, y=350, width=480, height=650)` was resized/centered on its original opaque navy background, removing outer margins without redrawing illustrated elements. Sharp 0.35.5 was available in the tooling environment; it is not a project build dependency.

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
