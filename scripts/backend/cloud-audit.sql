-- Metadata only, no mutations and no private household data in the output.
with tables as (
  select c.oid, n.nspname, c.relname, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where (n.nspname = 'public' and c.relname in
    ('reserves','reserve_members','products','product_stock','shopping_items'))
    or (n.nspname = 'private' and c.relname in ('invitations','requests','scan_operations','product_lookup_gate','product_photos','photo_rate'))
), functions as (
  select p.*, n.nspname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' or (n.nspname = 'public' and p.proname in
    ('create_reserve','invite_member','accept_invitation','mutate_reserve','get_reserve_snapshot','claim_product_lookup','claim_product_lookup_slot','restore_reserve','claim_product_photo','read_product_photo','commit_product_photo'))
), violations as (
  select 'Nombre de tables inattendu' as problem where (select count(*) from tables) <> 8
    + case when to_regclass('private.product_lookup_gate') is not null then 1 else 0 end
    + case when to_regprocedure('public.commit_product_photo(uuid,uuid,uuid,uuid,text,bigint,text,text,integer,integer)') is not null then 2 else 0 end
  union all select 'Nombre de fonctions inattendu' where (select count(*) from functions) <> 14
    + case when to_regprocedure('public.claim_product_lookup(integer)') is not null then 1 else 0 end
    + case when to_regprocedure('public.claim_product_lookup_slot(integer)') is not null then 1 else 0 end
    + case when to_regprocedure('public.restore_reserve(uuid,uuid,bigint,jsonb)') is not null then 2 else 0 end
    + case when to_regprocedure('public.commit_product_photo(uuid,uuid,uuid,uuid,text,bigint,text,text,integer,integer)') is not null then 4 else 0 end
  union all select 'RLS absente : ' || nspname || '.' || relname from tables where relname<>'product_lookup_gate' and not relrowsecurity
  union all select 'Lecture authenticated incorrecte : ' || nspname || '.' || relname from tables
    where has_table_privilege('authenticated', oid, 'SELECT') <> (nspname = 'public')
  union all select 'Écriture authenticated autorisée : ' || nspname || '.' || relname from tables
    where has_table_privilege('authenticated', oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  union all select 'Accès table ' || r.role || ' : ' || nspname || '.' || relname from tables
    cross join (values ('anon'),('service_role')) r(role)
    where has_table_privilege(r.role, oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  union all select 'search_path privilégié incorrect : ' || oid::regprocedure::text from functions
    where prosecdef and not coalesce(proconfig @> array['search_path=""'], false)
  union all select 'Exécution anon/service_role incorrecte : ' || oid::regprocedure::text from functions
    where has_function_privilege('anon', oid, 'EXECUTE') or has_function_privilege('service_role', oid, 'EXECUTE') <>
      coalesce(oid=to_regprocedure('public.commit_product_photo(uuid,uuid,uuid,uuid,text,bigint,text,text,integer,integer)'),false)
  union all select 'Exécution PUBLIC autorisée : ' || f.oid::regprocedure::text from functions f
    where exists(select 1 from aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a
      where a.grantee = 0 and a.privilege_type = 'EXECUTE')
  union all select 'Exécution authenticated incorrecte : ' || oid::regprocedure::text from functions
    where has_function_privilege('authenticated', oid, 'EXECUTE') <>
      ((nspname = 'public' and proname<>'commit_product_photo') or proname = 'is_member')
  union all select 'Droits de schéma private excessifs' where
    has_schema_privilege('anon', 'private', 'USAGE,CREATE') or
    has_schema_privilege('service_role', 'private', 'USAGE,CREATE') or
    has_schema_privilege('authenticated', 'private', 'CREATE')
  union all select 'USAGE authenticated manquant sur private'
    where not has_schema_privilege('authenticated', 'private', 'USAGE')
  union all select 'Le snapshot doit rester SECURITY INVOKER' from functions
    where nspname = 'public' and proname = 'get_reserve_snapshot' and prosecdef
)
select jsonb_build_object(
  'violations', (select coalesce(jsonb_agg(problem), '[]'::jsonb) from violations),
  'tables', (select jsonb_agg(jsonb_build_object('schema', nspname, 'table', relname, 'rls', relrowsecurity)) from tables),
  'constraints', (select jsonb_agg(jsonb_build_object('table', conrelid::regclass::text,
    'name', conname, 'definition', pg_get_constraintdef(oid))) from pg_constraint where conrelid in (select oid from tables)),
  'indexes', (select jsonb_agg(to_jsonb(i)) from pg_indexes i
    where (schemaname, tablename) in (select nspname, relname from tables)),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p where (schemaname, tablename) in (select nspname, relname from tables)),
  'functions', (select jsonb_agg(jsonb_build_object('signature', oid::regprocedure::text,
    'security_definer', prosecdef, 'settings', proconfig)) from functions),
  'api_schema_setting_if_visible', current_setting('pgrst.db_schemas', true)
) as audit;
-- Require violations = []; also review policy expressions, constraints and exposed schemas.
-- In particular get_reserve_snapshot must remain SECURITY INVOKER.
