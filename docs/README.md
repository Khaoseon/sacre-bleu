# Documentation

Start with the current English guides below. They describe the code's present contracts; historical delivery reports preserve evidence and approvals without granting permission to repeat operations on a hosted instance.

| Need                                           | Current guide                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Run your own private instance                  | [INSTALL.md](INSTALL.md) — authoritative local/hosted setup                                             |
| Understand product behavior                    | [SPEC.md](SPEC.md) and [PLAN.md](PLAN.md) — rules, scope and acceptance gaps                            |
| Change authorization or shared writes          | [BACKEND.md](BACKEND.md) — tables, RPCs, locking and idempotency                                        |
| Work on camera or enrichment                   | [SCANNER.md](SCANNER.md), [OPEN_FOOD_FACTS.md](OPEN_FOOD_FACTS.md)                                      |
| Understand offline copies and JSON replacement | [PHASE5.md](PHASE5.md)                                                                                  |
| Handle administrative archives                 | [BACKUP.md](BACKUP.md) — privileged optional tools and limitations                                      |
| Add interface translations                     | [I18N.md](I18N.md) — presentation catalogue, compatibility and coverage                                 |
| Reproduce checks                               | [TESTING.md](TESTING.md)                                                                                |
| Prepare public release                         | [RELEASE.md](RELEASE.md), [license scope](../THIRD_PARTY_NOTICES.md), [security policy](../SECURITY.md) |

## Organization and translation inventory

Phase 6B2 consolidates seven overlapping French guides into current English guides at their existing paths, preserving incoming links. Their original French text is retained below. INSTALL.md was already English and is retained as the single installation authority. No development reports, historical branches or PRs were deleted. The old README's superseded status narrative is replaced; its original remains in Git at `8c27db838c9e:README.md`.

A line-by-line translation of all historical material would add a large review surface, especially the roughly 98 KB validation journal, while duplicating obsolete commands and approvals. Those records remain French, explicitly marked historical, with this concrete remaining inventory. English summaries carry the active contracts and known safety limitations; the following table is not a second setup guide.

| Retained French source                                                                                                                                         | Contents / remaining translation work                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [history/SPEC_FR.md](history/SPEC_FR.md)                                                                                                                       | Original product specification and chronological status additions; current rules consolidated in SPEC.md                |
| [history/PLAN_FR.md](history/PLAN_FR.md)                                                                                                                       | Original milestone/authorization plan; current scope consolidated in PLAN.md                                            |
| [history/BACKEND_FR.md](history/BACKEND_FR.md)                                                                                                                 | Phase-by-phase SQL/Auth narrative and original evidence; current contracts in BACKEND.md                                |
| [history/SCANNER_FR.md](history/SCANNER_FR.md)                                                                                                                 | Library comparison and original device/lifecycle evidence; current rules in SCANNER.md                                  |
| [history/OPEN_FOOD_FACTS_FR.md](history/OPEN_FOOD_FACTS_FR.md)                                                                                                 | Activation, original quotas/costs and test outcomes; current integration in OPEN_FOOD_FACTS.md                          |
| [history/PHASE5_FR.md](history/PHASE5_FR.md)                                                                                                                   | Full original backup JSON example, phase delivery and pause discussion; current contract in PHASE5.md                   |
| [history/BACKUP_FR.md](history/BACKUP_FR.md)                                                                                                                   | Original administrator runbook/rehearsal; current boundaries and commands in BACKUP.md                                  |
| [VALIDATION.md](VALIDATION.md)                                                                                                                                 | Cumulative test/audit journal; translate dated entries as evidence is needed, preserving historical counts and failures |
| [HANDOFF_2B.md](HANDOFF_2B.md), [HANDOFF_2C.md](HANDOFF_2C.md), [RAPPORT_2C.md](RAPPORT_2C.md)                                                                 | Shared client, first hosted setup and audit handoff; historical only                                                    |
| [HANDOFF_3.md](HANDOFF_3.md), [HANDOFF_4.md](HANDOFF_4.md)                                                                                                     | Scanner/OFF delivered behavior, physical/hosted evidence and untested cases                                             |
| [HANDOFF_4B_PREPARATION.md](HANDOFF_4B_PREPARATION.md), [HANDOFF_4B.md](HANDOFF_4B.md)                                                                         | Hosting preparation, actual delivery and accepted iPhone gap                                                            |
| [HANDOFF_V1_STABILISATION.md](HANDOFF_V1_STABILISATION.md), [HANDOFF_5.md](HANDOFF_5.md)                                                                       | Later stabilization and phase-5 delivery, authorization and data-fingerprint evidence                                   |
| [CLOUD.md](CLOUD.md), [CLOUDFLARE_PAGES.md](CLOUDFLARE_PAGES.md)                                                                                               | Original owner's provisioning/hosting narrative; superseded for setup by INSTALL.md                                     |
| [SAUVEGARDE_CHIFFREE.md](SAUVEGARDE_CHIFFREE.md)                                                                                                               | Original encrypted-backup execution and audit; current entry point BACKUP.md                                            |
| [REVUE_CORRECTIVE_4B.md](REVUE_CORRECTIVE_4B.md), [SCANS_SIMULTANES_OFF.md](SCANS_SIMULTANES_OFF.md), [LIVRAISON_CORRECTIFS_V1.md](LIVRAISON_CORRECTIFS_V1.md) | Security review, reproduction limits, scan/OFF corrections and controlled delivery sequence                             |
| [TESTS_TELEPHONES.md](TESTS_TELEPHONES.md), [TESTS_OFF_TELEPHONES.md](TESTS_OFF_TELEPHONES.md), [TESTS_PAGES_TELEPHONES.md](TESTS_PAGES_TELEPHONES.md)         | Historical physical matrices and private HTTPS setup; current outstanding acceptance summarized in TESTING.md           |

Recommended remaining translation order: extract device acceptance/evidence when the next UI redesign is tested, then dated handoffs needed for review, and finally the long validation journal if full English archival access is wanted. Preserve original dated text alongside translations; do not reinterpret an old planned test as an executed one. No full historical translation is claimed for this PR.

## Other retained material

`config/cloud`, `config/cloud-email`, `config/pages-auth` and `config/private-access` are original-owner configuration evidence, not reusable instance templates. `docs/cloud-env.example` contains public placeholders. Use `instance:config` from INSTALL.md for your own exact project/origin. `supabase/config.toml` and migrations remain active local/schema sources.

Existing `docs/screenshots/` files remain historical artifacts outside the README; screenshots are deferred until redesign. They require privacy/rights review before a public repository exposes them. The [branding guide](../assets/branding/README.md) documents existing source/derivatives and pending permission; no new artwork was generated.
