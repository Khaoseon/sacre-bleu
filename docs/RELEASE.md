# Public release preparation

Phase 6B2 prepares a public V1.0 presentation; it does not publish a release, rename the repository or change its visibility. The working baseline was verified against merged PR #5 at `8c27db838c9e` on 30 October 2026. The repository remains `Khaoseon/App_reserve`, private; links intentionally use that actual identity until a later approved rename.

## Manual prerequisites

- Retain written MIT redistribution permission for the mascot source and derivatives, and agree the creator's preferred public credit. Agreement in principle is not recorded written authorization. Update [branding attribution](../assets/branding/README.md) and [license scope](../THIRD_PARTY_NOTICES.md) once completed; do not publish the artwork as MIT before this is resolved.
- Enable GitHub private vulnerability reporting when available for the public repository, verify the reporting form/notifications and update [SECURITY.md](../SECURITY.md) if a different private channel is selected. No email or enabled setting is invented here.
- Review tracked content **and Git history** for secrets, personal data and third-party materials before changing visibility. Include old screenshots, report/config identities, author metadata and PR attachments/discussions that may become public. Public project references/origins are not secrets, but do not imply blanket permission to disclose personal records. This work is not a full forensic history clearance. Do not rewrite history or delete branches as part of this mission.
- Complete a new installation using only your own resources and [INSTALL.md](INSTALL.md): provisioning, migrations, account/bootstrap, Auth, Edge identification/CORS, served CSP and two-account authorization. The provider's owner-specific User-Agent validator needs an intentional follow-up if changing contact identity; changing the Edge header alone disables lookup.
- Recheck current OFF usage/registration and retain its data/image attribution. Validate actual phone installation, update, offline/reconnect/signout and recovery on Android/iOS; browser simulations are insufficient evidence. Do not claim all historical physical cases passed.
- Review merge/deployment behavior. The original `main` auto-deploys to Pages. This branch uses a `[CF-Pages-Skip]` commit and must not be merged during this task. A future merge commit needs the same skip treatment if deployment is unwanted; inspect the host's behavior rather than assuming a PR label prevents deployment.
- Decide release/tag/package version and any GitHub About/topics after review. Package stays `0.1.0` and `private: true` (npm accidental-publication guard); MIT metadata does not publish it. An eventual rename to `sacre-bleu` needs a link/metadata/config review, including OFF identity and historical-client Git availability. No change is made now.

## Editorial and documentation decisions

The README uses the existing small navy/blue/cream mascot as its only graphic, ordinary GitHub typography and a compact engineering table with source links. No screenshots, replacement mascot, custom font, badge service or diagram dependency. A diagram was omitted because the short architecture description and contracts table already explain this scale of system.

English current guides stay at familiar paths and consolidate obsolete phase-status additions. Seven original French sources are retained under `docs/history/`; all remaining French records are indexed with a concrete translation inventory in [README.md](README.md). Large historical translation is separate to avoid duplicating obsolete operational instructions or obscuring audit evidence. Contributor/security guidance and a small PR template are new; no issue form bureaucracy was added.

The sole runtime-distribution maintenance is a generated plain-text license bundle in `public/`, copied automatically to both Vite outputs. No UI, database, remote settings or new dependency changes. The generator's reviewed package list must be revisited when runtime dependencies/PWA output change. Current code/docs are MIT; mascot permission and external materials retain their explicit separate status.

## Verification for this branch

Local checks on 30 October 2026 (Node 24.20.0, npm 11.19.0):

- npm test: 296 application tests across 21 files, plus 4 independent configuration/bootstrap tests passed.
- npm run typecheck, npm run build, npm run build:cloud, npm run format:check, npm run notices:check and git diff --check passed. Cloud build used a fictitious project/public key; its CSP contained only the intended fictitious backend, with no original-instance or template fallback.
- Local Markdown/HTML file-link targets checked across 42 documents: no broken targets. npm run command references checked against package scripts in 14 current guides/policies: no unknown commands.
- Temporary sourcemap audit identified 23 runtime package sources; Workbox build-path inspection added the emitted Babel helper and Apache-licensed AMD loader. Final notices cover 25 sources, including idb, complete Lucide/Feather and ZXing texts and tslib copyright. Both normal build outputs retain identical notices; temporary sourcemaps are absent from normal output.
- All 481 locked package entries declare license identifiers. Current tracked text/filename screening found no secret-pattern hits or tracked environment/private-key/archive files; this limited pattern scan is not a complete history, screenshot or personal-data clearance.
- Windows line-ending drift in the new generator was caught by its own comparison check and corrected by normalizing the emitted loader notice before generation. The final reproducibility check passed.

The existing Vite warning about a main chunk above 500 kB remains; this work does not change application splitting. No SQL, generated database types or business logic changed, so local database resets/fixtures and physical acceptance were not rerun for this documentation/distribution change. PR CI will run the existing full local backend/browser pipeline; consult its actual result before merging. No new physical-device acceptance, fresh hosted installation, production migration, real provider lookup, deployment or user-data operation is claimed.
