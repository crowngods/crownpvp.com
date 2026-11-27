-- Supabase storage and service-only helpers for the private trace dashboard.
-- Safe to apply to an existing database; existing trace records are not removed.

create table if not exists public.mc_trace_accounts (
  uuid text primary key,
  username text not null,
  first_seen bigint not null default 0,
  last_seen bigint not null default 0,
  updated bigint not null default 0
);

create table if not exists public.mc_trace_logins (
  id uuid primary key default gen_random_uuid(),
  uuid text not null references public.mc_trace_accounts(uuid) on delete cascade,
  occurred bigint not null,
  ip_fingerprint text not null default '',
  source text not null default 'authorized bridge',
  unique(uuid, occurred, ip_fingerprint)
);

create table if not exists public.mc_trace_notes (
  id bigserial primary key,
  uuid text not null references public.mc_trace_accounts(uuid) on delete cascade,
  author text not null,
  body text not null,
  created bigint not null
);

create table if not exists public.mc_trace_conversations (
  id bigserial primary key,
  uuid text not null references public.mc_trace_accounts(uuid) on delete cascade,
  author text not null,
  body text not null,
  evidence text not null default '',
  created bigint not null
);

create index if not exists mc_trace_accounts_username_idx
  on public.mc_trace_accounts(lower(username));
create index if not exists mc_trace_logins_uuid_occurred_idx
  on public.mc_trace_logins(uuid, occurred desc);
create index if not exists mc_trace_logins_fingerprint_idx
  on public.mc_trace_logins(ip_fingerprint);
create index if not exists mc_trace_notes_uuid_created_idx
  on public.mc_trace_notes(uuid, created desc);
create index if not exists mc_trace_conversations_uuid_created_idx
  on public.mc_trace_conversations(uuid, created desc);

alter table public.mc_trace_accounts enable row level security;
alter table public.mc_trace_logins enable row level security;
alter table public.mc_trace_notes enable row level security;
alter table public.mc_trace_conversations enable row level security;
revoke all on public.mc_trace_accounts, public.mc_trace_logins,
  public.mc_trace_notes, public.mc_trace_conversations from anon, authenticated;
grant all on public.mc_trace_accounts, public.mc_trace_logins,
  public.mc_trace_notes, public.mc_trace_conversations to service_role;
grant usage, select on sequence public.mc_trace_notes_id_seq,
  public.mc_trace_conversations_id_seq to service_role;

create table if not exists public.mc_trace_auth_attempts (
  address_hash text primary key,
  window_started timestamptz not null default now(),
  failed_attempts integer not null default 0,
  blocked_until timestamptz
);
alter table public.mc_trace_auth_attempts enable row level security;
revoke all on public.mc_trace_auth_attempts from anon, authenticated;
grant all on public.mc_trace_auth_attempts to service_role;

create or replace function public.trace_auth_attempt(p_address_hash text, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt public.mc_trace_auth_attempts%rowtype;
  v_now timestamptz := clock_timestamp();
  retry_seconds integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service-role access only';
  end if;
  if p_address_hash !~ '^[0-9a-f]{64}$' or p_action is null or p_action not in ('check', 'failure', 'success') then
    raise exception 'Invalid authentication attempt';
  end if;

  insert into public.mc_trace_auth_attempts(address_hash)
  values (p_address_hash)
  on conflict (address_hash) do nothing;

  select * into attempt
  from public.mc_trace_auth_attempts
  where address_hash = p_address_hash
  for update;

  if p_action = 'success' then
    delete from public.mc_trace_auth_attempts where address_hash = p_address_hash;
    return jsonb_build_object('blocked', false, 'retryAfter', 0);
  end if;

  if attempt.blocked_until > v_now then
    retry_seconds := greatest(1, ceil(extract(epoch from (attempt.blocked_until - v_now)))::integer);
    return jsonb_build_object('blocked', true, 'retryAfter', retry_seconds);
  end if;

  if attempt.window_started < v_now - interval '15 minutes' then
    attempt.failed_attempts := 0;
    attempt.window_started := v_now;
    attempt.blocked_until := null;
    update public.mc_trace_auth_attempts
    set window_started = attempt.window_started,
        failed_attempts = 0,
        blocked_until = null
    where address_hash = p_address_hash;
  end if;

  if p_action = 'failure' then
    attempt.failed_attempts := attempt.failed_attempts + 1;
    if attempt.failed_attempts >= 5 then
      attempt.blocked_until := v_now + interval '15 minutes';
    else
      attempt.blocked_until := null;
    end if;
    update public.mc_trace_auth_attempts
    set window_started = attempt.window_started,
        failed_attempts = attempt.failed_attempts,
        blocked_until = attempt.blocked_until
    where address_hash = p_address_hash;
  end if;

  retry_seconds := case
    when attempt.blocked_until > v_now
      then greatest(1, ceil(extract(epoch from (attempt.blocked_until - v_now)))::integer)
    else 0
  end;
  return jsonb_build_object('blocked', retry_seconds > 0, 'retryAfter', retry_seconds);
end;
$$;
revoke all on function public.trace_auth_attempt(text, text) from public, anon, authenticated;
grant execute on function public.trace_auth_attempt(text, text) to service_role;

create or replace function public.trace_sync_records(p_records jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec jsonb;
  login jsonb;
  imported_accounts integer := 0;
  imported_logins integer := 0;
  first_seen bigint;
  last_seen bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service-role access only';
  end if;
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) > 500 then
    raise exception 'Maximum 500 records per sync';
  end if;

  for rec in select * from jsonb_array_elements(p_records)
  loop
    first_seen := coalesce((select min((x.value->>'at')::bigint) from jsonb_array_elements(coalesce(rec->'logins', '[]'::jsonb)) as x(value)), 0);
    last_seen := coalesce((select max((x.value->>'at')::bigint) from jsonb_array_elements(coalesce(rec->'logins', '[]'::jsonb)) as x(value)), 0);
    insert into public.mc_trace_accounts(uuid, username, first_seen, last_seen, updated)
    values(rec->>'uuid', rec->>'name', first_seen, last_seen, extract(epoch from now()) * 1000)
    on conflict(uuid) do update set
      username = excluded.username,
      first_seen = case
        when public.mc_trace_accounts.first_seen = 0 then excluded.first_seen
        when excluded.first_seen = 0 then public.mc_trace_accounts.first_seen
        else least(public.mc_trace_accounts.first_seen, excluded.first_seen) end,
      last_seen = greatest(public.mc_trace_accounts.last_seen, excluded.last_seen),
      updated = excluded.updated;
    imported_accounts := imported_accounts + 1;

    for login in select * from jsonb_array_elements(coalesce(rec->'logins', '[]'::jsonb))
    loop
      insert into public.mc_trace_logins(uuid, occurred, ip_fingerprint, source)
      values(rec->>'uuid', (login->>'at')::bigint, coalesce(login->>'ip_fingerprint', ''), coalesce(login->>'source', 'authorized bridge'))
      on conflict(uuid, occurred, ip_fingerprint) do nothing;
      imported_logins := imported_logins + 1;
    end loop;
  end loop;

  return jsonb_build_object('ok', true, 'accounts', imported_accounts, 'loginEvents', imported_logins);
end;
$$;
revoke all on function public.trace_sync_records(jsonb) from public, anon, authenticated;
grant execute on function public.trace_sync_records(jsonb) to service_role;
