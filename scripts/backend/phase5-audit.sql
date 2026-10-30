-- Read-only metadata/aggregate audit, compatible before and after phase 5.
with tables as (
  select c.oid,n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind='r' and ((n.nspname='public' and c.relname in ('reserves','reserve_members','products','product_stock','shopping_items'))
    or (n.nspname='private' and c.relname in ('invitations','requests','scan_operations','product_lookup_gate')))
), functions as (
  select p.*,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' or n.nspname='public' and p.proname in ('create_reserve','invite_member','accept_invitation','mutate_reserve','get_reserve_snapshot','claim_product_lookup','claim_product_lookup_slot','restore_reserve')
), violations as (
  select 'Inventaire de tables incorrect' as problem where (select count(*) from tables)<>9
  union all select 'Inventaire de fonctions incorrect' where (select count(*) from functions) <> case when to_regprocedure('public.restore_reserve(uuid,uuid,bigint,jsonb)') is null then 16 else 18 end
  union all select 'RLS absente : '||nspname||'.'||relname from tables where relname<>'product_lookup_gate' and not relrowsecurity
  union all select 'Lecture authenticated incorrecte : '||nspname||'.'||relname from tables where has_table_privilege('authenticated',oid,'SELECT')<>(nspname='public')
  union all select 'Écriture directe authenticated : '||nspname||'.'||relname from tables where has_table_privilege('authenticated',oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  union all select 'Accès table interdit : '||nspname||'.'||relname from tables cross join (values('anon'),('service_role')) r(role) where has_table_privilege(r.role,oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  union all select 'search_path privilégié incorrect : '||oid::regprocedure::text from functions where prosecdef and not coalesce(proconfig @> array['search_path=""'],false)
  union all select 'Exécution anon/service_role interdite : '||oid::regprocedure::text from functions where has_function_privilege('anon',oid,'EXECUTE') or has_function_privilege('service_role',oid,'EXECUTE')
  union all select 'Exécution PUBLIC interdite : '||oid::regprocedure::text from functions where exists(select 1 from aclexplode(coalesce(proacl,acldefault('f',proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE')
  union all select 'Helper privé exposé : '||oid::regprocedure::text from functions where nspname='private' and proname<>'is_member' and has_function_privilege('authenticated',oid,'EXECUTE')
  union all select 'RPC publique non exécutable : '||oid::regprocedure::text from functions where nspname='public' and not has_function_privilege('authenticated',oid,'EXECUTE')
  union all select 'Snapshot privilégié' from functions where proname='get_reserve_snapshot' and prosecdef
  union all select 'Propriétaire incohérent' where exists(select 1 from public.reserves r where not exists(select 1 from public.reserve_members m where m.reserve_id=r.id and m.user_id=r.owner_id and m.role='owner'))
  union all select 'Membres surnuméraires' where exists(select 1 from public.reserve_members group by reserve_id having count(*)>2)
  union all select 'Produit sans stock' where exists(select 1 from public.products p left join public.product_stock s on s.product_id=p.id and s.reserve_id=p.reserve_id where s.product_id is null)
  union all select 'Courses orphelines' where exists(select 1 from public.shopping_items s left join public.products p on p.id=s.product_id and p.reserve_id=s.reserve_id where s.product_id is not null and p.id is null)
)
select jsonb_build_object(
  'violations',(select coalesce(jsonb_agg(problem),'[]'::jsonb) from violations),
  'postgres_major',current_setting('server_version_num')::integer/10000,
  'restore_present',to_regprocedure('public.restore_reserve(uuid,uuid,bigint,jsonb)') is not null,
  'confirmed_accounts',(select count(*) from auth.users where email_confirmed_at is not null),
  'reserves',(select count(*) from public.reserves),
  'memberships',(select count(*) from public.reserve_members),
  'existing_routines_digest',(select encode(extensions.digest(string_agg(pg_get_functiondef(oid),E'\n' order by oid::regprocedure::text),'sha256'),'hex') from functions where proname not in ('restore_reserve','validate_user_backup'))
) as audit;
