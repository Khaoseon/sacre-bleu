-- Read-only. Run on the selected EMPTY Cloud project before any migration.
select jsonb_build_object(
  'postgres_version', current_setting('server_version'),
  'postgres_major_matches_local_17', current_setting('server_version_num')::integer / 10000 = 17,
  'pgcrypto_available', exists(select 1 from pg_available_extensions where name = 'pgcrypto'),
  'pgcrypto_installed', (select jsonb_build_object('version', e.extversion, 'schema', n.nspname)
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pgcrypto'),
  'required_crypto_functions', exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'extensions' and p.proname = 'gen_random_bytes')
    and exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'extensions' and p.proname = 'digest'),
  'existing_application_relations', (select coalesce(jsonb_agg(n.nspname || '.' || c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private') and c.relkind in ('r','p','v','m')
    and not exists(select 1 from pg_depend d where d.classid = 'pg_class'::regclass
      and d.objid = c.oid and d.deptype = 'e')),
  'existing_application_functions', (select coalesce(jsonb_agg(p.oid::regprocedure::text), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
    and not exists(select 1 from pg_depend d where d.classid = 'pg_proc'::regclass
      and d.objid = p.oid and d.deptype = 'e')),
  'api_schema_setting_if_visible', current_setting('pgrst.db_schemas', true)
) as preflight;
-- A NULL API setting is inconclusive: verify Dashboard > Data API > Exposed schemas.
-- If pgcrypto is absent, migration 001 installs it in extensions.
-- If already installed elsewhere, STOP and review compatibility before proceeding.
