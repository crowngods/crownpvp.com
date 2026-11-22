-- CrownPVP network upgrade (Supabase)
-- Adds: staff ranks + permissions, player reports v2, ban appeals v2, decision history, audit log,
--       private evidence uploads, and the public staff / player-registration functions.
--
-- Run ONCE, AFTER setup.sql and appeals-and-reports.sql:
--   Supabase dashboard > SQL Editor > New query > paste everything > Run.
-- Safe to run again; it never deletes existing reports, appeals or accounts.
--
-- AFTER running it, make yourself Owner (replace YourName with the username you signed up with):
--   update public.profiles set staff_rank = 'owner' where lower(username) = lower('YourName');

-- =====================================================================
-- 1. Staff ranks on profiles
-- =====================================================================
alter table public.profiles add column if not exists staff_rank text;
alter table public.profiles add column if not exists position_title text;
alter table public.profiles add column if not exists extra_perms text[] not null default '{}';
alter table public.profiles add column if not exists public_listed boolean not null default true;
alter table public.profiles add column if not exists staff_since timestamptz;

alter table public.profiles drop constraint if exists profiles_staff_rank_check;
alter table public.profiles add constraint profiles_staff_rank_check
  check (staff_rank is null or staff_rank in ('owner','coowner','manager','admin','developer','moderator','helper','media'));
alter table public.profiles drop constraint if exists profiles_position_title_check;
alter table public.profiles add constraint profiles_position_title_check
  check (position_title is null or char_length(position_title) <= 40);

-- Anyone who was already marked staff keeps their access as Admin. Change it later with set_staff_rank or SQL.
update public.profiles set staff_rank = 'admin' where is_staff and staff_rank is null;

-- is_staff is now always derived from the rank (Media is listed on the team but is not "staff" for alerts/legacy tools).
create or replace function public.profiles_sync_staff()
returns trigger language plpgsql as $$
begin
  new.is_staff := new.staff_rank is not null and new.staff_rank <> 'media';
  return new;
end $$;
drop trigger if exists profiles_sync_staff on public.profiles;
create trigger profiles_sync_staff before insert or update on public.profiles
  for each row execute function public.profiles_sync_staff();
update public.profiles set staff_rank = staff_rank;

-- =====================================================================
-- 2. Permissions per rank (edit the table in the Table Editor to change who can do what)
-- =====================================================================
create table if not exists public.rank_permissions (
  rank text primary key,
  reports_view    boolean not null default false,
  reports_review  boolean not null default false, -- mark Pending / Under Review
  reports_decide  boolean not null default false, -- Approve / Deny
  appeals_view    boolean not null default false,
  appeals_decide  boolean not null default false, -- Approve / Deny / Under Review
  cases_reopen    boolean not null default false, -- change a decision that was already made
  audit_view      boolean not null default false,
  staff_manage    boolean not null default false  -- assign ranks
);
alter table public.rank_permissions enable row level security;
revoke all on public.rank_permissions from anon, authenticated;

insert into public.rank_permissions (rank, reports_view, reports_review, reports_decide, appeals_view, appeals_decide, cases_reopen, audit_view, staff_manage) values
  ('owner',     true,  true,  true,  true,  true,  true,  true,  true),
  ('coowner',   true,  true,  true,  true,  true,  true,  true,  true),
  ('manager',   true,  true,  true,  true,  true,  true,  true,  false),
  ('admin',     true,  true,  true,  true,  true,  false, false, false),
  ('developer', true,  true,  true,  true,  true,  false, true,  false),
  ('moderator', true,  true,  true,  true,  false, false, false, false),
  ('helper',    true,  true,  false, false, false, false, false, false),
  ('media',     false, false, false, false, false, false, false, false)
on conflict (rank) do nothing;

create or replace function public.rank_level(r text)
returns int language sql immutable as $$
  select case r when 'owner' then 1 when 'coowner' then 2 when 'manager' then 3 when 'admin' then 4
                when 'developer' then 5 when 'moderator' then 6 when 'helper' then 7 when 'media' then 8 else 99 end;
