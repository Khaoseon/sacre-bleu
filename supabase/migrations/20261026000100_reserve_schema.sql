-- Phase 2A: explicit grants + RLS reads; all mutations use checked RPCs.
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges revoke execute on functions from public;

create table public.reserves (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete restrict,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.reserve_members (
  reserve_id uuid not null references public.reserves(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (reserve_id,user_id)
);
create index reserve_members_by_user on public.reserve_members(user_id,reserve_id);
create unique index one_reserve_owner on public.reserve_members(reserve_id) where role = 'owner';
create table public.products (
  id uuid primary key default gen_random_uuid(),
  reserve_id uuid not null references public.reserves(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  barcode text check (barcode ~ '^[0-9]{4,32}$'),
  brand text check (length(brand) <= 80),
  size numeric check (size > 0 and size <= 99999),
  unit text check (unit in ('g','kg','ml','L','pièce')),
  category text check (category in ('Féculents','Conserves','Légumineuses','Épicerie','Autres')),
  photo_path text check (length(photo_path) <= 512 and photo_path like reserve_id::text || '/' || id::text || '/%' and position('..' in photo_path) = 0),
  updated_at timestamptz not null default now(),
  unique (reserve_id,id),
  unique (reserve_id,barcode),
  check ((size is null and unit is null) or (size is not null and unit is not null))
);
create index products_by_name on public.products(reserve_id,lower(name));
create index products_by_modified on public.products(reserve_id,updated_at desc);
create table public.product_stock (
  product_id uuid primary key,
  reserve_id uuid not null,
  quantity integer not null default 0 check (quantity between 0 and 9999),
  minimum integer check (minimum between 0 and 9999),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  foreign key (reserve_id,product_id) references public.products(reserve_id,id) on delete cascade
);
create index stock_by_reserve on public.product_stock(reserve_id);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  reserve_id uuid not null references public.reserves(id) on delete cascade,
  product_id uuid,
  name text not null check (length(btrim(name)) between 1 and 120),
  quantity integer not null check (quantity between 0 and 9999),
  checked boolean not null default false,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (reserve_id,product_id) references public.products(reserve_id,id),
  check (checked or quantity > 0)
);
create index shopping_by_reserve on public.shopping_items(reserve_id,created_at,id);
create unique index one_active_linked_item on public.shopping_items(reserve_id,product_id) where product_id is not null and not checked;

create table private.invitations (
  id uuid primary key default gen_random_uuid(),
  reserve_id uuid not null references public.reserves(id) on delete cascade,
  invited_email text not null check (invited_email = lower(btrim(invited_email)) and length(invited_email) between 3 and 254),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used_by uuid references auth.users(id) on delete restrict,
  used_at timestamptz,
  revoked_at timestamptz,
  check ((used_by is null) = (used_at is null))
);
create index invitations_by_reserve on private.invitations(reserve_id);
create table private.requests (
  actor_id uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  parameters jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id,request_id)
);
create table private.scan_operations (
  id uuid primary key,
  reserve_id uuid not null references public.reserves(id) on delete cascade,
  product_id uuid not null, -- Keep the idempotency/compensation record after catalogue deletion.
  actor_id uuid not null references auth.users(id) on delete restrict,
  mode smallint not null check (mode in (-1,1)),
  quantity integer not null check (quantity between 0 and 9999),
  version bigint not null default 1,
  cancelled boolean not null default false,
  last_revision bigint not null,
  last_stock_version bigint not null,
  shopping_before jsonb not null,
  shopping_after jsonb not null,
  created_at timestamptz not null default now()
);
create index scans_by_reserve on private.scan_operations(reserve_id,actor_id);

create function private.require_user() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists(select 1 from auth.users where id = v_user and not coalesce(is_anonymous,false) and email_confirmed_at is not null) then
    raise exception using errcode = '42501', message = 'Compte connecté et adresse vérifiée requis.';
  end if;
  return v_user;
end $$;
create function private.is_member(p_reserve uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.reserve_members where reserve_id = p_reserve and user_id = (select auth.uid()));
$$;
create function private.lock_reserve(p_reserve uuid) returns public.reserves language plpgsql security definer set search_path = '' as $$
declare v_row public.reserves;
begin
  perform private.require_user();
  if not private.is_member(p_reserve) then raise exception using errcode = '42501', message = 'Accès à cette réserve refusé.'; end if;
  select * into v_row from public.reserves where id = p_reserve for update;
  if not found or not private.is_member(p_reserve) then
    raise exception using errcode = '42501', message = 'Accès à cette réserve refusé.';
  end if;
  return v_row;
end $$;
create function private.enforce_member_limit() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.reserves where id = new.reserve_id for update;
  if (new.role = 'owner') is distinct from (new.user_id = v_owner) then
    raise exception using errcode = '23514', message = 'Rôle de membre invalide.';
  end if;
  if tg_op = 'UPDATE' and (old.reserve_id,old.user_id,old.role) is distinct from (new.reserve_id,new.user_id,new.role) then
    raise exception using errcode = '42501', message = 'Les droits des membres sont immuables.';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.reserve_members where reserve_id = new.reserve_id) >= 2 then
    raise exception using errcode = '23514', message = 'Deux membres maximum par réserve.';
  end if;
  return new;
end $$;
create trigger enforce_member_limit before insert or update on public.reserve_members for each row execute function private.enforce_member_limit();

-- Advisory lock precedes reserve row locks, including requests crossing different reserves.
create function private.begin_request(p_key uuid,p_parameters jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := private.require_user(); v_old private.requests;
begin
  if p_key is null then raise exception using errcode = '22023', message = 'Clé d’idempotence obligatoire.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || p_key::text,0));
  select * into v_old from private.requests where actor_id = v_actor and request_id = p_key;
  if found then
    if v_old.parameters <> p_parameters then raise exception using errcode = '22023', message = 'Clé d’idempotence réutilisée avec des paramètres différents.'; end if;
    return v_old.response;
  end if;
  return null;
end $$;
create function private.finish_request(p_key uuid,p_parameters jsonb,p_response jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  insert into private.requests(actor_id,request_id,parameters,response) values (auth.uid(),p_key,p_parameters,p_response);
  return p_response;
end $$;
create function private.validate_keys(p_payload jsonb,p_allowed text[]) returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or exists(select 1 from jsonb_object_keys(p_payload) k where not (k = any(p_allowed))) then
    raise exception using errcode = '22023', message = 'Paramètres invalides ou champ non autorisé.';
  end if;
end $$;

alter table public.reserves enable row level security;
alter table public.reserve_members enable row level security;
alter table public.products enable row level security;
alter table public.product_stock enable row level security;
alter table public.shopping_items enable row level security;
alter table private.invitations enable row level security;
alter table private.requests enable row level security;
alter table private.scan_operations enable row level security;
revoke all on public.reserves, public.reserve_members, public.products, public.product_stock, public.shopping_items from public,anon,authenticated,service_role;
revoke all on all tables in schema private from public,anon,authenticated,service_role;
grant select on public.reserves, public.reserve_members, public.products, public.product_stock, public.shopping_items to authenticated;
create policy member_read on public.reserves for select to authenticated using (private.is_member(id));
create policy member_read on public.reserve_members for select to authenticated using (private.is_member(reserve_id));
create policy member_read on public.products for select to authenticated using (private.is_member(reserve_id));
create policy member_read on public.product_stock for select to authenticated using (private.is_member(reserve_id));
create policy member_read on public.shopping_items for select to authenticated using (private.is_member(reserve_id));
revoke all on all functions in schema private from public,anon,authenticated,service_role;
grant execute on function private.is_member(uuid) to authenticated;
