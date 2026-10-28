begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
-- These grants exist only in this rolled-back test transaction, for assertions
-- executed under actual API roles, never as part of the production migrations.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_depend d on d.objid=p.oid join pg_extension e on e.oid=d.refobjid where e.extname='pgtap' and d.deptype='e' loop
    execute format('grant execute on function %s to authenticated, anon',f.signature);
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

set local role anon;
select throws_ok($$select public.claim_product_lookup()$$,'42501',null,'Anonymous cannot consume the lookup budget');
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.claim_product_lookup()$$,'42501',null,'Unverified account denied');
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.claim_product_lookup()$$,'42501',null,'Non-member denied');
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;
insert into fixture values ('reserve',public.create_reserve(gen_random_uuid(),'Sources OFF'));
select throws_ok($$select * from private.product_lookup_gate$$,'42501',null,'Budget table stays private');
select is(public.claim_product_lookup(),true,'Member claims a durable budget slot');
select is(public.claim_product_lookup(),false,'Repeated request cannot bypass durable interval');
select is(public.claim_product_lookup(120),false,'Provider cooldown may extend the durable guard');
select is(public.claim_product_lookup(),false,'Cooldown is shared across requests');
select throws_ok($$select public.claim_product_lookup(-1)$$,'22023',null,'Invalid cooldown denied');
select public.mutate_reserve(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'create_product',
  '{"id":"00000000-0000-0000-0000-000000000101","name":"Produit corrigé","barcode":"0036000291452","brand":"Marque personnelle","size":750,"unit":"g","off_barcode":"036000291452","off_image_url":"https://images.openfoodfacts.org/images/products/003/600/029/1452/front_fr.1.400.jpg"}');
select is((select off_barcode from public.products),'036000291452','Source barcode keeps leading zeros');
select is((select photo_path from public.products),null::text,'External image never stored as photo_path');
select is(public.get_reserve_snapshot((select (value->>'reserve_id')::uuid from fixture where key='reserve'))->'products'->0->>'off_barcode','036000291452','Coherent RLS snapshot includes provenance');
select public.mutate_reserve(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'add_shopping','{"product_id":"00000000-0000-0000-0000-000000000101","quantity":5}');
insert into fixture values ('scan',public.mutate_reserve(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'scan','{"product_id":"00000000-0000-0000-0000-000000000101","delta":3}'));
select is((select quantity from public.product_stock),3,'OFF creation still uses the existing scan RPC');
select is((select quantity from public.shopping_items),2,'Scan still reduces only linked shopping');
select public.mutate_reserve(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'undo_scan',jsonb_build_object('scan_id',(select value->>'scan_id' from fixture where key='scan'),'expected_version',1));
select is((select quantity from public.product_stock),0,'Compensation keeps the product at zero');
select is((select quantity from public.shopping_items),5,'Compensation restores shopping');
select is((select name from public.products),'Produit corrigé','Compensation preserves personal metadata');
select public.mutate_reserve(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'update_product','{"product_id":"00000000-0000-0000-0000-000000000101","name":"Correction manuelle","off_image_url":null}');
select is((select name from public.products),'Correction manuelle','Personal metadata is editable');
select is((select off_image_url from public.products),null::text,'External photo is removable');
select is((select off_barcode from public.products),'036000291452','Provenance is retained after correction');
select throws_ok($$select public.mutate_reserve(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'update_product','{"product_id":"00000000-0000-0000-0000-000000000101","off_image_url":"https://evil.test/a.jpg"}')$$,'23514',null,'Arbitrary external image refused');
select throws_ok($$select public.mutate_reserve(gen_random_uuid(),(select (value->>'reserve_id')::uuid from fixture where key='reserve'),'update_product','{"product_id":"00000000-0000-0000-0000-000000000101","off_barcode":"../private"}')$$,'23514',null,'Invalid source barcode refused');
select throws_ok($$update public.products set off_barcode='1234'$$,'42501',null,'Source metadata is writable only through RPC');
reset role;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.products),0::bigint,'Non-member cannot see external provenance in a private reserve');
reset role;
select * from finish();
rollback;
