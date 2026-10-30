/** For a fresh, isolated restore target only. Never execute against the source Cloud. */
export function validateRestoreHistory(versions, migrationFiles) {
  const supported = [
    '20261026000100',
    '20261026000200',
    '20261026000300',
    '20261028000100',
    '20261029000100',
    '20261029000200',
    '20261030000100',
  ];
  if (
    !Array.isArray(versions) ||
    versions.length < 4 ||
    versions.length > supported.length ||
    versions.some((v, i) => v !== supported[i]) ||
    !Array.isArray(migrationFiles) ||
    migrationFiles.length !== versions.length ||
    [...migrationFiles]
      .sort()
      .some((name, i) => !new RegExp(`^${versions[i]}_[a-z0-9_]+[.]sql$`).test(name))
  )
    throw new Error('Unexpected archive history');
}
export function restoreImportSQL(dataSQL) {
  return `BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM private.product_lookup_gate) <> 1
     OR NOT EXISTS (SELECT 1 FROM private.product_lookup_gate WHERE singleton AND next_allowed_at = '-infinity'::timestamptz)
     OR EXISTS (SELECT 1 FROM auth.users)
     OR EXISTS (SELECT 1 FROM public.reserves)
     OR EXISTS (SELECT 1 FROM private.requests)
  THEN RAISE EXCEPTION 'Restore target is not a fresh reviewed baseline'; END IF;
END $$;
SET LOCAL session_replication_role=replica;
DELETE FROM private.product_lookup_gate WHERE singleton;
${dataSQL}
SET LOCAL session_replication_role=origin;
COMMIT;
`;
}
