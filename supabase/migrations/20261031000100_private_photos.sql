-- Small household photos live transactionally in PostgreSQL, not Storage.
-- No public paths, staged objects, signed URLs or asynchronous garbage collection.
alter table public.products add column photo_version bigint not null default 0 check (photo_version>=0);
create table private.product_photos (
  product_id uuid primary key,
  reserve_id uuid not null,
  path text not null unique,
  bytes bytea not null check (octet_length(bytes) between 100 and 500000),
  width integer not null check (width between 1 and 1024),
  height integer not null check (height between 1 and 1024),
  foreign key (reserve_id,product_id) references public.products(reserve_id,id) on delete cascade,
  check (path like reserve_id::text || '/' || product_id::text || '/%.jpg'),
  check (substring(bytes from 1 for 2) = decode('ffd8','hex'))
);
alter table private.product_photos enable row level security;
revoke all on private.product_photos from public,anon,authenticated,service_role;

create table private.photo_rate (
  actor_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  attempts integer not null
);
alter table private.photo_rate enable row level security;
revoke all on private.photo_rate from public,anon,authenticated,service_role;

-- Authorize and bound expensive decoding, using the actual caller JWT.
create function public.claim_product_photo(p_reserve_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_user(); n integer;
begin
  perform private.lock_reserve(p_reserve_id);
  insert into private.photo_rate values(actor,clock_timestamp(),1)
  on conflict(actor_id) do update set
    attempts = case when photo_rate.started_at < clock_timestamp()-interval '1 hour' then 1 else photo_rate.attempts+1 end,
    started_at = case when photo_rate.started_at < clock_timestamp()-interval '1 hour' then clock_timestamp() else photo_rate.started_at end
  returning attempts into n;
  if n > 30 then raise exception using errcode='23514',message='Photo rate exceeded'; end if;
end $$;
revoke all on function public.claim_product_photo(uuid) from public,anon,authenticated,service_role;
grant execute on function public.claim_product_photo(uuid) to authenticated;

create function public.read_product_photo(p_reserve_id uuid,p_product_id uuid,p_path text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not private.is_member(p_reserve_id) then raise exception using errcode='42501',message='Photo access denied'; end if;
  perform set_config('response.headers','[{"Cache-Control":"no-store, private"}]',true);
  return (select jsonb_build_object('data',encode(f.bytes,'base64'))
    from private.product_photos f join public.products p on p.id=f.product_id and p.reserve_id=f.reserve_id
    where f.reserve_id=p_reserve_id and f.product_id=p_product_id and f.path=p_path and p.photo_path=f.path);
end $$;
revoke all on function public.read_product_photo(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.read_product_photo(uuid,uuid,text) to authenticated;

-- A legacy client may preserve a reference or delete the product, but cannot
-- bypass photo version checks through a generic metadata update.
-- All old RPCs and restore/delete paths also participate in atomic cleanup.
create function private.guard_product_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.photo_path is distinct from old.photo_path then
    -- The actual SQL role, unlike caller-supplied claim metadata or a custom
    -- GUC, cannot be elevated by authenticated clients. Allow trusted SQL
    -- administrators for backup/fixture maintenance only.
    if current_setting('role') <> 'service_role' and not
      (current_setting('role')='none' and session_user in ('postgres','supabase_admin')) then
      raise exception using errcode='42501',message='Use the photo processor';
    end if;
    new.photo_version := old.photo_version+1;
    if new.photo_path is not null and not exists(
      select 1 from private.product_photos where product_id=new.id and reserve_id=new.reserve_id and path=new.photo_path
    ) then raise exception using errcode='22023',message='Unknown photo reference'; end if;
    delete from private.product_photos where product_id=new.id and path is distinct from new.photo_path;
  end if;
  return new;
end $$;
revoke all on function private.guard_product_photo() from public,anon,authenticated,service_role;
create trigger guard_product_photo before update of photo_path on public.products
for each row execute function private.guard_product_photo();

-- Only the trusted processor can submit bytes. It supplies a verified actor,
-- never a caller-selected identity. Membership is rechecked inside this transaction.
-- p_hash identifies the input, NOT metadata retained from the decoded JPEG.
-- A missing body on recovery fences the intention as aborted under the SAME lock
-- as commit; an in-flight upload can never commit after a confirmed abort.
create function public.commit_product_photo(
  p_actor uuid,p_request_id uuid,p_reserve_id uuid,p_product_id uuid,
  p_expected_path text,p_expected_version bigint,p_hash text,p_data text,p_width integer,p_height integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare params jsonb := jsonb_build_object('action','photo','reserve_id',p_reserve_id,'product_id',p_product_id,'expected_path',p_expected_path,'expected_version',p_expected_version,'hash',p_hash);
  previous private.requests; current_path text; current_version bigint; revision bigint; result jsonb; path text; image bytea;
begin
  if p_actor is null or p_request_id is null or not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then
    raise exception using errcode='42501',message='Confirmed actor required';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text || ':' || p_request_id::text,0));
  perform 1 from public.reserves where id=p_reserve_id for update;
  if not exists(select 1 from public.reserve_members where reserve_id=p_reserve_id and user_id=p_actor) then
    raise exception using errcode='42501',message='Photo access denied';
  end if;
  select * into previous from private.requests where actor_id=p_actor and request_id=p_request_id;
  if found then
    if previous.parameters <> params then raise exception using errcode='22023',message='Request reuse'; end if;
    return previous.response;
  end if;
  select r.revision into revision from public.reserves r where id=p_reserve_id;
  if p_hash is not null and p_data is null then
    result := jsonb_build_object('revision',revision,'aborted',true);
  else
    select photo_path,photo_version into current_path,current_version from public.products where reserve_id=p_reserve_id and id=p_product_id;
    if not found then raise exception using errcode='P0002',message='Product missing'; end if;
    if current_path is distinct from p_expected_path or current_version is distinct from p_expected_version then
      raise sqlstate 'PGRST' using message='{"code":"40001","message":"Photo changed","details":null,"hint":null}',detail='{"status":409,"headers":{}}';
    end if;
    if p_hash is not null then
      if p_hash !~ '^[a-f0-9]{64}$' or length(p_data)>666668 then raise exception using errcode='22023',message='Invalid photo'; end if;
      image := decode(p_data,'base64');
      -- Household cap: 40 photos / 20 MB. Replacement does not consume another slot.
      if (select count(*) from private.product_photos where reserve_id=p_reserve_id and product_id<>p_product_id)>=40 then
        raise exception using errcode='23514',message='Photo quota exceeded';
      end if;
      -- Asset identity is server-generated, not a caller-controlled request key:
      -- two different actors may legitimately reuse the same request UUID.
      path := p_reserve_id::text || '/' || p_product_id::text || '/' || gen_random_uuid()::text || '.jpg';
      insert into private.product_photos values(p_product_id,p_reserve_id,path,image,p_width,p_height)
      on conflict(product_id) do update set path=excluded.path,bytes=excluded.bytes,width=excluded.width,height=excluded.height;
    else
      if p_data is not null then raise exception using errcode='22023',message='Unexpected photo bytes'; end if;
      path := null;
    end if;
    update public.products set photo_path=path,updated_at=clock_timestamp() where id=p_product_id and reserve_id=p_reserve_id;
    update public.reserves r set revision=r.revision+1,updated_at=clock_timestamp() where id=p_reserve_id returning r.revision into revision;
    result := jsonb_build_object('revision',revision,'product_id',p_product_id);
  end if;
  insert into private.requests(actor_id,request_id,parameters,response) values(p_actor,p_request_id,params,result);
  return result;
end $$;
revoke all on function public.commit_product_photo(uuid,uuid,uuid,uuid,text,bigint,text,text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.commit_product_photo(uuid,uuid,uuid,uuid,text,bigint,text,text,integer,integer) to service_role;
