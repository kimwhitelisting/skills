-- Fallback cleanup ONLY for the two tracked, marked synthetic fixtures.
-- The normal smoke path uses the real authenticated deletion Edge function first.
begin;
delete from auth.users
where (id,email) in (
  ('b2800000-0000-4000-8000-000000000001'::uuid,'bento-http-a@example.invalid'),
  ('b2800000-0000-4000-8000-000000000002'::uuid,'bento-http-b@example.invalid')
) and raw_app_meta_data->>'bento_fixture'='BENTO-ACCOUNT-IMPL-001'
returning id;
select
 (select count(*) from auth.users where id in ('b2800000-0000-4000-8000-000000000001','b2800000-0000-4000-8000-000000000002')) as fixture_users,
 (select count(*) from auth.identities where user_id in ('b2800000-0000-4000-8000-000000000001','b2800000-0000-4000-8000-000000000002')) as fixture_identities,
 (select count(*) from public.bento_saves where user_id in ('b2800000-0000-4000-8000-000000000001','b2800000-0000-4000-8000-000000000002')) as fixture_saves,
 (select count(*) from bento_private.save_operations where user_id in ('b2800000-0000-4000-8000-000000000001','b2800000-0000-4000-8000-000000000002')) as fixture_operations;
commit;