$$;
create or replace function public.rank_label(r text)
returns text language sql immutable as $$
  select case r when 'owner' then 'Owner' when 'coowner' then 'Co-Owner' when 'manager' then 'Manager' when 'admin' then 'Admin'
                when 'developer' then 'Developer' when 'moderator' then 'Moderator' when 'helper' then 'Helper' when 'media' then 'Media'
                else coalesce(r, '') end;
$$;
revoke all on function public.rank_level(text) from public, anon;
revoke all on function public.rank_label(text) from public, anon;

-- Does the signed-in person hold this permission? (rank permissions, or a per-person grant in profiles.extra_perms)
create or replace function public.has_perm(p text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text; extra text[]; ok boolean := false;
begin
  if auth.uid() is null then return false; end if;
  if p not in ('reports_view','reports_review','reports_decide','appeals_view','appeals_decide','cases_reopen','audit_view','staff_manage') then
    return false;
  end if;
  select staff_rank, extra_perms into r, extra from public.profiles where id = auth.uid();
  if r is null then return false; end if;
  if p = any(extra) then return true; end if;
  execute format('select coalesce((select %I from public.rank_permissions where rank = $1), false)', p) into ok using r;
  return coalesce(ok, false);
end $$;
revoke all on function public.has_perm(text) from public, anon;
grant execute on function public.has_perm(text) to authenticated;

-- What the website needs to know about the signed-in person (never trusted for security, only for showing/hiding tabs).
create or replace function public.my_access()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r text; uname text; perms text[];
begin
  if auth.uid() is null then return null; end if;
  select username, staff_rank into uname, r from public.profiles where id = auth.uid();
  perms := array(
    select p from unnest(array['reports_view','reports_review','reports_decide','appeals_view','appeals_decide','cases_reopen','audit_view','staff_manage']) as p
    where public.has_perm(p));
  return jsonb_build_object('username', uname, 'rank', r, 'perms', to_jsonb(perms));
end $$;
revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- =====================================================================
-- 3. Player reports v2
-- =====================================================================
create table if not exists public.player_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reporter text not null,
  reported_player text not null check (reported_player ~ '^[A-Za-z0-9_]{3,16}$'),
  gamemode text not null check (gamemode in ('Factions','SkyBlock','Survival','KitPvP','Other')),
  category text not null check (category in ('Hacking / Cheating','Abusing Bugs','Scamming','Inappropriate Behaviour','Exploiting','Other')),
  details text not null check (char_length(details) between 20 and 3000),
  evidence_links text[] not null default '{}' check (cardinality(evidence_links) <= 5),
  evidence_files text[] not null default '{}' check (cardinality(evidence_files) <= 5),
  status text not null default 'pending' check (status in ('pending','under_review','approved','denied')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_by_name text,
  handled_by_rank text,
  decision_reason text not null default '' check (char_length(decision_reason) <= 1000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists player_reports_status_created on public.player_reports (status, created_at desc);
create index if not exists player_reports_user_created on public.player_reports (user_id, created_at desc);
create index if not exists player_reports_target on public.player_reports (lower(reported_player));
alter table public.player_reports enable row level security;
drop policy if exists "player_reports: read own or staff" on public.player_reports;
create policy "player_reports: read own or staff" on public.player_reports
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_perm('reports_view')));
grant select on public.player_reports to authenticated;
-- No insert/update/delete policies: reports are created and decided only through the functions below.

-- =====================================================================
-- 4. Ban appeals v2
-- =====================================================================
create table if not exists public.ban_appeals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_name text not null,
  mc_username text not null check (mc_username ~ '^[A-Za-z0-9_]{3,16}$'),
  punishment_type text not null check (punishment_type in ('ban','mute','other')),
  punishment_id bigint check (punishment_id is null or punishment_id > 0),
  punishment_reason text not null check (char_length(punishment_reason) between 3 and 300),
  reconsider_reason text not null check (char_length(reconsider_reason) between 30 and 2000),
  additional text not null default '' check (char_length(additional) <= 2000),
  evidence_links text[] not null default '{}' check (cardinality(evidence_links) <= 5),
  evidence_files text[] not null default '{}' check (cardinality(evidence_files) <= 5),
  status text not null default 'pending' check (status in ('pending','under_review','approved','denied')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_by_name text,
  handled_by_rank text,
  decision_reason text not null default '' check (char_length(decision_reason) <= 1000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ban_appeals_status_created on public.ban_appeals (status, created_at desc);
create index if not exists ban_appeals_user_created on public.ban_appeals (user_id, created_at desc);
create index if not exists ban_appeals_name on public.ban_appeals (lower(mc_username));
create index if not exists ban_appeals_pid on public.ban_appeals (punishment_id);
alter table public.ban_appeals enable row level security;
drop policy if exists "ban_appeals: read own or staff" on public.ban_appeals;
create policy "ban_appeals: read own or staff" on public.ban_appeals
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_perm('appeals_view')));
grant select on public.ban_appeals to authenticated;

-- =====================================================================
-- 5. Decision history (visible to the player who owns the case and to staff) + staff audit log
-- =====================================================================
create table if not exists public.case_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('report','appeal')),
  case_id bigint not null,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text not null,
  actor_rank text,
  from_status text,
  to_status text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists case_events_case on public.case_events (kind, case_id, created_at);
