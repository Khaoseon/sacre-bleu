# Tests and evidence

The repository contains reproducible tests and dated historical reports. A script's existence or past success is not proof that it ran for the current commit. The exact Phase 6B2 local outcomes are recorded in [RELEASE.md](RELEASE.md); PR checks remain the source for hosted CI results.

## Application checks

Node.js 24+ and `npm ci`:

```sh
npm test
npm run typecheck
npm run build
npm run format:check
npm run notices:check
```

`npm test` covers pure business/backup validation, scanner recognition/lifecycle, client store recovery/privacy, configuration and frontend rendering; it also runs the independent instance configuration/bootstrap unit tests. No live provider quota or physical camera is exercised. `notices:check` compares generated redistribution texts to the reviewed locked package list.

Additional targeted commands: `npm run test:phone` checks the private HTTPS helper; `npm run test:backup` checks archive/restore planning (GnuPG must be available for the encryption round trip).

## Shared backend: local only

Docker with Linux containers and a full-history Git clone are required. Local ports are API 55321, PostgreSQL 55322 and Mailpit 55324, on loopback. Use disposable fictitious users. Fixture guards reject hosted endpoints; do not circumvent them.

```sh
npm run db:start
npm run env:local
npm run test:db
npm run db:lint
npm run test:db:concurrency
npm run test:db:api
npm run test:shared
```

For changed migrations, first deliberately run `npm run db:reset` on this disposable local stack (**erases data**), then the suites above, then `npm run db:types` and review `src/backend/database.generated.ts`. CI compares generated types to the committed file. Do not hand-edit it.

pgTAP covers RLS/grants, identity/ownership, constraints, rollback, idempotency, scan compensation, OFF budget and restoration. Multi-connection tests wait for observed PostgreSQL lock contention; they exercise overlapping deltas, reused keys, invitation races, stale compensation and restoration races. Auth/API tests use signed local sessions, with a historical SQL-confirmed-user fixture. `test:shared` additionally exercises Mailpit delivery/confirmation, current and historical installed client sources, uncertain-response replay and the bootstrap helper. It requires commit `9eca5d11a42d8839d822f56dadc9fbbb7aa6c801` in local history.

## Browser and Edge checks

Playwright is pinned in the lockfile. Browser scripts use installed Chrome; CI installs the browser/dependencies. Build first; phase-5/scanner integration also needs the local backend and `.env.local` from `env:local`.

```sh
npm run test:ui:browser
npm run test:pwa:browser
npm run test:off:browser
npm run test:phase5:browser
npm run test:scanners:browser
```

Navigation checks cover mobile swipe/keyboard guards. PWA checks build versions A/B and exercise deferred/blocked/explicit activation. OFF uses a mock provider with image requests intercepted; scanner checks use synthetic video/decoding. Phase-5 tests exercise JSON preview/replacement, stale revision/rollback/replay, offline token expiry/reconnect, account isolation, late responses and signout. These are browser behavior tests, not physical camera/OS validation.

For the local Edge authorization boundary, serve `product-lookup` in a separate terminal with `npx --no-install supabase functions serve product-lookup --no-verify-jwt`, then run `npm run test:off:edge`. This local flag permits invalid-token test requests to reach the handler; its Auth checks stay active. Tests reject requests before real OFF lookup. Keep hosted `verify_jwt=true`.

## CI and evidence limits

[verify.yml](../.github/workflows/verify.yml) runs on PRs targeting `main` or manual dispatch. The application job checks unit/types/format/build, a Cloud build with fictitious public configuration, navigation and PWA updates. The backend job starts/resets a disposable local stack, runs SQL/lint/type-regeneration/contention/Auth/shared/archive checks and the phase-5 browser journey. Extra OFF/Edge/two-scanner scripts exist but are not all wired into CI. CI never deploys production or restores hosted data.

Historical [VALIDATION.md](VALIDATION.md) and handoffs retain dated test counts, failures and remediation; counts are not evergreen README badges. Phase-3 core camera checks were physically performed on iPhone/Samsung. Later hosting acceptance was confirmed on Samsung, with iPhone 4B untested and explicitly accepted as a limitation. Full phase-5 offline/restore/update behavior on both physical phones, EAN-8/UPC-A and other matrix cases, a fresh independently hosted installation and real pause/restore remain separate manual acceptance. A historical scanner substitution incident was not physically reproduced; regression simulations do not certify its hardware resolution.
