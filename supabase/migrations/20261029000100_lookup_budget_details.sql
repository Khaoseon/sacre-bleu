-- Preparation only: shared six-second policy is unchanged. No stock/scan RPC changes.
alter table private.product_lookup_gate add column blocked_reason text not null default 'cooldown'
  check (blocked_reason in ('cooldown','rate-limit'));
update private.product_lookup_gate set blocked_reason = 'rate-limit'
  where next_allowed_at > clock_timestamp() + interval '6 seconds';

create function public.claim_product_lookup_slot(p_cooldown_seconds integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_next timestamptz; v_reason text; v_now timestamptz; v_allowed boolean := false;
begin
  perform private.require_user();
  if not exists(select 1 from public.reserve_members where user_id=auth.uid()) then
    raise exception using errcode='42501',message='Appartenance à une réserve requise.';
  end if;
  if p_cooldown_seconds is null or p_cooldown_seconds not between 0 and 86400 then
    raise exception using errcode='22023',message='Délai invalide.';
  end if;
  select next_allowed_at,blocked_reason into v_next,v_reason
    from private.product_lookup_gate where singleton for update;
  v_now := clock_timestamp();
  if p_cooldown_seconds > 0 then
    v_next := greatest(v_next,v_now+pg_catalog.make_interval(secs=>p_cooldown_seconds));
    v_reason := 'rate-limit';
  elsif v_next <= v_now then
    v_allowed := true;
    v_next := v_now+interval '6 seconds';
    v_reason := 'cooldown';
  end if;
  update private.product_lookup_gate set next_allowed_at=v_next,blocked_reason=v_reason where singleton;
  return jsonb_build_object('allowed',v_allowed,'reason',v_reason,
    'retry_after_seconds',greatest(1,ceil(extract(epoch from (v_next-v_now)))::integer));
end $$;
revoke all on function public.claim_product_lookup_slot(integer) from public,anon,authenticated,service_role;
grant execute on function public.claim_product_lookup_slot(integer) to authenticated;

-- Old Edge versions retain the same atomic gate and boolean contract during rollout.
create or replace function public.claim_product_lookup(p_cooldown_seconds integer default 0)
returns boolean language sql security invoker set search_path = '' as $$
  select (public.claim_product_lookup_slot(p_cooldown_seconds)->>'allowed')::boolean;
$$;
notify pgrst,'reload schema';
