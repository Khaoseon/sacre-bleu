# Temporal evidence — 2026-11-01

Reference: actual `main` at `decf2c4b004590c588ea5726f3a22d74db3031c1`. Same recorder, fixture, Maison appearance and **375 × 812** viewport before/after. Chrome **156.0.8078.74**, Windows, headless, local Vite, synthetic catalogue, external requests blocked. No physical phone or production data.

## Read the motion

| Conditions                     | Before                                                        | After                                                        |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Normal CPU                     | [Five ordered sequences](evidence/before/README.md)           | [Five ordered sequences](evidence/after/README.md)           |
| Simulated CPU ×4               | [Five ordered sequences](evidence/before-cpu4/README.md)      | [Five ordered sequences](evidence/after-cpu4/README.md)      |
| CPU ×4, no screenshots/tracing | [Raw measurements](evidence/before-cpu4-metrics/timings.json) | [Raw measurements](evidence/after-cpu4-metrics/timings.json) |

Each frame index gives actual capture time relative to the first capture in that scenario. Samples are approximately 60ms plus capture overhead apart, **not** a complete 60 FPS video. The five actions are content drag/release, sheet open/close, three quantity taps, Shopping check → explicit deletion, and manual scanner confirmation → absolute correction → undo → continue. JSON records rAF interval summaries and long tasks, not GPU frame rendering time.

Inspect the reference sheet's immediate disappearance versus the new sheet/backdrop exit. Shopping previously reordered/disappeared immediately; the new row moves to its completed position and its confirmed removal is clipped while surrounding content settles. Quantities retain their confirmed value during emphasis. Scanner correction/undo/continue stays immediate; only presentation fades. The navigation test samples every rAF after release to reject backwards movement: sparse screenshots alone cannot exclude a one-frame glitch.

Local traces: `.tmp/motion-before-1.zip`, `.tmp/motion-after-1.zip`, `.tmp/motion-before-4.zip`, `.tmp/motion-after-4.zip`, `.tmp/motion-transitions.zip`. Open with `npx playwright show-trace PATH`. Archives are ignored to avoid committing multi-megabyte traces; ordered images and raw measurements are committed.

## Observed intervals

Values are **p95 / maximum rAF gap in ms**, before → after. A 60 Hz budget is about 16.7ms. This host scheduled many rAFs around 6.1ms, so these figures cannot become a phone FPS claim. Longer animations lengthen the sampling window: a lower p95 is not proof of faster execution. One execution per condition is evidence, not a statistical benchmark.

| Scenario                              | Normal CPU, with capture | CPU ×4, with capture       | CPU ×4, without capture   |
| ------------------------------------- | ------------------------ | -------------------------- | ------------------------- |
| Navigation                            | 6.2 / 6.2 → 6.2 / 6.2    | 12.2 / 78.7 → 6.2 / 72.7   | 6.2 / 72.6 → 6.2 / 72.7   |
| Sheet open + close                    | 6.3 / 18.2 → 6.2 / 18.1  | 12.2 / 90.9 → 12.1 / 72.7  | 12.1 / 60.7 → 6.2 / 78.8  |
| Three quantity taps                   | 6.1 / 6.1 → 6.1 / 12.2   | 54.5 / 66.7 → 6.2 / 78.8   | 54.6 / 54.6 → 54.5 / 60.6 |
| Shopping check + delete               | 6.2 / 12.1 → 6.2 / 12.2  | 6.2 / 72.7 → 12.1 / 121.3  | 72.8 / 72.8 → 6.2 / 90.9  |
| Scanner confirm/correct/undo/continue | 6.2 / 12.2 → 6.2 / 12.1  | 54.5 / 84.9 → 54.6 / 103.1 | 66.7 / 90.9 → 78.8 / 97.1 |

Neither normal-CPU recording observed a ≥50ms long task. CPU ×4 recordings contain 13 before and 13 after; no-capture runs also contain 13 before and 13 after. Both CPU ×4 comparisons contain 14 rAF gaps over 34ms on each side. Some maxima worsen: this is **not a measured performance speedup**. The lean profile confirms limited slow-device main-thread headroom beyond screenshot overhead. Dev React/Vite, Playwright/CDP input, OS scheduling and CPU emulation affect the observation. Individual long tasks are not attributed to components without deeper production-device profiling.

The demonstrated improvement is continuity and interruption correctness: direct tracking, no old-origin release write, coherent native dismissal, confirmed keyed reflow and clipped removal. Tests check final state, focus and transaction timing separately. Production profiling on physical mid-range phones remains necessary before claiming a sustained frame rate.

## Reproduce

```sh
git worktree add --detach .tmp/motion-baseline decf2c4b004590c588ea5726f3a22d74db3031c1
node scripts/browser/motion.evidence.mjs --before --baseline-root
node scripts/browser/motion.evidence.mjs
node scripts/browser/motion.evidence.mjs --before --baseline-root --slow
node scripts/browser/motion.evidence.mjs --slow
node scripts/browser/motion.evidence.mjs --before --baseline-root --slow --metrics-only
node scripts/browser/motion.evidence.mjs --slow --metrics-only
git worktree remove .tmp/motion-baseline
npm run test:motion:browser
```

Capture sequentially without other browser suites. The isolated baseline resolves the root's installed dependencies. Remove it before `npm test`, otherwise Vitest's source filter also discovers the copied reference tests. Recorder capture pacing does not affect CI assertions, which use semantic states, event clocks and actual animation completion.
