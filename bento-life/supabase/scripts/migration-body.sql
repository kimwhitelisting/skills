-- BENTO-ACCOUNT-IMPL-001. Free progress only; never a payment/entitlement authority.
-- Run on the dedicated empty project only, after reviewing the migration.
create extension if not exists pg_jsonschema with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema bento_private;
revoke all on schema bento_private from public, anon, authenticated;
grant usage on schema bento_private to authenticated;
alter default privileges in schema bento_private revoke execute on functions from public;

create function bento_private.snapshot_valid(value jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $function$
  select coalesce(octet_length(value::text) <= 1048576 and
    extensions.jsonb_matches_schema($schema$__SNAPSHOT_SCHEMA__$schema$::json, value), false)
$function$;
revoke all on function bento_private.snapshot_valid(jsonb) from public, anon, authenticated;

create table public.bento_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision between 1 and 9007199254740991),
  snapshot jsonb not null check (bento_private.snapshot_valid(snapshot)),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.bento_saves enable row level security;
revoke all on public.bento_saves from public, anon, authenticated;
grant select on public.bento_saves to authenticated;
create policy bento_read_own on public.bento_saves for select to authenticated
  using (user_id = (select auth.uid()));
-- There is deliberately NO insert/update/delete policy or table write grant.

create table bento_private.save_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  expected_revision bigint not null,
  payload_hash bytea not null,
  committed_revision bigint not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_id, operation_id)
);
alter table bento_private.save_operations enable row level security;
revoke all on bento_private.save_operations from public, anon, authenticated;

-- The only authority is the validated JWT subject, never a request-supplied owner ID.
-- Recheck the user record so a deleted account's still-unexpired JWT cannot save again.
create function bento_private.require_user() returns uuid
language plpgsql security definer set search_path = '' as $function$
declare caller uuid := auth.uid();
begin
  if caller is null or not exists (
    select 1 from auth.users u where u.id = caller
      and not coalesce(u.is_anonymous, false) and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= clock_timestamp())
  ) then
    raise exception 'A verified, active account is required' using errcode = '28000';
  end if;
  return caller;
end
$function$;
revoke all on function bento_private.require_user() from public, anon, authenticated;

create function bento_private.get_save() returns jsonb
language plpgsql security definer set search_path = '' as $function$
declare caller uuid := bento_private.require_user(); current_save public.bento_saves%rowtype;
begin
  select * into current_save from public.bento_saves where user_id = caller;
  return jsonb_build_object('revision', coalesce(current_save.revision, 0),
    'snapshot', current_save.snapshot, 'updated_at', current_save.updated_at);
end
$function$;
revoke all on function bento_private.get_save() from public, anon;
grant execute on function bento_private.get_save() to authenticated;

create function bento_private.put_save(p_expected_revision bigint, p_operation_id uuid, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  caller uuid := bento_private.require_user();
  current_save public.bento_saves%rowtype;
  prior bento_private.save_operations%rowtype;
  payload_hash bytea;
begin
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision >= 9007199254740991
     or p_operation_id is null or not bento_private.snapshot_valid(p_snapshot) then
    raise exception 'Invalid save request' using errcode = '22023';
  end if;
  payload_hash := extensions.digest(convert_to(p_snapshot::text, 'UTF8'), 'sha256');
  -- The lock also serializes the FIRST save, where no row exists yet.
  -- Hash collisions can only serialize unrelated writers, never change ownership.
  perform pg_advisory_xact_lock(hashtextextended('bento-save:' || caller::text, 0));
  -- Coordinate account deletion with this transaction; the FK also prevents orphan saves.
  perform 1 from auth.users where id = caller for key share;
  if not found then raise exception 'Account no longer exists' using errcode = '28000'; end if;
  select * into current_save from public.bento_saves where user_id = caller;
  select * into prior from bento_private.save_operations
    where user_id = caller and operation_id = p_operation_id;
  if found then
    if prior.expected_revision <> p_expected_revision or prior.payload_hash <> payload_hash then
      raise exception 'Operation ID was reused with a different request' using errcode = '22023';
    end if;
    -- Return the CURRENT state, not an old snapshot: a late duplicate cannot roll back the client.
    return jsonb_build_object('status', 'saved', 'revision', current_save.revision,
      'snapshot', current_save.snapshot, 'updated_at', current_save.updated_at,
      'duplicate', true, 'operation_revision', prior.committed_revision);
  end if;
  if coalesce(current_save.revision, 0) <> p_expected_revision then
    return jsonb_build_object('status', 'conflict', 'revision', coalesce(current_save.revision, 0),
      'snapshot', current_save.snapshot, 'updated_at', current_save.updated_at);
  end if;
  insert into public.bento_saves(user_id, revision, snapshot, updated_at)
    values (caller, p_expected_revision + 1, p_snapshot, clock_timestamp())
    on conflict (user_id) do update set revision = excluded.revision,
      snapshot = excluded.snapshot, updated_at = excluded.updated_at
    returning * into current_save;
  insert into bento_private.save_operations(user_id, operation_id, expected_revision, payload_hash, committed_revision)
    values (caller, p_operation_id, p_expected_revision, payload_hash, current_save.revision);
  return jsonb_build_object('status', 'saved', 'revision', current_save.revision,
    'snapshot', current_save.snapshot, 'updated_at', current_save.updated_at,
    'duplicate', false, 'operation_revision', current_save.revision);
end
$function$;
revoke all on function bento_private.put_save(bigint, uuid, jsonb) from public, anon;
grant execute on function bento_private.put_save(bigint, uuid, jsonb) to authenticated;

-- Public endpoints use invoker privileges. Privileged logic stays in an unexposed schema.
create function public.bento_get_save() returns jsonb
language sql security invoker set search_path = '' as $function$
  select bento_private.get_save()
$function$;
create function public.bento_put_save(p_expected_revision bigint, p_operation_id uuid, p_snapshot jsonb)
returns jsonb language sql security invoker set search_path = '' as $function$
  select bento_private.put_save(p_expected_revision, p_operation_id, p_snapshot)
$function$;
revoke all on function public.bento_get_save() from public, anon;
revoke all on function public.bento_put_save(bigint, uuid, jsonb) from public, anon;
grant execute on function public.bento_get_save() to authenticated;
grant execute on function public.bento_put_save(bigint, uuid, jsonb) to authenticated;
comment on table public.bento_saves is 'Free game progress only; paid ownership must never be inferred from this JSON.';
