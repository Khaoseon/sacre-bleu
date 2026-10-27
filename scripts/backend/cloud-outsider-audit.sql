-- Pre-invitation audit only: exactly one reserve, one owner and two confirmed users.
-- No fixtures, new accounts, grants or persistent schema changes.
-- SQL role simulation complements the real authenticated UI; it is not an HTTP Auth test.
-- Unexpected write access raises an exception and rolls back the entire DO statement.
do $$
declare
  v_reserve uuid;
  v_owner uuid;
  v_outsider uuid;
  v_product uuid;
  v_count bigint;
  v_snapshot jsonb;
  v_denied boolean := false;
  v_table text;
begin
  if (select count(*) from public.reserves) <> 1
    or (select count(*) from public.reserve_members) <> 1
    or (select count(*) from auth.users where email_confirmed_at is not null) <> 2 then
    raise exception 'Préconditions non satisfaites : audit réservé à la recette avant invitation.';
  end if;
  select id, owner_id into strict v_reserve, v_owner from public.reserves;
  if not exists(select 1 from public.reserve_members
    where reserve_id = v_reserve and user_id = v_owner and role = 'owner') then
    raise exception 'Propriétaire incohérent.';
  end if;
  select id into strict v_outsider from auth.users
    where email_confirmed_at is not null and id <> v_owner;
  select id into strict v_product from public.products where reserve_id = v_reserve;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  foreach v_table in array array['reserves','reserve_members','products','product_stock','shopping_items'] loop
    execute format('select count(*) from public.%I', v_table) into v_count;
    if v_count <> 0 then raise exception 'RLS : lecture extérieure inattendue sur %.', v_table; end if;
  end loop;
  execute 'select public.get_reserve_snapshot($1)' into v_snapshot using v_reserve;
  if v_snapshot is not null then raise exception 'Snapshot accessible au compte extérieur.'; end if;

  begin
    execute 'select public.mutate_reserve($1,$2,$3,$4)'
      using gen_random_uuid(), v_reserve, 'stock', jsonb_build_object('product_id', v_product, 'delta', 1);
    raise exception 'Mutation RPC extérieure acceptée : annulation de toute la transaction.';
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'Refus RPC non constaté.'; end if;

  v_denied := false;
  begin
    execute 'update public.product_stock set quantity = quantity where product_id = $1' using v_product;
    raise exception 'Écriture directe acceptée : annulation de toute la transaction.';
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'Refus écriture directe non constaté.'; end if;
  execute 'reset role';
  raise notice 'OK : cinq lectures vides, snapshot absent, RPC et écriture directe refusées.';
end $$;
