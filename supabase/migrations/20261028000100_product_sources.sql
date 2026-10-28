-- Public OFF provenance is separate from private Storage paths and personal stock.
alter table public.products
  add column off_barcode text check (off_barcode ~ '^[0-9]{4,32}$'),
  add column off_image_url text check (
    length(off_image_url) <= 512 and
    off_image_url ~ '^https://images\.openfoodfacts\.org/images/products/[a-zA-Z0-9/_.-]+\.(jpg|jpeg|png|webp)$' and
    position('..' in off_image_url) = 0
  ),
  add constraint off_image_needs_source check (off_image_url is null or off_barcode is not null);
comment on column public.products.off_barcode is 'Open Food Facts source, ODbL/DbCL. Personal stock is independent.';
comment on column public.products.off_image_url is 'Optional OFF image, CC BY-SA 3.0. Never a private photo_path.';

-- A single durable application budget survives Edge cold starts and multiple isolates.
-- Six seconds is our conservative policy, not a permanent OFF quota.
create table private.product_lookup_gate (
  singleton boolean primary key default true check (singleton),
  next_allowed_at timestamptz not null default '-infinity'
);
insert into private.product_lookup_gate(singleton) values (true);
revoke all on private.product_lookup_gate from public,anon,authenticated,service_role;
create function public.claim_product_lookup(p_cooldown_seconds integer default 0) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_next timestamptz;
begin
  perform private.require_user();
  if not exists(select 1 from public.reserve_members where user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Appartenance à une réserve requise.';
  end if;
  if p_cooldown_seconds is null or p_cooldown_seconds not between 0 and 86400 then
    raise exception using errcode = '22023', message = 'Délai invalide.';
  end if;
  select next_allowed_at into v_next from private.product_lookup_gate where singleton for update;
  if p_cooldown_seconds > 0 then
    update private.product_lookup_gate set next_allowed_at = greatest(v_next,clock_timestamp()+pg_catalog.make_interval(secs => p_cooldown_seconds)) where singleton;
    return false;
  end if;
  if v_next > clock_timestamp() then return false; end if;
  update private.product_lookup_gate set next_allowed_at = clock_timestamp()+interval '6 seconds' where singleton;
  return true;
end $$;
revoke all on function public.claim_product_lookup(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_product_lookup(integer) to authenticated;

-- Only catalogue fields change below. Stock, shopping, receipts and compensation are unchanged.
create or replace function public.mutate_reserve(p_request_id uuid,p_reserve_id uuid,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_params jsonb := jsonb_build_object('action',p_action,'reserve_id',p_reserve_id,'payload',p_payload);
  v_cached jsonb; v_reserve public.reserves; v_product public.products; v_stock public.product_stock;
  v_item public.shopping_items; v_scan private.scan_operations;
  v_id uuid; v_link uuid; v_delta integer; v_total integer; v_initial integer; v_checked boolean;
  v_before jsonb; v_response jsonb := '{}'::jsonb; v_revision bigint;
begin
  v_cached := private.begin_request(p_request_id,v_params);
  v_reserve := private.lock_reserve(p_reserve_id);
  if v_cached is not null then return v_cached; end if;
  case p_action
  when 'create_product' then
    perform private.validate_keys(p_payload,array['id','name','barcode','brand','size','unit','category','photo_path','off_barcode','off_image_url','initial_quantity','minimum']);
    v_id := coalesce((p_payload->>'id')::uuid,gen_random_uuid());
    v_initial := coalesce((p_payload->>'initial_quantity')::integer,0);
    insert into public.products(id,reserve_id,name,barcode,brand,size,unit,category,photo_path,off_barcode,off_image_url) values (
      v_id,p_reserve_id,btrim(p_payload->>'name'),nullif(btrim(p_payload->>'barcode'),''),nullif(btrim(p_payload->>'brand'),''),
      (p_payload->>'size')::numeric,p_payload->>'unit',p_payload->>'category',p_payload->>'photo_path',p_payload->>'off_barcode',p_payload->>'off_image_url');
    insert into public.product_stock(product_id,reserve_id,quantity,minimum) values (v_id,p_reserve_id,v_initial,(p_payload->>'minimum')::integer);
    v_response := jsonb_build_object('product_id',v_id,'stock',v_initial);
  when 'update_product' then
    perform private.validate_keys(p_payload,array['product_id','name','barcode','brand','size','unit','category','photo_path','off_barcode','off_image_url','minimum']);
    v_id := (p_payload->>'product_id')::uuid;
    select * into v_product from public.products where id = v_id and reserve_id = p_reserve_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'Produit introuvable dans cette réserve.'; end if;
    update public.products set
      name = case when p_payload ? 'name' then btrim(p_payload->>'name') else name end,
      barcode = case when p_payload ? 'barcode' then nullif(btrim(p_payload->>'barcode'),'') else barcode end,
      brand = case when p_payload ? 'brand' then nullif(btrim(p_payload->>'brand'),'') else brand end,
      size = case when p_payload ? 'size' then (p_payload->>'size')::numeric else size end,
      unit = case when p_payload ? 'unit' then p_payload->>'unit' else unit end,
      category = case when p_payload ? 'category' then p_payload->>'category' else category end,
      photo_path = case when p_payload ? 'photo_path' then p_payload->>'photo_path' else photo_path end,
      off_barcode = case when p_payload ? 'off_barcode' then p_payload->>'off_barcode' else off_barcode end,
      off_image_url = case when p_payload ? 'off_image_url' then p_payload->>'off_image_url' else off_image_url end,
      updated_at = clock_timestamp()
      where id = v_id;
    if p_payload ? 'minimum' then
      update public.product_stock set minimum = (p_payload->>'minimum')::integer,version = version+1,updated_at = clock_timestamp() where product_id = v_id;
    end if;
    v_response := jsonb_build_object('product_id',v_id);
  when 'delete_product' then
    perform private.validate_keys(p_payload,array['product_id']);
    v_id := (p_payload->>'product_id')::uuid;
    if not exists(select 1 from public.products where id = v_id and reserve_id = p_reserve_id) then raise exception using errcode = 'P0002', message = 'Produit introuvable dans cette réserve.'; end if;
    update public.shopping_items set product_id = null,version = version+1,updated_at = clock_timestamp() where product_id = v_id and reserve_id = p_reserve_id;
    delete from public.products where id = v_id and reserve_id = p_reserve_id;
    v_response := jsonb_build_object('product_id',v_id,'deleted',true);
  when 'add_shopping' then
    perform private.validate_keys(p_payload,array['id','product_id','name','quantity']);
    v_link := (p_payload->>'product_id')::uuid;
    v_total := (p_payload->>'quantity')::integer;
    if v_total is null or v_total not between 1 and 9999 then raise exception using errcode = '22023', message = 'Quantité de courses invalide.'; end if;
    if v_link is not null then
      select * into v_product from public.products where id = v_link and reserve_id = p_reserve_id;
      if not found then raise exception using errcode = 'P0002', message = 'Produit introuvable dans cette réserve.'; end if;
      select * into v_item from public.shopping_items where reserve_id = p_reserve_id and product_id = v_link and not checked for update;
    end if;
    if v_item.id is not null then
      update public.shopping_items set quantity = quantity+v_total,version = version+1,updated_at = clock_timestamp() where id = v_item.id returning id into v_id;
    else
      v_id := coalesce((p_payload->>'id')::uuid,gen_random_uuid());
      insert into public.shopping_items(id,reserve_id,product_id,name,quantity) values (v_id,p_reserve_id,v_link,case when v_link is null then btrim(p_payload->>'name') else v_product.name end,v_total);
    end if;
    v_response := jsonb_build_object('shopping_id',v_id);
  when 'update_shopping' then
    perform private.validate_keys(p_payload,array['shopping_id','name','quantity','checked']);
    v_id := (p_payload->>'shopping_id')::uuid;
    select * into v_item from public.shopping_items where id = v_id and reserve_id = p_reserve_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'Article introuvable dans cette réserve.'; end if;
    v_total := case when p_payload ? 'quantity' then (p_payload->>'quantity')::integer else v_item.quantity end;
    v_checked := case when p_payload ? 'checked' then (p_payload->>'checked')::boolean when p_payload ? 'quantity' then false else v_item.checked end;
    if not v_checked and v_total = 0 and not (p_payload ? 'quantity') then v_total := 1; end if;
    update public.shopping_items set name = case when p_payload ? 'name' then btrim(p_payload->>'name') else name end,
      quantity = v_total,checked = v_checked,version = version+1,updated_at = clock_timestamp() where id = v_id;
    v_response := jsonb_build_object('shopping_id',v_id);
  when 'delete_shopping' then
    perform private.validate_keys(p_payload,array['shopping_id']);
    v_id := (p_payload->>'shopping_id')::uuid;
    delete from public.shopping_items where id = v_id and reserve_id = p_reserve_id;
    if not found then raise exception using errcode = 'P0002', message = 'Article introuvable dans cette réserve.'; end if;
    v_response := jsonb_build_object('shopping_id',v_id,'deleted',true);
  when 'stock', 'scan' then
    perform private.validate_keys(p_payload,array['product_id','delta']);
    v_id := (p_payload->>'product_id')::uuid;
    v_delta := (p_payload->>'delta')::integer;
    if v_delta is null or v_delta = 0 or v_delta not between -9999 and 9999 then raise exception using errcode = '22023', message = 'Mouvement de stock invalide.'; end if;
    select * into v_stock from public.product_stock where product_id = v_id and reserve_id = p_reserve_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'Produit introuvable dans cette réserve.'; end if;
    v_before := private.shopping_snapshot(p_reserve_id,v_id);
    update public.product_stock set quantity = quantity+v_delta,version = version+1,updated_at = clock_timestamp() where product_id = v_id returning * into v_stock;
    if p_action = 'scan' then
      if v_delta > 0 then perform private.apply_scan_shopping(p_reserve_id,v_before,v_delta); end if;
      insert into private.scan_operations(id,reserve_id,product_id,actor_id,mode,quantity,last_revision,last_stock_version,shopping_before,shopping_after)
        values (p_request_id,p_reserve_id,v_id,auth.uid(),case when v_delta > 0 then 1 else -1 end,abs(v_delta),v_reserve.revision+1,v_stock.version,v_before,private.shopping_snapshot(p_reserve_id,v_id));
      v_response := jsonb_build_object('scan_id',p_request_id,'scan_version',1,'processed',abs(v_delta));
    end if;
    update public.products set updated_at = clock_timestamp() where id = v_id;
    v_response := v_response || jsonb_build_object('product_id',v_id,'stock',v_stock.quantity,'stock_version',v_stock.version);
  when 'adjust_scan', 'undo_scan' then
    perform private.validate_keys(p_payload,case when p_action = 'adjust_scan' then array['scan_id','expected_version','quantity'] else array['scan_id','expected_version'] end);
    select * into v_scan from private.scan_operations where id = (p_payload->>'scan_id')::uuid and reserve_id = p_reserve_id and actor_id = auth.uid() for update;
    if not found then raise exception using errcode = '42501', message = 'Ce scan ne vous appartient pas.'; end if;
    if v_scan.cancelled or v_scan.version is distinct from (p_payload->>'expected_version')::bigint or v_scan.last_revision <> v_reserve.revision then
      raise exception using errcode = '40001', message = 'Scan périmé : une autre modification empêche sa correction ou son annulation.';
    end if;
    v_id := v_scan.product_id;
    select * into v_stock from public.product_stock where product_id = v_id and reserve_id = p_reserve_id for update;
    if not found or v_stock.version <> v_scan.last_stock_version or private.shopping_snapshot(p_reserve_id,v_id) <> v_scan.shopping_after then
      raise exception using errcode = '40001', message = 'Les données du scan ont changé.';
    end if;
    v_total := case when p_action = 'undo_scan' then 0 else (p_payload->>'quantity')::integer end;
    if v_total is null or (p_action = 'adjust_scan' and v_total not between 1 and 9999) then raise exception using errcode = '22023', message = 'Le total traité doit être compris entre 1 et 9999.'; end if;
    if v_total = v_scan.quantity then
      return private.finish_request(p_request_id,v_params,jsonb_build_object('scan_id',v_scan.id,'scan_version',v_scan.version,'processed',v_total,'product_id',v_id,'stock',v_stock.quantity,'revision',v_reserve.revision));
    end if;
    v_delta := v_scan.mode*(v_total-v_scan.quantity);
    update public.product_stock set quantity = quantity+v_delta,version = version+1,updated_at = clock_timestamp() where product_id = v_id returning * into v_stock;
    if v_scan.mode = 1 then perform private.apply_scan_shopping(p_reserve_id,v_scan.shopping_before,v_total); end if;
    update public.products set updated_at = clock_timestamp() where id = v_id;
    update private.scan_operations set quantity = v_total,version = version+1,cancelled = (p_action = 'undo_scan'),last_revision = v_reserve.revision+1,
      last_stock_version = v_stock.version,shopping_after = private.shopping_snapshot(p_reserve_id,v_id) where id = v_scan.id returning * into v_scan;
    v_response := jsonb_build_object('scan_id',v_scan.id,'scan_version',v_scan.version,'processed',v_total,'product_id',v_id,'stock',v_stock.quantity,'stock_version',v_stock.version,'cancelled',v_scan.cancelled);
  else
    raise exception using errcode = '22023', message = 'Action non autorisée.';
  end case;
  update public.reserves set revision = revision+1,updated_at = clock_timestamp() where id = p_reserve_id returning revision into v_revision;
  return private.finish_request(p_request_id,v_params,v_response || jsonb_build_object('revision',v_revision));
end $$;


revoke all on function public.mutate_reserve(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.mutate_reserve(uuid,uuid,text,jsonb) to authenticated;
notify pgrst, 'reload schema';
