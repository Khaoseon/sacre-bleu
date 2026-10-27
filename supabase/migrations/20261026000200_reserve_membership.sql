create function public.create_reserve(p_request_id uuid,p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_params jsonb := jsonb_build_object('action','create_reserve','name',p_name); v_cached jsonb; v_id uuid;
begin
  v_cached := private.begin_request(p_request_id,v_params);
  if v_cached is not null then return v_cached; end if;
  insert into public.reserves(name,owner_id) values (btrim(p_name),auth.uid()) returning id into v_id;
  insert into public.reserve_members(reserve_id,user_id,role) values (v_id,auth.uid(),'owner');
  return private.finish_request(p_request_id,v_params,jsonb_build_object('reserve_id',v_id,'revision',0));
end $$;

create function public.invite_member(p_request_id uuid,p_reserve_id uuid,p_email text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_params jsonb := jsonb_build_object('action','invite_member','reserve_id',p_reserve_id,'email',lower(btrim(p_email)));
  v_cached jsonb; v_reserve public.reserves; v_invitation private.invitations; v_token text; v_response jsonb;
begin
  v_cached := private.begin_request(p_request_id,v_params);
  v_reserve := private.lock_reserve(p_reserve_id);
  if v_reserve.owner_id <> auth.uid() then raise exception using errcode = '42501', message = 'Seul le propriétaire peut inviter.'; end if;
  -- Secrets are returned only once; an uncertain caller must rotate with a fresh key.
  if v_cached is not null then return v_cached || jsonb_build_object('token',null); end if;
  if p_email is null or length(btrim(p_email)) not between 3 and 254 or position('@' in p_email) = 0 then raise exception using errcode = '22023', message = 'Adresse d’invitation invalide.'; end if;
  if exists(select 1 from public.reserve_members m join auth.users u on u.id = m.user_id where m.reserve_id = p_reserve_id and lower(u.email) = lower(btrim(p_email))) then raise exception using errcode = '22023', message = 'Cette personne est déjà membre.'; end if;
  if (select count(*) from public.reserve_members where reserve_id = p_reserve_id) >= 2 then raise exception using errcode = '23514', message = 'Deux membres maximum par réserve.'; end if;
  update private.invitations set revoked_at = clock_timestamp() where reserve_id = p_reserve_id and used_at is null and revoked_at is null;
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into private.invitations(reserve_id,invited_email,token_hash,created_by)
    values (p_reserve_id,lower(btrim(p_email)),extensions.digest(v_token,'sha256'),auth.uid()) returning * into v_invitation;
  v_response := jsonb_build_object('invitation_id',v_invitation.id,'reserve_id',p_reserve_id,'expires_at',v_invitation.expires_at);
  perform private.finish_request(p_request_id,v_params,v_response);
  return v_response || jsonb_build_object('token',v_token);
end $$;

create function public.accept_invitation(p_request_id uuid,p_invitation_id uuid,p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hash bytea := extensions.digest(coalesce(p_token,''),'sha256');
  v_params jsonb := jsonb_build_object('action','accept_invitation','invitation_id',p_invitation_id,'token_hash',encode(v_hash,'hex'));
  v_cached jsonb; v_reserve_id uuid; v_invitation private.invitations; v_email text; v_revision bigint;
begin
  v_cached := private.begin_request(p_request_id,v_params);
  if v_cached is not null then return v_cached; end if;
  select reserve_id into v_reserve_id from private.invitations where id = p_invitation_id;
  if v_reserve_id is null then raise exception using errcode = 'P0001', message = 'Invitation invalide ou expirée.'; end if;
  perform 1 from public.reserves where id = v_reserve_id for update;
  select * into v_invitation from private.invitations where id = p_invitation_id for update;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_invitation.token_hash <> v_hash or v_invitation.invited_email is distinct from v_email or v_invitation.used_at is not null or v_invitation.revoked_at is not null or v_invitation.expires_at <= clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'Invitation invalide ou expirée.';
  end if;
  if (select count(*) from public.reserve_members where reserve_id = v_reserve_id) >= 2 then raise exception using errcode = '23514', message = 'Deux membres maximum par réserve.'; end if;
  insert into public.reserve_members(reserve_id,user_id,role) values (v_reserve_id,auth.uid(),'member');
  update private.invitations set used_by = auth.uid(),used_at = clock_timestamp() where id = p_invitation_id;
  update public.reserves set revision = revision + 1,updated_at = clock_timestamp() where id = v_reserve_id returning revision into v_revision;
  return private.finish_request(p_request_id,v_params,jsonb_build_object('reserve_id',v_reserve_id,'revision',v_revision));
end $$;

revoke all on function public.create_reserve(uuid,text), public.invite_member(uuid,uuid,text), public.accept_invitation(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.create_reserve(uuid,text), public.invite_member(uuid,uuid,text), public.accept_invitation(uuid,uuid,text) to authenticated;
