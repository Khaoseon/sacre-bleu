# Security reporting

Do not disclose vulnerability details in public issues, pull requests or discussions. Never include production credentials, session tokens, invitation fragments, user data or private JSON backups in a report. Use fictitious data and the smallest local reproduction you can provide; do not probe another person's instance.

## Private reporting

When GitHub private vulnerability reporting is enabled, open this repository's **Security → Advisories → Report a vulnerability**. Include the affected commit, impact, prerequisites and reproduction steps with synthetic data. The maintainer will coordinate a fix and disclosure where possible; no response time, bounty or long-term support is promised.

**Before public release:** the maintainer must enable private vulnerability reporting and verify that the reporting button and notifications work. This policy does not claim the setting is already enabled. GitHub documents the [manual configuration](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

If the button is unavailable, use an existing trusted private channel with the maintainer. If you have none, open only a minimal issue asking how to establish private contact, with no technical details, affected endpoint, exploit or personal data. No contact email has been designated yet.

## Scope and updates

Review and fixes focus on the current `main`; older snapshots have no separate supported security branch. Independent operators manage their own Supabase, Auth, origins, backups and deployments. Source availability does not grant access to anyone's pantry. Browser offline copies and user JSON exports are unencrypted: see [privacy and recovery](docs/PHASE5.md). Consult [INSTALL.md](docs/INSTALL.md) for the intended authorization and provisioning model.
