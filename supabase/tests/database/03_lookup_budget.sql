begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions,pg_temp;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_depend d on d.objid=p.oid join pg_extension e on e.oid=d.refobjid where e.extname='pgtap' and d.deptype='e' loop
    execute format('grant execute on function %s to authenticated,anon',f.signature);
  end loop;
end $$;
grant usage on schema extensions to authenticated,anon;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('10000000-0000-0000-0000-000000000001','budget-a@example.test',now(),false),
 ('10000000-0000-0000-0000-000000000002','budget-b@example.test',now(),false),
 ('10000000-0000-0000-0000-000000000003','budget-outside@example.test',now(),false);
insert into public.reserves(id,name,owner_id) values
 ('20000000-0000-0000-0000-000000000001','Budget fixture','10000000-0000-0000-0000-000000000001');
insert into public.reserve_members(reserve_id,user_id,role) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner'),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','member');
update private.product_lookup_gate set next_allowed_at='-infinity',blocked_reason='cooldown';
create temporary table budget_result(value jsonb);
grant all on budget_result to authenticated;
set local role anon;
select throws_ok($$select public.claim_product_lookup_slot()$$,'42501',null,'Anonymous detailed claim denied');
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.claim_product_lookup_slot()$$,'42501',null,'Outsider detailed claim denied');
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;
insert into budget_result select public.claim_product_lookup_slot();
select is((select value->>'allowed' from budget_result),'true','First account receives slot');
select is((select value->>'reason' from budget_result),'cooldown','Next wait is internal policy');
select ok((select (value->>'retry_after_seconds')::integer between 1 and 6 from budget_result),'Six seconds retained');
truncate budget_result;
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;
insert into budget_result select public.claim_product_lookup_slot();
select is((select value->>'allowed' from budget_result),'false','Second account cannot consume same slot');
select is((select value->>'reason' from budget_result),'cooldown','Internal wait is not provider refusal');
select ok((select (value->>'retry_after_seconds')::integer between 1 and 6 from budget_result),'No artificial minute');
truncate budget_result;
insert into budget_result select public.claim_product_lookup_slot(17);
select is((select value->>'reason' from budget_result),'rate-limit','Provider refusal shared');
select ok((select (value->>'retry_after_seconds')::integer between 16 and 17 from budget_result),'Actual provider delay retained');
select is(public.claim_product_lookup(),false,'Legacy version uses same shared gate');
select throws_ok($$select public.claim_product_lookup_slot(-1)$$,'22023',null,'Negative cooldown denied');
select throws_ok($$select * from private.product_lookup_gate$$,'42501',null,'Gate remains private');
reset role;
update private.product_lookup_gate set next_allowed_at=clock_timestamp()-interval '1 second';
set local role authenticated;
truncate budget_result;
insert into budget_result select public.claim_product_lookup_slot();
select is((select value->>'allowed' from budget_result),'true','Claim available after expiry');
select is((select value->>'reason' from budget_result),'cooldown','Provider refusal cleared only after expiry');
select * from finish();
rollback;
