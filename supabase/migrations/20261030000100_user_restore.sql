-- Phase 5: additive RPC. Existing clients, RLS and mutation contracts unchanged.
create function private.validate_user_backup(p jsonb) returns void
language plpgsql stable set search_path = '' as $$
declare v jsonb; k text; ids text[] := array[]::text[]; codes text[] := array[]::text[]; item_ids text[] := array[]::text[]; links text[] := array[]::text[];
begin
  perform private.validate_keys(p,array['format','version','exportedAt','products','shopping']);
  if not coalesce(p->>'format' = 'sacre-bleu' and p->'version' = '1'::jsonb
    and jsonb_typeof(p->'exportedAt') = 'string'
    and p->>'exportedAt' ~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$'
    and jsonb_typeof(p->'products') = 'array' and jsonb_typeof(p->'shopping') = 'array',false)
    or octet_length(p::text) > 2000000 then
    raise exception using errcode='22023', message='Format de sauvegarde invalide.';
  end if;
  perform (p->>'exportedAt')::timestamptz;
  if jsonb_array_length(p->'products') > 2000 or jsonb_array_length(p->'shopping') > 2000 then
    raise exception using errcode='22023', message='Sauvegarde trop volumineuse.';
  end if;
  for v in select value from jsonb_array_elements(p->'products') loop
    perform private.validate_keys(v,array['id','name','barcode','brand','size','unit','category','quantity','minimum','off_barcode','off_image_url','updatedAt']);
    if (select count(*) from jsonb_object_keys(v)) <> 12 then raise exception using errcode='22023',message='Champs produit incomplets.'; end if;
    if not coalesce(jsonb_typeof(v->'id')='string' and v->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and not (v->>'id'=any(ids)) and jsonb_typeof(v->'name')='string' and length(btrim(v->>'name')) between 1 and 120
      and jsonb_typeof(v->'quantity')='number' and (v->>'quantity')::numeric between 0 and 9999 and trunc((v->>'quantity')::numeric)=(v->>'quantity')::numeric
      and jsonb_typeof(v->'updatedAt')='string' and v->>'updatedAt' ~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$',false) then
      raise exception using errcode='22023',message='Produit invalide.';
    end if;
    perform (v->>'updatedAt')::timestamptz;
    foreach k in array array['minimum','size'] loop
      if v->k <> 'null'::jsonb and not coalesce(jsonb_typeof(v->k)='number'
        and (case when k='minimum' then (v->>k)::numeric between 0 and 9999 and trunc((v->>k)::numeric)=(v->>k)::numeric
        else (v->>k)::numeric > 0 and (v->>k)::numeric <= 99999 end),false) then
        raise exception using errcode='22023',message='Nombre invalide.';
      end if;
    end loop;
    if not coalesce((v->'brand'='null'::jsonb or jsonb_typeof(v->'brand')='string' and length(btrim(v->>'brand')) between 1 and 80)
      and (v->'category'='null'::jsonb or jsonb_typeof(v->'category')='string' and v->>'category' in ('Féculents','Conserves','Légumineuses','Épicerie','Autres'))
      and ((v->'size'='null'::jsonb and v->'unit'='null'::jsonb) or (v->'size'<>'null'::jsonb and jsonb_typeof(v->'unit')='string' and v->>'unit' in ('g','kg','ml','L','pièce')))
      and (v->'barcode'='null'::jsonb or jsonb_typeof(v->'barcode')='string' and v->>'barcode' ~ '^[0-9]{4,32}$' and not (v->>'barcode'=any(codes)))
      and (v->'off_barcode'='null'::jsonb or jsonb_typeof(v->'off_barcode')='string' and v->>'off_barcode' ~ '^[0-9]{4,32}$')
      and (v->'off_image_url'='null'::jsonb or jsonb_typeof(v->'off_image_url')='string' and length(v->>'off_image_url') <= 512 and v->>'off_image_url' ~ '^https://images\.openfoodfacts\.org/images/products/[a-zA-Z0-9/_.-]+\.(jpg|jpeg|png|webp)$' and position('..' in v->>'off_image_url')=0 and v->'off_barcode'<>'null'::jsonb),false) then
      raise exception using errcode='22023',message='Champ produit invalide.';
    end if;
    ids := array_append(ids,v->>'id');
    if v->'barcode'<>'null'::jsonb then codes := array_append(codes,v->>'barcode'); end if;
  end loop;
  for v in select value from jsonb_array_elements(p->'shopping') loop
    perform private.validate_keys(v,array['id','product_id','name','quantity','checked']);
    if (select count(*) from jsonb_object_keys(v)) <> 5 then raise exception using errcode='22023',message='Champs courses incomplets.'; end if;
    if not coalesce(jsonb_typeof(v->'id')='string' and v->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and not(v->>'id'=any(item_ids))
      and jsonb_typeof(v->'name')='string' and length(btrim(v->>'name')) between 1 and 120
      and jsonb_typeof(v->'quantity')='number' and (v->>'quantity')::numeric between 0 and 9999 and trunc((v->>'quantity')::numeric)=(v->>'quantity')::numeric
      and jsonb_typeof(v->'checked')='boolean' and (v->'checked'='true'::jsonb or (v->>'quantity')::numeric>0)
      and (v->'product_id'='null'::jsonb or jsonb_typeof(v->'product_id')='string' and v->>'product_id'=any(ids))
      and (v->'checked'='true'::jsonb or v->'product_id'='null'::jsonb or not(v->>'product_id'=any(links))),false) then
      raise exception using errcode='22023',message='Article ou lien invalide.';
    end if;
    item_ids := array_append(item_ids,v->>'id');
    if v->'checked'='false'::jsonb and v->'product_id'<>'null'::jsonb then links := array_append(links,v->>'product_id'); end if;
  end loop;
end $$;
revoke all on function private.validate_user_backup(jsonb) from public,anon,authenticated,service_role;

create function public.restore_reserve(p_request_id uuid,p_reserve_id uuid,p_expected_revision bigint,p_backup jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  params jsonb := jsonb_build_object('action','restore','reserve_id',p_reserve_id,'expected_revision',p_expected_revision,'backup',p_backup);
  cached jsonb; r public.reserves; v jsonb; mapping jsonb := '{}'::jsonb; new_id uuid; revision bigint;
begin
  cached := private.begin_request(p_request_id,params);
  r := private.lock_reserve(p_reserve_id);
  if r.owner_id <> auth.uid() then raise exception using errcode='42501',message='Restauration réservée au propriétaire.'; end if;
  if cached is not null then return cached; end if;
  if p_expected_revision is null or r.revision <> p_expected_revision then
    raise sqlstate 'PGRST' using message='{"code":"40001","message":"La réserve a changé. Recréez l’aperçu avant de restaurer.","details":null,"hint":null}',detail='{"status":409,"headers":{}}';
  end if;
  perform private.validate_user_backup(p_backup);
  -- Private Storage is not implemented. Never silently drop a future private photo.
  if exists(select 1 from public.products where reserve_id=p_reserve_id and photo_path is not null) then
    raise exception using errcode='22023',message='Photos privées présentes : restauration administrative requise.';
  end if;
  delete from public.shopping_items where reserve_id=p_reserve_id;
  delete from public.products where reserve_id=p_reserve_id;
  for v in select value from jsonb_array_elements(p_backup->'products') loop
    new_id := gen_random_uuid();
    mapping := mapping || jsonb_build_object(v->>'id',new_id);
    insert into public.products(id,reserve_id,name,barcode,brand,size,unit,category,off_barcode,off_image_url,updated_at)
      values(new_id,p_reserve_id,v->>'name',v->>'barcode',v->>'brand',(v->>'size')::numeric,v->>'unit',v->>'category',v->>'off_barcode',v->>'off_image_url',(v->>'updatedAt')::timestamptz);
    insert into public.product_stock(product_id,reserve_id,quantity,minimum)
      values(new_id,p_reserve_id,((v->>'quantity')::numeric)::integer,((v->>'minimum')::numeric)::integer);
  end loop;
  for v in select value from jsonb_array_elements(p_backup->'shopping') loop
    insert into public.shopping_items(id,reserve_id,product_id,name,quantity,checked)
      values(gen_random_uuid(),p_reserve_id,(mapping->>(v->>'product_id'))::uuid,v->>'name',((v->>'quantity')::numeric)::integer,(v->>'checked')::boolean);
  end loop;
  update public.reserves set revision=reserves.revision+1,updated_at=clock_timestamp() where id=p_reserve_id returning reserves.revision into revision;
  return private.finish_request(p_request_id,params,jsonb_build_object('revision',revision));
end $$;
revoke all on function public.restore_reserve(uuid,uuid,bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.restore_reserve(uuid,uuid,bigint,jsonb) to authenticated;
