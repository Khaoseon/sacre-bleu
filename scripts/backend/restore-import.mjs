/** For a fresh, isolated restore target only. Never execute against the source Cloud. */
export function restoreImportSQL(dataSQL) {
  return `BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM private.product_lookup_gate) <> 1
     OR NOT EXISTS (SELECT 1 FROM private.product_lookup_gate WHERE singleton AND next_allowed_at = '-infinity'::timestamptz)
     OR EXISTS (SELECT 1 FROM auth.users)
     OR EXISTS (SELECT 1 FROM public.reserves)
     OR EXISTS (SELECT 1 FROM private.requests)
  THEN RAISE EXCEPTION 'Restore target is not a fresh four-migration baseline'; END IF;
END $$;
SET LOCAL session_replication_role=replica;
DELETE FROM private.product_lookup_gate WHERE singleton;
${dataSQL}
SET LOCAL session_replication_role=origin;
COMMIT;
`;
}
