begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('00000000-0000-0000-0000-000000000001','photo-owner@example.test',now(),false),
('00000000-0000-0000-0000-000000000002','photo-member@example.test',now(),false),
('00000000-0000-0000-0000-000000000003','photo-outsider@example.test',now(),false),
('00000000-0000-0000-0000-000000000004','photo-unconfirmed@example.test',null,false);
insert into public.reserves(id,name,owner_id) values('00000000-0000-0000-0000-000000000010','Photos','00000000-0000-0000-0000-000000000001');
insert into public.reserve_members(reserve_id,user_id,role) values
('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','owner'),
('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002','member');
insert into public.products(id,reserve_id,name,photo_path) values
('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010','Legacy','00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000020/legacy.webp');
select is((select photo_path from public.products),'00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000020/legacy.webp','Migration preserves legacy references');
create function pg_temp.photo(k integer,expected text default null,h text default repeat('a',64),body text default encode(decode('ffd8'||repeat('00',100),'hex'),'base64')) returns jsonb language sql as $$
 select public.commit_product_photo('00000000-0000-0000-0000-000000000001',('00000000-0000-0000-0000-'||lpad(k::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020',expected,case when k=100 then 0 else (select photo_version from public.products where id='00000000-0000-0000-0000-000000000020') end,h,body,1,1)
$$;
select ok(not has_table_privilege('authenticated','private.product_photos','select'),'No direct photo table read');
select ok(not has_table_privilege('service_role','private.product_photos','insert'),'Processor has no direct table write');
select ok(not has_function_privilege('authenticated','public.commit_product_photo(uuid,uuid,uuid,uuid,text,bigint,text,text,integer,integer)','execute'),'Client cannot impersonate the processor');
select ok(not has_function_privilege('anon','public.read_product_photo(uuid,uuid,text)','execute'),'Anonymous download denied');
select ok((select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc where oid in ('public.read_product_photo(uuid,uuid,text)'::regprocedure,'public.commit_product_photo(uuid,uuid,uuid,uuid,text,bigint,text,text,integer,integer)'::regprocedure)),'Privileged RPCs have empty search path');
select lives_ok($$select pg_temp.photo(100,(select photo_path from public.products))$$,'Trusted upload replaces unresolved legacy photo');
select is((select count(*) from private.product_photos),1::bigint,'One committed binary only');
select is((select count(*) from private.requests where parameters::text like '%/9j%'),0::bigint,'Receipts contain no image bytes');
select is((pg_temp.photo(100,'00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000020/legacy.webp')->>'revision')::integer,1,'Replay returns original receipt');
select throws_ok($$select pg_temp.photo(101,null)$$,'PGRST',null,'Stale replacement rejected');
select throws_ok($$select pg_temp.photo(102,(select photo_path from public.products),repeat('b',64),repeat('x',666669))$$,'22023',null,'Server byte budget independently enforced');
select is((select count(*) from private.requests where request_id='00000000-0000-0000-0000-000000000102'),0::bigint,'Failed write has no success receipt');
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select ok(public.read_product_photo('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020',(select photo_path from public.products)) is not null,'Second confirmed member reads photo');
select is(public.read_product_photo('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000099',(select photo_path from public.products)),null::jsonb,'Forged product path returns no bytes');
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok($$select public.read_product_photo('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020','anything')$$,'42501',null,'Other household cannot read');
select throws_ok($$select public.claim_product_photo('00000000-0000-0000-0000-000000000010')$$,'42501',null,'Outsider cannot reserve processing budget');
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
select throws_ok($$select public.read_product_photo('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020','anything')$$,'42501',null,'Unconfirmed user denied');
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok($$update public.products set name='Old client metadata'$$,'Legacy metadata update preserves bytes');
select is((select count(*) from private.product_photos),1::bigint,'Metadata edit retains committed binary');
select throws_ok($$update public.products set photo_path='00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000000020/forged.jpg'$$,'22023',null,'Legacy client cannot forge a reference');
select ok((pg_temp.photo(103,null,repeat('c',64),null)->>'aborted')::boolean,'Missing-body recovery fences intent');
select ok((pg_temp.photo(103,null,repeat('c',64))->>'aborted')::boolean,'Delayed upload cannot commit after abort');
select lives_ok($$select pg_temp.photo(104,(select photo_path from public.products),null,null)$$,'Removal commits');
select is((select count(*) from private.product_photos),0::bigint,'Removal atomically deletes bytes');
select is((select photo_path from public.products),null::text,'Removal clears reference');
select lives_ok($$select pg_temp.photo(105,null)$$,'Replacement after removal succeeds');
delete from public.products;
select is((select count(*) from private.product_photos),0::bigint,'Product deletion cascades without orphans');
-- Trusted fixtures fill the household cap; actual raster validation is tested
-- through the Edge function, which is the only API writer.
insert into public.products(id,reserve_id,name)
select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000010','Quota' from generate_series(1001,1040) n;
insert into private.product_photos(product_id,reserve_id,path,bytes,width,height)
select id,reserve_id,reserve_id::text||'/'||id::text||'/quota.jpg',decode('ffd8'||repeat('00',100),'hex'),1,1 from public.products;
update public.products p set photo_path=f.path from private.product_photos f where p.id=f.product_id;
insert into public.products(id,reserve_id,name) values('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010','Over quota');
select throws_ok($$select pg_temp.photo(106,null)$$,'23514',null,'Forty-first photo refused server-side');
select is((select count(*) from private.product_photos),40::bigint,'Refusal leaves quota and existing photos intact');
select lives_ok($$select public.commit_product_photo('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000107','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000001001','00000000-0000-0000-0000-000000000010/00000000-0000-0000-0000-000000001001/quota.jpg',1,repeat('d',64),encode(decode('ffd8'||repeat('00',100),'hex'),'base64'),1,1)$$,'Replacement at quota succeeds without another slot');
select is((select count(*) from private.product_photos),40::bigint,'Replacement does not retain an obsolete binary');
select * from finish();
rollback;
