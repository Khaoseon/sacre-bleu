-- Replay a real, already committed stock/scan intention without new effects.
-- SQL role simulation complements the signed sessions exercised in the UI.
-- Any unexpected change aborts and rolls back this entire statement.
-- Run while both people leave the reserve unchanged.
do $$
declare
  v_request uuid;
  v_actor uuid;
  v_params jsonb;
  v_receipt jsonb;
  v_result jsonb;
  v_before jsonb;
  v_request_count bigint;
  v_changed_payload jsonb;
  v_rejected boolean := false;
begin
  if (select count(*) from public.reserves) <> 1 then
    raise exception 'Audit réservé à une réserve unique identifiée.';
  end if;
  select request_id, actor_id, parameters, response
    into strict v_request, v_actor, v_params, v_receipt
    from private.requests
    where parameters->>'action' in ('stock','scan')
    order by created_at desc limit 1;
  if not exists(select 1 from public.reserve_members
    where reserve_id = (v_params->>'reserve_id')::uuid and user_id = v_actor) then
    raise exception 'Auteur historique non membre : ne pas rejouer.';
  end if;
  select public.get_reserve_snapshot((v_params->>'reserve_id')::uuid) into v_before;
  select count(*) into v_request_count from private.requests;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_actor, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'select public.mutate_reserve($1,$2,$3,$4)' into v_result
    using v_request, (v_params->>'reserve_id')::uuid, v_params->>'action', v_params->'payload';
  if v_result is distinct from v_receipt then
    raise exception 'Reçu de replay différent : annulation.';
  end if;

  v_changed_payload := (v_params->'payload') || jsonb_build_object('delta',
    case when (v_params->'payload'->>'delta')::integer = 1 then 2 else 1 end);
  begin
    execute 'select public.mutate_reserve($1,$2,$3,$4)'
      using v_request, (v_params->>'reserve_id')::uuid, v_params->>'action', v_changed_payload;
    raise exception 'Clé réutilisée avec paramètres différents acceptée : annulation.';
  exception when invalid_parameter_value then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Refus de réutilisation non constaté.'; end if;
  execute 'reset role';
  if public.get_reserve_snapshot((v_params->>'reserve_id')::uuid) is distinct from v_before
    or (select count(*) from private.requests) <> v_request_count then
    raise exception 'Effet supplémentaire du replay : annulation de toute la transaction.';
  end if;
  raise notice 'OK : même reçu, aucun effet supplémentaire, paramètres différents refusés.';
end $$;
