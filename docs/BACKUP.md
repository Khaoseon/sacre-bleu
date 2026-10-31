# Backup and recovery operations

Two separate scopes exist. User JSON backup is the normal inventory recovery route; administrative archives also contain identity data and protected journals. Use [INSTALL.md](INSTALL.md) for new instances, [PHASE5.md](PHASE5.md) for the JSON contract. The [French administrative record](history/BACKUP_FR.md) and [encrypted-archive audit](SAUVEGARDE_CHIFFREE.md) are historical evidence, not commands to replay on the original project.

## Choose the scope

| Backup                          | Includes                                                                                                                              | Does not recreate                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| User JSON                       | Product/stock/shopping values and OFF provenance, with portable file-local links                                                      | Auth, members/rights, sessions, technical receipts, image bytes                              |
| Encrypted administrator archive | Reviewed public/private tables, `auth.users`/`auth.identities`, schema/history/migration/configuration records and integrity metadata | Old HTTP sessions, platform secrets/settings, full provider infrastructure or future Storage |

Keep copies outside Supabase and outside the repository/published directories. User exports are unencrypted; administrator archives use OpenPGP encryption with an interactive passphrase. Never put credentials or passphrases in command arguments, environment files, issue reports or chat. Store the passphrase separately. A backup without a verified recovery path is incomplete operational evidence.

## Optional administrator tooling

These are privileged, project-specific operations, not part of ordinary contributor tests. Review the source and exact linked project in a trusted personal terminal, with CLI authorization, Docker/Linux containers and GnuPG available. Do not run them merely to demonstrate the project.

```sh
npm run backup:cloud -- --project-ref YOUR_PROJECT_REF --destination ABSOLUTE_PRIVATE_DIRECTORY
npm run backup:verify -- --archive ABSOLUTE_ARCHIVE_PATH
npm run backup:extract -- --archive ABSOLUTE_ARCHIVE_PATH --destination ABSOLUTE_NEW_PRIVATE_DIRECTORY
```

`cloud-backup.mjs` checks explicit reference/linked project and migration history, fingerprints tables before/after capture, exports data in memory, encrypts, verifies decryption/manifest and writes an archive atomically. The normal eight-migration path requires aligned history. For the separately authorized private-photo rollout only, `--before-photos` requires exactly seven applied migrations and the eighth pending. Historical `--before-*` flags describe specific older deployment boundaries; do not use them to bypass mismatches on a new installation. Extracted files are plaintext and confidential; use protected temporary storage outside Git and remove them after the reviewed operation.

After migration eight, administrative archives include private JPEG bytes and processing counters in `private.product_photos` and `private.photo_rate`; they contain photographs as well as identity data. The existing 64 MiB uncompressed archive limit remains enforced. User JSON export/restore refuses any non-null photo reference and is not a photo backup. [7B-D](design/PHASE7BD.md) describes the private-photo architecture, exact rollout/rollback sequence and remaining validation limits. The recovery metadata audit recognizes only the exact processor commit signature as the service-role execution exception; direct photo-table privileges remain forbidden.

The archive includes identity records and password hashes; protect it more strictly than a product export. Platform secrets remain separate. Recheck the reviewed table/column/Auth scope after schema/provider changes instead of assuming the tool backs up everything indefinitely.

## Rehearsal and restoration limits

```sh
npm run backup:restore:local -- ABSOLUTE_PRIVATE_EXTRACTION_FOLDER --project-ref EXPECTED_SOURCE_REF
```

Despite its name, this command **reads hosted source fingerprints** and requires the linked project to match both the explicit reference and archive metadata. Only the import container is offline: isolated, without published ports/network, with temporary memory storage and disabled container logging. It also needs the local development backend's compatible Auth schema. It is not an offline-only command and is not a hosted restore command.

The rehearsal verifies archive file integrity/history, initializes a fresh isolated target from archived migrations, exercises rollback and compares restored data/fingerprints. The fourth migration seeds the OFF gate singleton; `restore-import.mjs` checks the empty target, removes that baseline singleton inside the import transaction and imports its archived row. Do not use an old bare `psql data.sql` example that would collide with it. Reject a nonempty target, unexpected migration history or incompatible Auth schema; never neutralize constraints to force a match.

A hosted replacement needs a separately reviewed target-specific procedure and authorization. Verify PostgreSQL/Auth compatibility, recreate the archived schema exactly, import in one transaction with stop-on-error, then compare values/links/versions/fingerprints, constraints, RLS/grants, membership and owner integrity. Do not import schema dumps on top of the same migrations, reset the source, repair migration history to hide divergence or run local fixtures remotely. Re-establish secrets/Auth/origins/SMTP independently and validate fresh HTTP login in new browser profiles; a SQL fingerprint match does not prove restored authentication. Reissue temporary invitations for the new origin.

If Auth is lost and only inventory JSON survives, provision new confirmed accounts/reserve and restore via the owner flow. The JSON remaps product/shopping identifiers and intentionally does not copy old user/member IDs. Never improvise identity restoration from a partial dump.

Historical rehearsals verified specific snapshots under explicit authorization. They do not certify a future hosted recovery or real pause/resume. Consult current provider backup/pause policies and keep separate, dated external copies; no paid plan or artificial activity monitor is introduced by this repository.
