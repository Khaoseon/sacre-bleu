# Scope and validation plan

This is the current scope summary. The [French phase plan](history/PLAN_FR.md) preserves original milestones, approvals and earlier status text. For new installations, only [INSTALL.md](INSTALL.md) is authoritative.

## Implemented baseline

| Work                      | Result                                                                                                | Verification entry point                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Local prototype           | Three mobile views, separate persistent demo, pure quantity/scan/shopping rules                       | `npm test`, [SPEC.md](SPEC.md)                                   |
| Shared backend and client | Auth, two members, targeted invitations, RLS reads, authorized transactional/idempotent RPCs          | [BACKEND.md](BACKEND.md), local SQL/contention/Auth/shared tests |
| Camera                    | Lazy ZXing decoder, stable barcode presentation, track cleanup, manual fallback                       | [SCANNER.md](SCANNER.md), recognition/camera tests               |
| Open Food Facts           | Authenticated proxy, personal catalogue priority, shared budget, editable suggestions and attribution | [OPEN_FOOD_FACTS.md](OPEN_FOOD_FACTS.md)                         |
| PWA and hosting           | App-shell cache, guarded update prompt, Cloudflare headers per backend origin                         | PWA/browser checks, [INSTALL.md](INSTALL.md)                     |
| Offline and recovery      | Private read-only copy, user JSON export, owner-only transactional replacement                        | [PHASE5.md](PHASE5.md), SQL/SDK/browser restore tests            |
| Phase 6B1                 | Independent configuration and private first-reserve bootstrap                                         | Merged PR #5, `8c27db838c9e`; [INSTALL.md](INSTALL.md)           |
| Phase 6B2                 | English reader journey, contribution/security policy, license scope and redistribution notices        | [Release preparation](RELEASE.md)                                |

Phases 1–5 are implemented. Historical reports record the original authorized delivery and its limits; they are not new permissions to repeat remote operations. V1.0 public presentation is being prepared, not declared released. Package version remains `0.1.0`; a release/tag/version decision is separate from this documentation work.

## Acceptance and remaining work

Preserve the invariants in [SPEC.md](SPEC.md) and [BACKEND.md](BACKEND.md). Before delivery run `npm test`, `npm run typecheck`, `npm run build`, `npm run format:check`, plus relevant changed-domain checks. A migration requires a fresh disposable local database, pgTAP, contention and Auth/API, then regenerated types. See [TESTING.md](TESTING.md).

Public release still requires written mascot permission/preferred credit, private security reporting, privacy review of tracked assets/history and independent hosted/device acceptance. Physical iPhone/Samsung camera testing from phase 3 does not validate every later PWA/offline/recovery change. Historical reports explicitly retain those gaps and a scanner substitution incident that was not physically reproduced.

Screenshots and UI redesign are deferred. Localization, offline mutations, private photo Storage, password recovery UI and broader collaboration are not part of Phase 6B2. No remote provisioning, production mutation, visibility change, repository rename, merge or intentional deployment is authorized by this plan. The original `main` triggers Pages automatically; review that constraint before any later merge.
