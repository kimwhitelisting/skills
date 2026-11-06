-- Transactional database/role tests. Synthetic Auth rows are NOT an Auth API test.
-- Execute this entire file as the project administrator; all fixtures roll back.
-- If an assertion aborts the transaction, issue ROLLBACK before further SQL.
begin;
set local plpgsql.check_asserts = on;
insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_anonymous)
values
 ('a2800000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bento-sql-a@example.invalid', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
 ('a2800000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bento-sql-b@example.invalid', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false);
do $$ begin assert (not has_function_privilege('anon', 'public.bento_get_save()', 'execute')) is true, 'anon get denied'; end $$;
do $$ begin assert (not has_function_privilege('anon', 'public.bento_put_save(bigint,uuid,jsonb)', 'execute')) is true, 'anon put denied'; end $$;
do $$ begin assert (not has_table_privilege('authenticated', 'public.bento_saves', 'insert,update,delete')) is true, 'no direct write grants'; end $$;
do $$ begin assert (not has_table_privilege('authenticated', 'bento_private.save_operations', 'select')) is true, 'operation ledger private'; end $$;
set local role anon;
do $$ begin
  begin perform public.bento_get_save(); raise exception 'anon unexpectedly read'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a2800000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin assert (public.bento_get_save() = '{"revision":0,"snapshot":null,"updated_at":null}'::jsonb) is true, 'empty account'; end $$;
do $$ declare first jsonb; duplicate jsonb; latest jsonb; conflict jsonb; bad jsonb; begin
  first := public.bento_put_save(0,'a2800000-0000-4000-8000-000000000011','{"version":1,"dex":{"hearts":123},"prefs":{"sound":false}}');
  assert (first->>'status' = 'saved' and (first->>'revision')::int = 1) is true, 'first commit';
  duplicate := public.bento_put_save(0,'a2800000-0000-4000-8000-000000000011','{"prefs":{"sound":false},"dex":{"hearts":123},"version":1}');
  assert (duplicate->>'duplicate' = 'true' and duplicate->>'revision' = '1') is true, 'identical retry once';
  begin
    perform public.bento_put_save(0,'a2800000-0000-4000-8000-000000000011','{"version":1,"dex":{"hearts":999},"prefs":{}}');
    raise exception 'mismatched op unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.bento_put_save(1,'a2800000-0000-4000-8000-000000000011','{"version":1,"dex":{"hearts":123},"prefs":{"sound":false}}');
    raise exception 'changed expected revision unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
  conflict := public.bento_put_save(0,'a2800000-0000-4000-8000-000000000012','{"version":1,"dex":{"hearts":456},"prefs":{}}');
  assert (conflict->>'status' = 'conflict' and conflict#>>'{snapshot,dex,hearts}' = '123') is true, 'stale CAS preserves winner';
  latest := public.bento_put_save(1,'a2800000-0000-4000-8000-000000000013','{"version":1,"dex":{"hearts":456},"prefs":{}}');
  duplicate := public.bento_put_save(0,'a2800000-0000-4000-8000-000000000011','{"version":1,"dex":{"hearts":123},"prefs":{"sound":false}}');
  assert (duplicate->>'revision' = '2' and duplicate->>'operation_revision' = '1' and duplicate#>>'{snapshot,dex,hearts}' = '456') is true, 'late duplicate returns current state';
  foreach bad in array array[
    'null'::jsonb, '[]'::jsonb, '{"version":2,"dex":{},"prefs":{}}'::jsonb,
    '{"version":1,"dex":{},"prefs":{},"entitlements":{"paid":true}}'::jsonb,
    '{"version":1,"dex":{"paidHearts":100},"prefs":{}}'::jsonb,
    '{"version":1,"dex":{"hearts":-1},"prefs":{}}'::jsonb,
    '{"version":1,"dex":{"photos":{"bad":{}}},"prefs":{}}'::jsonb,
    '{"version":1,"dex":{},"prefs":{"access_token":"secret"}}'::jsonb,
    '{"version":1,"run":{"version":2},"dex":{},"prefs":{}}'::jsonb,
    jsonb_build_object('version',1,'dex',jsonb_build_object('menus',jsonb_build_array(repeat('x',1048577))),'prefs','{}'::jsonb)
  ] loop
    begin perform public.bento_put_save(2,gen_random_uuid(),bad); raise exception 'bad payload accepted';
    exception when invalid_parameter_value then null; end;
  end loop;
  begin perform public.bento_put_save(null,gen_random_uuid(),'{"version":1,"dex":{},"prefs":{}}'); raise exception 'null revision accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.bento_put_save(2,null,'{"version":1,"dex":{},"prefs":{}}'); raise exception 'null operation accepted'; exception when invalid_parameter_value then null; end;
  assert (public.bento_get_save()->>'revision' = '2') is true, 'invalid requests leave revision unchanged';
  begin update public.bento_saves set revision=90; raise exception 'direct update accepted'; exception when insufficient_privilege then null; end;
  begin delete from public.bento_saves; raise exception 'direct delete accepted'; exception when insufficient_privilege then null; end;
  begin insert into public.bento_saves values(auth.uid(),9,'{}',now()); raise exception 'direct insert accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', '{"sub":"a2800000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin assert ((select count(*)=0 from public.bento_saves)) is true, 'B cannot select A'; end $$;
do $$ begin assert (public.bento_get_save()->>'revision'='0') is true, 'B cannot RPC read A'; end $$;
do $$ begin assert (public.bento_put_save(0,'a2800000-0000-4000-8000-000000000011','{"version":1,"dex":{},"prefs":{}}')->>'revision'='1') is true, 'same operation UUID is scoped per account'; end $$;
do $$ begin assert ((select count(*)=1 from public.bento_saves)) is true, 'B sees only B'; end $$;
select set_config('request.jwt.claims', '{}', true);
do $$ begin
 begin perform public.bento_get_save(); raise exception 'missing subject accepted'; exception when invalid_authorization_specification then null; end;
end $$;
reset role;
update auth.users set email_confirmed_at=null where id='a2800000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a2800000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
 begin perform public.bento_get_save(); raise exception 'unverified accepted'; exception when invalid_authorization_specification then null; end;
end $$;
reset role;
delete from auth.users where id='a2800000-0000-4000-8000-000000000002';
do $$ begin assert (not exists(select 1 from public.bento_saves where user_id='a2800000-0000-4000-8000-000000000002')) is true, 'account delete cascades save'; end $$;
do $$ begin assert (not exists(select 1 from bento_private.save_operations where user_id='a2800000-0000-4000-8000-000000000002')) is true, 'account delete cascades operations'; end $$;
set local role authenticated;
do $$ begin
 begin perform public.bento_get_save(); raise exception 'deleted JWT accepted'; exception when invalid_authorization_specification then null; end;
end $$;
reset role;
select 'PASS: CAS, idempotency, late ACK, validation, RLS, privileges, verified account, deletion' as result;
rollback;
