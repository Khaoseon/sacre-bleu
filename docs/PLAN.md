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

Phases 1–5 are implemented. Historical reports record the original authorized delivery and its limits; they are not new permissions to repeat remote operations. V1.0 public presentation is being prepared, not declared released. Phase 6D prepares package `1.0.0` with `private: true`; no tag or release is published.

## Acceptance and remaining work

Preserve the invariants in [SPEC.md](SPEC.md) and [BACKEND.md](BACKEND.md). Before delivery run `npm test`, `npm run typecheck`, `npm run build`, `npm run format:check`, plus relevant changed-domain checks. A migration requires a fresh disposable local database, pgTAP, contention and Auth/API, then regenerated types. See [TESTING.md](TESTING.md).

Phase 6D records the approved Eloane ROURE MIT credit and the exposure audit. Public release still requires the manual protection/security/publication sequence in [RELEASE.md](RELEASE.md). Independent hosted deployment remains untested and is an explicitly accepted limitation; no new physical device campaign is required. Physical iPhone/Samsung camera testing from phase 3 does not validate every later PWA/offline/recovery change. Historical reports explicitly retain those gaps and a scanner substitution incident that was not physically reproduced.

Screenshots and UI redesign are deferred. Offline mutations, private photo Storage, password recovery UI and broader collaboration are not part of Phase 6B2. No remote provisioning, production mutation, visibility change, repository rename, merge or intentional deployment is authorized by this plan. The original `main` triggers Pages automatically; review that constraint before any later merge.

## Phase 6C: interface localization

French/English presentation, local language selection, locale-aware formatting and bilingual regression coverage are merged in the verified Phase 6D baseline. No migration, Auth/Edge change, deployment or merge is included. See [localization architecture, audit and evidence](I18N.md); public V1.0 and physical device acceptance remain separate.

## Phase 6D: final release preparation

Prepare public identity `Khaoseon/sacre-bleu`, version 1.0.0, completed mascot attribution, configurable OFF operator identity, exposure audit and a practical publication runbook. No history rewrite, merge, tag, rename, visibility/security-setting change or hosted operation is authorized. [RELEASE.md](RELEASE.md) records evidence, accepted limitations and manual actions.