alter table public.case_events enable row level security;
drop policy if exists "case_events: read own case or staff" on public.case_events;
create policy "case_events: read own case or staff" on public.case_events
  for select to authenticated
  using (
    (kind = 'report' and (
        (select public.has_perm('reports_view'))
        or exists (select 1 from public.player_reports r where r.id = case_id and r.user_id = (select auth.uid()))))
    or (kind = 'appeal' and (
        (select public.has_perm('appeals_view'))
        or exists (select 1 from public.ban_appeals a where a.id = case_id and a.user_id = (select auth.uid()))))
  );
grant select on public.case_events to authenticated;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text not null,
  actor_rank text,
  action text not null,
  target_kind text not null,
  target_id bigint,
  target_label text,
  from_status text,
  to_status text,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created on public.audit_log (created_at desc);
create index if not exists audit_log_actor on public.audit_log (lower(actor_name));
alter table public.audit_log enable row level security;
drop policy if exists "audit_log: read with audit permission" on public.audit_log;
create policy "audit_log: read with audit permission" on public.audit_log
  for select to authenticated using ((select public.has_perm('audit_view')));
grant select on public.audit_log to authenticated;

-- =====================================================================
-- 6. Private evidence uploads (screenshots / short clips). Files are never public.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 26214400,
        array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update
  set public = false, file_size_limit = 26214400,
      allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'];

drop policy if exists "evidence: upload into own folder" on storage.objects;
create policy "evidence: upload into own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "evidence: read own or staff" on storage.objects;
create policy "evidence: read own or staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.has_perm('reports_view'))
    or (select public.has_perm('appeals_view'))));
-- No update/delete policies: evidence cannot be swapped or removed after it is sent.

-- Checks links and uploaded files sent with a report or appeal.
create or replace function public._check_evidence(p_links text[], p_files text[])
returns void language plpgsql security definer set search_path = public, storage as $$
declare l text; f text;
begin
  if cardinality(coalesce(p_links, '{}')) > 5 then raise exception 'Too many evidence links (max 5)'; end if;
  if cardinality(coalesce(p_files, '{}')) > 5 then raise exception 'Too many evidence files (max 5)'; end if;
  foreach l in array coalesce(p_links, '{}') loop
    if l !~ '^https://[^[:space:]]{4,480}$' then raise exception 'Evidence links must start with https://'; end if;
  end loop;
  foreach f in array coalesce(p_files, '{}') loop
    if char_length(f) > 200
       or f not like ((auth.uid())::text || '/%')
       or not exists (select 1 from storage.objects where bucket_id = 'evidence' and name = f) then
      raise exception 'An evidence file could not be found. Upload it again.';
    end if;
  end loop;
