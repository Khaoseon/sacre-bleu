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
('00000000-0000-0000-0000-000000000001','owner@example.test',now(),false),
('00000000-0000-0000-0000-000000000002','member@example.test',now(),false),
('00000000-0000-0000-0000-000000000003','outsider@example.test',now(),false),
('00000000-0000-0000-0000-000000000004','unverified@example.test',null,false);
create temporary table fixture(key text primary key,value jsonb);
grant all on fixture to authenticated,anon;
insert into fixture values ('backup','{"format":"sacre-bleu","version":1,"exportedAt":"2026-10-30T10:00:00.000Z","products":[{"id":"00000000-0000-0000-0000-000000000101","name":"Riz","barcode":"00123456","brand":null,"size":500,"unit":"g","category":"Féculents","quantity":0,"minimum":2,"off_barcode":null,"off_image_url":null,"updatedAt":"2026-10-30T09:00:00.000Z"}],"shopping":[{"id":"00000000-0000-0000-0000-000000000102","product_id":"00000000-0000-0000-0000-000000000101","name":"Riz","quantity":3,"checked":false}]}'::jsonb);
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;
insert into fixture values ('reserve',public.create_reserve(gen_random_uuid(),'Restauration'));
insert into fixture values ('invite',public.invite_member(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'member@example.test'));
reset role;
insert into public.reserve_members(reserve_id,user_id,role) values((select (value->>'reserve_id')::uuid from fixture where key='reserve'),'00000000-0000-0000-0000-000000000002','member');
create function pg_temp.restore_test(b jsonb,rev bigint default null,k uuid default '00000000-0000-0000-0000-000000000201') returns jsonb language sql as $$
  select public.restore_reserve(k,(select (value->>'reserve_id')::uuid from fixture where key='reserve'),coalesce(rev,(select revision from public.reserves limit 1)),b);
$$;
grant execute on function pg_temp.restore_test(jsonb,bigint,uuid) to authenticated,anon;
set local role anon;
select throws_ok($$select pg_temp.restore_test((select value from fixture where key='backup'))$$,'42501',null,'Anonymous denied');
reset role;
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select pg_temp.restore_test((select value from fixture where key='backup'),0)$$,'42501',null,'Unverified denied');
reset role;
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select pg_temp.restore_test((select value from fixture where key='backup'),0)$$,'42501',null,'Outsider denied');
reset role;
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select pg_temp.restore_test((select value from fixture where key='backup'))$$,'42501',null,'Member cannot replace household data');
reset role;
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select private.validate_user_backup((select value from fixture where key='backup'))$$,'42501',null,'Private validator has no API grant');
select throws_ok($$select pg_temp.restore_test(jsonb_set((select value from fixture where key='backup'),'{products,0,quantity}','1.5'))$$,'22023',null,'Fraction refused');
select throws_ok($$select pg_temp.restore_test((select value from fixture where key='backup') || '{"auth":{}}')$$,'22023',null,'Auth/unknown root fields refused');
select throws_ok($$select pg_temp.restore_test(jsonb_set((select value from fixture where key='backup'),'{shopping,0,product_id}','"00000000-0000-0000-0000-000000000999"'))$$,'22023',null,'Orphan link refused');
select throws_ok($$select pg_temp.restore_test(jsonb_set((select value from fixture where key='backup'),'{products,0,quantity}','"2"'))$$,'22023',null,'String quantity refused');
select throws_ok($$select pg_temp.restore_test(jsonb_set((select value from fixture where key='backup'),'{shopping,0,checked}','"false"'))$$,'22023',null,'String boolean refused');
select throws_ok($$select pg_temp.restore_test(jsonb_set((select value from fixture where key='backup'),'{products}',(select value->'products' || value->'products' from fixture where key='backup')))$$,'22023',null,'Duplicate product refused');
select is((select count(*) from public.products),0::bigint,'Invalid backups leave catalogue untouched');
insert into fixture values ('revision',to_jsonb((select revision from public.reserves limit 1)));
insert into fixture values ('receipt',pg_temp.restore_test((select value from fixture where key='backup')));
select is((select quantity from public.product_stock),0,'Exhausted product retained');
select is((select minimum from public.product_stock),2,'Minimum retained');
select is((select barcode from public.products),'00123456','Leading zeroes retained');
select is((select quantity from public.shopping_items),3,'No accidental scan deduction');
select is((select checked from public.shopping_items),false,'Checked state retained');
select ok((select product_id from public.shopping_items)=(select id from public.products),'Links remapped');
select isnt((select id::text from public.products),'00000000-0000-0000-0000-000000000101','Product id regenerated');
select isnt((select id::text from public.shopping_items),'00000000-0000-0000-0000-000000000102','Shopping id regenerated');
insert into fixture values ('after',public.get_reserve_snapshot((select (value->>'reserve_id')::uuid from fixture where key='reserve')));
select is(pg_temp.restore_test((select value from fixture where key='backup'),(select value::text::bigint from fixture where key='revision')),(select value from fixture where key='receipt'),'Lost-response replay returns exact receipt');
select is(public.get_reserve_snapshot((select (value->>'reserve_id')::uuid from fixture where key='reserve')),(select value from fixture where key='after'),'Replay leaves exact snapshot unchanged');
select throws_ok($$select pg_temp.restore_test(jsonb_set((select value from fixture where key='backup'),'{products,0,quantity}','2'))$$,'22023',null,'Same key/different payload refused');
select throws_ok($$select pg_temp.restore_test((select value from fixture where key='backup'),0,gen_random_uuid())$$,'PGRST',null,'Stale preview refused using compatible HTTP conflict');
select is(public.get_reserve_snapshot((select (value->>'reserve_id')::uuid from fixture where key='reserve')),(select value from fixture where key='after'),'Stale preview leaves exact snapshot unchanged');
-- Failure injected AFTER deletion and product creation proves transaction rollback.
reset role;
create function pg_temp.fail_shopping() returns trigger language plpgsql as $$begin raise exception 'injected' using errcode='22023'; end$$;
create trigger phase5_test_failure before insert on public.shopping_items for each row execute function pg_temp.fail_shopping();
set local role authenticated;
select throws_ok($$select pg_temp.restore_test((select value from fixture where key='backup'),null,gen_random_uuid())$$,'22023','injected','Failure after partial work aborts restoration');
select is(public.get_reserve_snapshot((select (value->>'reserve_id')::uuid from fixture where key='reserve')),(select value from fixture where key='after'),'Full old state restored after injected failure');
reset role;
drop trigger phase5_test_failure on public.shopping_items;
select ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid='public.restore_reserve(uuid,uuid,bigint,jsonb)'::regprocedure),'Privileged RPC keeps empty search_path');
select ok(not has_function_privilege('anon','public.restore_reserve(uuid,uuid,bigint,jsonb)','execute'),'No anonymous RPC execution grant');
select ok(not has_table_privilege('authenticated','public.products','insert'),'No direct write grant added');
select * from finish();
rollback;
