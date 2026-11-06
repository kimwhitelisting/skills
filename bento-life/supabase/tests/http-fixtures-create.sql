-- ROOT-ONLY, dedicated empty development project. NOT a production provisioning API.
-- Internal Auth schema was inspected before authoring; recheck after provider upgrades.
-- Returns TWO ephemeral credentials. Consume only in orchestrator memory: NO logs/files/chat output.
-- This seeds synthetic verification state; it DOES NOT test signup/email delivery/confirmation.
begin;
do $$ begin
  if exists(select 1 from auth.users) or exists(select 1 from public.bento_saves)
     or exists(select 1 from bento_private.save_operations) then
    raise exception 'Fixture creation requires an entirely empty dedicated development project';
  end if;
end $$;
with fixtures as materialized (
  select id, email, encode(extensions.gen_random_bytes(24),'hex') as password
  from (values
    ('b2800000-0000-4000-8000-000000000001'::uuid,'bento-http-a@example.invalid'::text),
    ('b2800000-0000-4000-8000-000000000002'::uuid,'bento-http-b@example.invalid'::text)
  ) v(id,email)
), users_inserted as (
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
    confirmation_token,recovery_token,email_change_token_new,email_change,
    raw_app_meta_data,raw_user_meta_data,is_super_admin,created_at,updated_at,
    phone_change,phone_change_token,email_change_token_current,email_change_confirm_status,
    reauthentication_token,is_sso_user,is_anonymous)
  select id,'00000000-0000-0000-0000-000000000000'::uuid,'authenticated','authenticated',email,
    extensions.crypt(password,extensions.gen_salt('bf',10)),clock_timestamp(),'','','','',
    '{"provider":"email","providers":["email"],"bento_fixture":"BENTO-ACCOUNT-IMPL-001"}'::jsonb,
    '{}'::jsonb,false,clock_timestamp(),clock_timestamp(),'','','',0,'',false,false
  from fixtures returning id
), identities_inserted as (
  insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
  select f.id::text,f.id,jsonb_build_object('sub',f.id::text,'email',f.email,'email_verified',true,'phone_verified',false),
    'email',clock_timestamp(),clock_timestamp()
  from fixtures f join users_inserted u on u.id=f.id returning user_id
)
select f.id,f.email,f.password from fixtures f join identities_inserted i on i.user_id=f.id order by f.id;
commit;