end $$;
revoke all on function public._check_evidence(text[], text[]) from public, anon;

-- =====================================================================
-- 7. Player sends a report
-- =====================================================================
create or replace function public.submit_player_report(
  p_player text, p_gamemode text, p_category text, p_details text,
  p_links text[] default '{}', p_files text[] default '{}')
returns bigint language plpgsql security definer set search_path = public as $$
declare uname text; new_id bigint; target text := btrim(coalesce(p_player, '')); det text := btrim(coalesce(p_details, ''));
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username into uname from public.profiles where id = auth.uid();
  if uname is null then raise exception 'No profile'; end if;
  if target !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'Enter a valid Minecraft username (3-16 letters, numbers or underscores)'; end if;
  if lower(target) = lower(uname) then raise exception 'You cannot report yourself'; end if;
  if coalesce(p_gamemode, '') not in ('Factions','SkyBlock','Survival','KitPvP','Other') then raise exception 'Choose a gamemode'; end if;
  if coalesce(p_category, '') not in ('Hacking / Cheating','Abusing Bugs','Scamming','Inappropriate Behaviour','Exploiting','Other') then raise exception 'Choose a report category'; end if;
  if char_length(det) < 20 or char_length(det) > 3000 then raise exception 'The explanation must be 20 to 3000 characters'; end if;
  if (select count(*) from public.player_reports where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many reports. Please wait a while before sending another.';
  end if;
  perform public._check_evidence(p_links, p_files);

  insert into public.player_reports (user_id, reporter, reported_player, gamemode, category, details, evidence_links, evidence_files)
  values (auth.uid(), uname, target, p_gamemode, p_category, det, coalesce(p_links, '{}'), coalesce(p_files, '{}'))
  returning id into new_id;

  insert into public.case_events (kind, case_id, actor_id, actor_name, actor_rank, from_status, to_status, reason)
  values ('report', new_id, auth.uid(), uname, null, null, 'pending', '');

  insert into public.notifications (user_id, title, body, link)
  select p.id, 'New report: ' || target, left(p_category || ' · ' || p_gamemode, 200), 'dashboard.html'
  from public.profiles p left join public.rank_permissions rp on rp.rank = p.staff_rank
  where (rp.reports_view or 'reports_view' = any(p.extra_perms)) and p.id <> auth.uid();

  return new_id;
end $$;
revoke all on function public.submit_player_report(text, text, text, text, text[], text[]) from public, anon;
grant execute on function public.submit_player_report(text, text, text, text, text[], text[]) to authenticated;

-- =====================================================================
-- 8. Staff change a report's status (the decision reason is written by the staff member)
-- =====================================================================
create or replace function public.set_report_status(p_id bigint, p_status text, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare r public.player_reports%rowtype; me record; reason text := btrim(coalesce(p_reason, '')); decided boolean;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username, staff_rank into me from public.profiles where id = auth.uid();
  if me.staff_rank is null then raise exception 'Staff only'; end if;
  if coalesce(p_status, '') not in ('pending','under_review','approved','denied') then raise exception 'Bad status'; end if;
  decided := p_status in ('approved','denied');
  if decided then
    if not public.has_perm('reports_decide') then raise exception 'Your rank cannot approve or deny reports'; end if;
    if char_length(reason) < 5 then raise exception 'Write a reason (at least 5 characters)'; end if;
  elsif not (public.has_perm('reports_review') or public.has_perm('reports_decide')) then
    raise exception 'Your rank cannot review reports';
  end if;
  if char_length(reason) > 1000 then raise exception 'The reason is too long (max 1000 characters)'; end if;

  select * into r from public.player_reports where id = p_id for update;
  if not found then raise exception 'Report not found'; end if;
  if r.status = p_status then raise exception 'This report is already %', replace(p_status, '_', ' '); end if;
  if r.status in ('approved','denied') and not public.has_perm('cases_reopen') then
    raise exception 'This report was already decided. Only a Manager or above can change it.';
  end if;

  update public.player_reports
     set status = p_status, handled_by = auth.uid(), handled_by_name = me.username, handled_by_rank = me.staff_rank,
         decision_reason = case when decided then reason else '' end,
         decided_at = case when decided then now() else null end,
         updated_at = now()
   where id = p_id;

  insert into public.case_events (kind, case_id, actor_id, actor_name, actor_rank, from_status, to_status, reason)
  values ('report', p_id, auth.uid(), me.username, me.staff_rank, r.status, p_status, reason);
  insert into public.audit_log (actor_id, actor_name, actor_rank, action, target_kind, target_id, target_label, from_status, to_status, reason)
  values (auth.uid(), me.username, me.staff_rank, 'report.' || p_status, 'report', p_id, r.reported_player, r.status, p_status, reason);

  if decided or p_status = 'under_review' then
    insert into public.notifications (user_id, title, body, link)
    values (r.user_id,
            case p_status when 'approved' then 'Your report RPT-' || p_id || ' was approved'
                          when 'denied' then 'Your report RPT-' || p_id || ' was denied'
                          else 'Your report RPT-' || p_id || ' is under review' end,
            case when decided then left('[' || public.rank_label(me.staff_rank) || ' ' || me.username || '] ' || reason, 480)
                 else 'A staff member is looking into it.' end,
            'support.html');
  end if;
end $$;
revoke all on function public.set_report_status(bigint, text, text) from public, anon;
grant execute on function public.set_report_status(bigint, text, text) to authenticated;

-- =====================================================================
-- 9. Player sends a ban appeal
-- =====================================================================
create or replace function public.submit_ban_appeal(
  p_mc_username text, p_type text, p_punishment_id bigint, p_punishment_reason text,
  p_reconsider text, p_additional text default '',
  p_links text[] default '{}', p_files text[] default '{}')
returns bigint language plpgsql security definer set search_path = public as $$
declare uname text; new_id bigint; mc text := btrim(coalesce(p_mc_username, ''));
        preason text := btrim(coalesce(p_punishment_reason, '')); why text := btrim(coalesce(p_reconsider, '')); extra text := btrim(coalesce(p_additional, ''));
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username into uname from public.profiles where id = auth.uid();
  if uname is null then raise exception 'No profile'; end if;
  if mc !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'Enter a valid Minecraft username (3-16 letters, numbers or underscores)'; end if;
  if coalesce(p_type, '') not in ('ban','mute','other') then raise exception 'Choose what you are appealing'; end if;
  if p_punishment_id is not null and p_punishment_id < 1 then raise exception 'The punishment ID must be a positive number'; end if;
  if char_length(preason) < 3 or char_length(preason) > 300 then raise exception 'Enter the reason shown for your punishment (3-300 characters)'; end if;
  if char_length(why) < 30 or char_length(why) > 2000 then raise exception 'Explain why it should be reconsidered (30-2000 characters)'; end if;
  if char_length(extra) > 2000 then raise exception 'The additional explanation is too long (max 2000 characters)'; end if;
  if exists (select 1 from public.ban_appeals where user_id = auth.uid() and status in ('pending','under_review')) then
    raise exception 'You already have an appeal waiting for a decision';
  end if;
  perform public._check_evidence(p_links, p_files);

  insert into public.ban_appeals (user_id, account_name, mc_username, punishment_type, punishment_id, punishment_reason, reconsider_reason, additional, evidence_links, evidence_files)
  values (auth.uid(), uname, mc, p_type, p_punishment_id, preason, why, extra, coalesce(p_links, '{}'), coalesce(p_files, '{}'))
  returning id into new_id;

  insert into public.case_events (kind, case_id, actor_id, actor_name, actor_rank, from_status, to_status, reason)
  values ('appeal', new_id, auth.uid(), uname, null, null, 'pending', '');

  insert into public.notifications (user_id, title, body, link)
  select p.id, 'New appeal from ' || mc, 'Open the staff dashboard to review it.', 'dashboard.html'
  from public.profiles p left join public.rank_permissions rp on rp.rank = p.staff_rank
  where (rp.appeals_view or 'appeals_view' = any(p.extra_perms)) and p.id <> auth.uid();

  return new_id;
end $$;
revoke all on function public.submit_ban_appeal(text, text, bigint, text, text, text, text[], text[]) from public, anon;
grant execute on function public.submit_ban_appeal(text, text, bigint, text, text, text, text[], text[]) to authenticated;

-- =====================================================================
-- 10. Staff change an appeal's status
-- =====================================================================
create or replace function public.set_appeal_status(p_id bigint, p_status text, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare a public.ban_appeals%rowtype; me record; reason text := btrim(coalesce(p_reason, '')); decided boolean;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username, staff_rank into me from public.profiles where id = auth.uid();
  if me.staff_rank is null then raise exception 'Staff only'; end if;
  if coalesce(p_status, '') not in ('pending','under_review','approved','denied') then raise exception 'Bad status'; end if;
  if not public.has_perm('appeals_decide') then raise exception 'Your rank cannot decide appeals'; end if;
  decided := p_status in ('approved','denied');
  if decided and char_length(reason) < 5 then raise exception 'Write a reason (at least 5 characters)'; end if;
  if char_length(reason) > 1000 then raise exception 'The reason is too long (max 1000 characters)'; end if;

  select * into a from public.ban_appeals where id = p_id for update;
  if not found then raise exception 'Appeal not found'; end if;
  if a.status = p_status then raise exception 'This appeal is already %', replace(p_status, '_', ' '); end if;
  if a.status in ('approved','denied') and not public.has_perm('cases_reopen') then
    raise exception 'This appeal was already decided. Only a Manager or above can change it.';
  end if;

  update public.ban_appeals
     set status = p_status, handled_by = auth.uid(), handled_by_name = me.username, handled_by_rank = me.staff_rank,
         decision_reason = case when decided then reason else '' end,
         decided_at = case when decided then now() else null end,
         updated_at = now()
   where id = p_id;

  insert into public.case_events (kind, case_id, actor_id, actor_name, actor_rank, from_status, to_status, reason)
  values ('appeal', p_id, auth.uid(), me.username, me.staff_rank, a.status, p_status, reason);
  insert into public.audit_log (actor_id, actor_name, actor_rank, action, target_kind, target_id, target_label, from_status, to_status, reason)
  values (auth.uid(), me.username, me.staff_rank, 'appeal.' || p_status, 'appeal', p_id, a.mc_username, a.status, p_status, reason);

  if decided or p_status = 'under_review' then
    insert into public.notifications (user_id, title, body, link)
    values (a.user_id,
            case p_status when 'approved' then 'Your appeal APL-' || p_id || ' was approved'
                          when 'denied' then 'Your appeal APL-' || p_id || ' was denied'
                          else 'Your appeal APL-' || p_id || ' is under review' end,
            case when decided then left('<' || public.rank_label(me.staff_rank) || ' ' || me.username || '> ' || reason, 480)
                 else 'A staff member is reviewing your appeal.' end,
            'appeals.html');
  end if;
end $$;
revoke all on function public.set_appeal_status(bigint, text, text) from public, anon;
grant execute on function public.set_appeal_status(bigint, text, text) to authenticated;

-- =====================================================================
-- 11. Staff management (assign ranks) + public team list + public registration date
-- =====================================================================
create or replace function public.list_staff()
returns table (username text, staff_rank text, position_title text, public_listed boolean, staff_since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.username, p.staff_rank, p.position_title, p.public_listed, p.staff_since
  from public.profiles p
  where public.has_perm('staff_manage') and p.staff_rank is not null
  order by public.rank_level(p.staff_rank), lower(p.username);
$$;
revoke all on function public.list_staff() from public, anon;
grant execute on function public.list_staff() to authenticated;

create or replace function public.set_staff_rank(p_username text, p_rank text, p_title text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me record; tgt record; lv_me int; lv_new int; lv_old int; cap int; cnt int;
        newrank text := nullif(btrim(coalesce(p_rank, '')), ''); ttl text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if not public.has_perm('staff_manage') then raise exception 'Your rank cannot manage staff'; end if;
  select id, username, staff_rank into me from public.profiles where id = auth.uid();
  select id, username, staff_rank into tgt from public.profiles where lower(username) = lower(btrim(coalesce(p_username, '')));
  if tgt.id is null then raise exception 'No account with that username'; end if;
  if tgt.id = me.id then raise exception 'You cannot change your own rank'; end if;
  if newrank is not null and newrank not in ('owner','coowner','manager','admin','developer','moderator','helper','media') then
    raise exception 'Unknown rank';
  end if;
  if ttl is not null and char_length(ttl) > 40 then raise exception 'The position title is too long (max 40 characters)'; end if;

  lv_me := public.rank_level(me.staff_rank);
  lv_new := public.rank_level(newrank);
  lv_old := public.rank_level(tgt.staff_rank);
  if me.staff_rank <> 'owner' and (lv_new <= lv_me or lv_old <= lv_me) then
    raise exception 'You can only manage ranks below your own';
  end if;

  cap := case newrank when 'owner' then 1 when 'coowner' then 1 when 'manager' then 2 when 'admin' then 3
                      when 'moderator' then 3 when 'helper' then 3 when 'media' then 3 else null end;
  if cap is not null and tgt.staff_rank is distinct from newrank then
    select count(*) into cnt from public.profiles where staff_rank = newrank;
    if cnt >= cap then raise exception 'The % rank is full (% of % filled)', public.rank_label(newrank), cnt, cap; end if;
  end if;

  update public.profiles
     set staff_rank = newrank,
         position_title = case when newrank is null then null else coalesce(ttl, position_title) end,
         staff_since = case when newrank is null then null when tgt.staff_rank is null then now() else staff_since end
   where id = tgt.id;

  insert into public.audit_log (actor_id, actor_name, actor_rank, action, target_kind, target_id, target_label, from_status, to_status, reason)
  values (auth.uid(), me.username, me.staff_rank, 'staff.rank', 'staff', null, tgt.username, tgt.staff_rank, newrank, coalesce(ttl, ''));
end $$;
revoke all on function public.set_staff_rank(text, text, text) from public, anon;
grant execute on function public.set_staff_rank(text, text, text) to authenticated;

-- The public team page (no email, no ids).
create or replace function public.public_staff()
returns table (username text, staff_rank text, position_title text, staff_since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.username, p.staff_rank, p.position_title, p.staff_since
  from public.profiles p
  where p.staff_rank is not null and p.public_listed
  order by public.rank_level(p.staff_rank), lower(p.username);
$$;
revoke all on function public.public_staff() from public;
grant execute on function public.public_staff() to anon, authenticated;

-- Website registration date for the player lookup (only the username and the account creation time).
create or replace function public.public_player_site_info(p_name text)
returns table (username text, registered_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.username, p.created_at from public.profiles p where lower(p.username) = lower(btrim(coalesce(p_name, ''))) limit 1;
$$;
revoke all on function public.public_player_site_info(text) from public;
grant execute on function public.public_player_site_info(text) to anon, authenticated;

-- =====================================================================
-- 12. Retire the old appeal/report functions (their tables and data stay untouched)
-- =====================================================================
drop function if exists public.submit_appeal(text, text, text, text, text);
drop function if exists public.review_appeal(bigint, text, text);
drop function if exists public.submit_report(text, text, text, text, text, text);
drop function if exists public.review_report(bigint, text, text);
