# Phase 7B-A — core mobile UI integration

Production integration on feat/v1.1-7b2-mobile-navigation against release/v1.1. The final 7A shelf-default and object-detail decisions supersede convergence's earlier list-default recommendation.

- Three real panes retain their scroll and drafts. Content gestures paint a transform in requestAnimationFrame, excluding system edges, fields, horizontal overflow, controls, camera surfaces, dialogs and pending/uncertain work. Inactive panes are inert and hidden from accessibility. The real camera mounts only on Scanner, retaining its cleanup and recognition contracts.
- Shelf is the session default; compact view is an explicit alternative. Search covers name, brand and barcode with existing accent normalization. Category identifiers remain stable across FR/EN. Images use the existing personal-first/OFF adapter, contain-fit, lazy decode and fallback without zero-stock dimming.
- Object-led detail reads the current snapshot and offers existing ±1 stock operations, explicit linked shopping addition, editing and source-aware attribution. Shared errors/recovery remain visible inside the sheet.
- Progressive forms prioritize identity, quantity and barcode, retain metadata, expose scanned barcodes, retain failed drafts and guard Close/Escape/deletion and browser unload. Native validation opens collapsed metadata before focus. The mounted draft survives Continue and language changes. Metadata editing preserves current stock, including in the local demo.
- Shared RPCs, store, idempotency, uncertain journal, authorization, schema, offline rules and theme preferences are unchanged. No new dependencies, migrations or hosted actions.

## Validation

npm test (353 application tests plus 5 configuration checks), npm run typecheck, npm run build, npm run format:check and git diff --check.

The focused local check, node scripts/browser/core-mobile.integration.mjs, exercises production App with disposable fixtures: shelf/compact, brand search, OFF adapter/credit through an intercepted local image, detail quantity/shopping, metadata save, mounted draft continuation, failed local persistence, 460px keyboard-height layout, per-pane scroll, content/edge/vertical gestures, inert panes, reduced motion, complete first-row 44px quantity controls at 320×568, FR/EN and overflow in all five resolved themes. Requests are local or intercepted. No real provider/backend is used. Existing store tests cover receipt/snapshot waits, locks, uncertainty and concurrency.

Representative captures: [375px shelf](phase7ba/stock-375.png), [320px shelf](phase7ba/stock-320.png), [object detail](phase7ba/detail-375.png). Synthetic demo data in production components; the OFF cola image is the documented 7A local reference (zeynepozturk11, CC BY-SA 3.0), intercepted from explorations/7a/assets/reality/5449000000996.jpg. No production fixture imagery is added.

## Boundaries

Multi-unit stock changes remain unavailable: the shared contract accepts ±1, so no sequence of blind requests or prototype delta dialog is introduced. Private photo upload/storage remains 7B-D; existing demo photo handling is retained without extending shared storage. No shopping/scanner workflow redesign (7B-B), compensation/Undo contract, backend migration, deployment or merge.

Physical Safari/iPhone/Android/PWA, real keyboard, screen readers and real camera acceptance remain outstanding for the later device phase. Focused Chrome checks are not device certification. The existing main-chunk size warning remains. CI is deliberately not polled or monitored; the maintainer checks it independently.
