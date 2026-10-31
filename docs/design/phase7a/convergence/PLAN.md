# Phase 7A.2 execution and traceability

Baseline: `8348e202cd6422fed6eff23f9ff1daa9c264b966`, clean working tree, feature branch only. PR #9 is open, unmerged, targeting release/v1.1. Read SPEC, PLAN, I18N and the 7A.1 design/evidence/photo/safety dossier. Preserve its actual captures and executable reference.

## Audit before implementation

- Confirmed: scan total allows zero and ignores scanQuantityLimit; catch-all simulation error; unknown Remove immediately opens creation; result DOM differs from CSS order; no useful scan identity announcement; unrelated draft blocks swipe; weak fallback/checkbox contrast, 14px search; no dirty-form close guard; reconnect button merely changes scenario.
- Design: repeated framed catalogue cards, intrusive pencils, generic detail modal, fragmented scanner, administrative shopping rows, replenishment link lacks relevant actions.
- Compare: photographic shelf vs compact list; object-led vs compact split detail; baseline vs unified shopping/session scanner. Same fixture state for comparisons, no persistent layout preference.
- Business-rule boundaries: stock delta outside scanner must not touch shopping; replenishment minimum semantics unchanged; zero without threshold separated; removal undo must compensate safely; unknown Remove requires explicit creation choice.
- Device-only: Safari recognition/keyboard/safe area/system gesture, real screen reader/haptics and installed PWA remain unverified.

## Execution sequence

1. Preserve runnable 7A.1 baseline and create focused comparison navigation.
2. Recompose inventory/detail, atomic proposed multi-quantity adjustment, progressive editor/photo/draft guard.
3. Unified shopping entry and recoverable removal, explicit replenishment sheet, coherent scanner states and classified errors.
4. Move swipe animation updates outside React render; test realistic image/long-name/100/300-product fixtures.
5. Browser review at all seven requested sizes, English/zoom/landscape/reduced-height cases; capture clean comparisons, fix observations, run required regressions.
6. Write concise decision/evidence report, verify isolation, commit with CF-Pages-Skip, push feature only and update PR #9 without merge/deployment.

## Acceptance checklist

| Requirement                                                          | Evidence destination                              |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| A photographic + compact + baseline, direct/atomic quantity          | Comparison inventory + browser regression         |
| B two details, direct stock, progressive full editor, safe close     | Comparison details + editor regression            |
| C unified explicit links, full actions, removal undo                 | Shopping comparison + regression                  |
| D actionable minimum/zero distinction, avoid duplicate linked rows   | Replenishment regression                          |
| E session states, repeat/manual/correction/unknown Remove            | Scanner comparison + regression                   |
| F1–F9 confirmed defects                                              | Focused pure and browser assertions               |
| G mixed image types, preview/replace/remove, future photo processing | Mixed captures + PHOTOS addendum                  |
| Gestures/performance/accessibility                                   | Touch/keyboard/zoom/100/300 browser metrics       |
| Isolation and delivery                                               | Full checks, normal bundle audit, feature PR only |

Passing checks does not approve the design. No 7B/7C work or hosted operation is authorized.
