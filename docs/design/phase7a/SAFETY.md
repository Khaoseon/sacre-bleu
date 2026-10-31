# Branch, CI and deployment isolation

Read-only remote inspection on 30 October 2026 confirmed repository `Khaoseon/sacre-bleu`, public, default branch `main`, and tag `v1.0.0` at **b0a39713f3fb73a55d9fdb90f01a03d77ec14205**. The working tree was clean on `codex/phase6d-release-preparation` before branching. Local `main` and cached remote refs were older; they were not reset or advanced. The old `origin` URL (`Khaoseon/App_reserve`) redirects to the renamed repository; remote publication commands can target the canonical URL explicitly without rewriting that configuration.

Created local `release/v1.1` directly from the verified tag, then `feat/v1.1-7a-design` from that integration branch. No existing branch was overwritten, reset or force-pushed. Only the feature branch contains 7A changes. Future 7B/7C branches must start at the latest approved `release/v1.1`. No merge or new release/tag is authorized by this phase.

## Cloudflare inspection before push

Read the existing Pages project's Deployments and Settings → Branch control through the signed-in browser. Observed **production branch `main`, automatic production deployments enabled, preview branch `None`**, build `npm ci && npm run build:cloud`, output `dist-cloud`, no deploy hooks. Opened the branch-control panel to read the selected radio, then closed it **without saving**. Existing feature-branch entries showed no deployment available. The Git integration still displayed its historical repository label; no rebinding was attempted.

At inspection Pages displayed production source **7470358**, while the Git release tag is **b0a3971**. Those are separate observations; this phase does not deploy the tag, certify production serves the tag, or repair integration metadata. The published application is left as observed.

Only `release/v1.1` and `feat/v1.1-7a-design` may be pushed, with no force option. Review commits use `[CF-Pages-Skip]` as an additional safeguard. Preview `None` is the primary observed restriction; a PR title alone is not a deployment guard. Recheck if settings change before subsequent work. No Cloudflare/Supabase/Auth/RLS/Edge/production-data configuration, public preview or deployment workflow is part of 7A.

## Minimal CI extension

`.github/workflows/verify.yml` now matches pull requests into both `main` and `release/v1.1`. Existing application/PWA and backend jobs, read-only `contents` permission, SHA-pinned actions, nonpersisted checkout credentials, fixture-only cloud build configuration and disposable local backend remain. Added prototype typecheck/build and its local browser journey to the existing application job. There is no push/deployment trigger, `pull_request_target`, write token, new secret or external deployment step.

Production build output is still the root application. The isolated build emits into ignored `.tmp/phase7a-build`, not `dist`/`dist-cloud`. A browser verification scans normal `dist/assets` for the prototype marker/CSS/fictional brands and image names. No production source component, theme implementation, database migration or generated file changes.

## Manual ruleset for a solo maintainer

No GitHub administrative setting is changed here. For **`release/v1.1`**, add an active branch ruleset targeting that exact branch:

- Require changes through a pull request, with **zero required approving reviews** so a solo owner can work.
- Require successful **Application et PWA** and **Restauration, sécurité et hors ligne** checks, with branches up to date before merging. Select their actual emitted contexts after the first run if the UI uses qualified names.
- Require conversation resolution. Block force pushes and branch deletion. Enforce for administrators without a routine bypass.
- Do not require Pages/deployment status, CODEOWNER approval, a second reviewer, signed commits or a merge queue merely for this workflow.
- Preserve all existing rules on `main`; do not replace them with a broader weaker rule. Keep outside-contributor workflow review and read-only default token policies.

Leave the 7A PR open and unmerged. Protecting `release/v1.1` does not authorize merging it into `main`; the final publication needs its own reviewed PR and explicit maintainer approval. Do not publish V1.1 tags or modify Pages branch selection to get a review preview.
