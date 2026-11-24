-- CrownPVP accounts + alerts (for Supabase)
-- Run this ONCE: Supabase dashboard > SQL Editor > New query > paste everything > Run.
-- Safe to run again later; it will not delete existing data.

-- ---------- Profiles (one per account) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  is_staff boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,16}$')
);
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));
alter table public.profiles enable row level security;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
-- No insert/update/delete policies: players cannot edit their profile or make themselves staff.

-- ---------- Alerts ----------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  link text check (link is null or (link ~ '^(https://[^[:space:]]+|[A-Za-z0-9_./?=&#%-]+)$' and link !~ '^//')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: alerts can only be created by staff through the functions below.

-- ---------- Let signed-in players read their own rows (needed if "Grant API access to new tables automatically" was left unticked) ----------
grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.notifications to authenticated;

-- ---------- New account: create the profile and a welcome alert ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  insert into public.notifications (user_id, title, body, link)
  values (new.id, 'Welcome to CrownPVP!', 'Your account is ready. Staff alerts will show up here.', null);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------- Functions the website calls ----------
create or replace function public.username_available(u text)
returns boolean language sql security definer stable set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(u));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.mark_notifications_read(ids bigint[] default null)
returns void language sql security definer set search_path = public as $$
  update public.notifications set read = true
  where user_id = auth.uid() and read = false and (ids is null or id = any(ids));
$$;
revoke all on function public.mark_notifications_read(bigint[]) from public, anon;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;

create or replace function public.send_alert(target text, p_title text, p_body text default '', p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_staff) then
    raise exception 'Staff only';
  end if;
  select id into uid from public.profiles where lower(username) = lower(target);
  if uid is null then
    raise exception 'No account with that username';
  end if;
  insert into public.notifications (user_id, title, body, link)
  values (uid, p_title, coalesce(p_body, ''), nullif(p_link, ''));
end $$;
revoke all on function public.send_alert(text, text, text, text) from public, anon;
grant execute on function public.send_alert(text, text, text, text) to authenticated;

create or replace function public.broadcast_alert(p_title text, p_body text default '', p_link text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_staff) then
    raise exception 'Staff only';
  end if;
  insert into public.notifications (user_id, title, body, link)
  select id, p_title, coalesce(p_body, ''), nullif(p_link, '') from public.profiles;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.broadcast_alert(text, text, text) from public, anon;
grant execute on function public.broadcast_alert(text, text, text) to authenticated;

-- ---------- Make yourself staff (run AFTER you created your own account on the site) ----------
-- Replace YourName with the username you signed up with, remove the two dashes, and run it:
-- update public.profiles set is_staff = true where lower(username) = lower('YourName');
