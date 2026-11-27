-- CrownPVP appeals + reports (for Supabase)
-- Run this ONCE, AFTER setup.sql: Supabase dashboard > SQL Editor > New query > paste everything > Run.
-- Safe to run again later (even if you ran appeals.sql before); it will not delete existing data.

-- ---------- Helper: is the signed-in person staff? ----------
create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_staff);
$$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ---------- Appeals ----------
create table if not exists public.appeals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null,
  kind text not null check (kind in ('ban', 'mute', 'other')),
  reason text not null check (char_length(reason) between 1 and 200),
  details text not null check (char_length(details) between 30 and 2000),
  evidence text not null default '' check (char_length(evidence) <= 500),
  discord text not null default '' check (char_length(discord) <= 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  staff_note text not null default '' check (char_length(staff_note) <= 400),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists appeals_status_created on public.appeals (status, created_at desc);
create index if not exists appeals_user_created on public.appeals (user_id, created_at desc);
alter table public.appeals enable row level security;

-- Only the player who sent an appeal, and staff, can read it. Nobody else can see it.
drop policy if exists "appeals: read own or staff" on public.appeals;
create policy "appeals: read own or staff" on public.appeals
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
-- No insert/update/delete policies: appeals can only be created and decided through the functions below.
grant select on public.appeals to authenticated;

-- ---------- Player sends an appeal ----------
create or replace function public.submit_appeal(p_kind text, p_reason text, p_details text, p_evidence text default '', p_discord text default '')
returns bigint language plpgsql security definer set search_path = public as $$
declare uname text; new_id bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username into uname from public.profiles where id = auth.uid();
  if uname is null then raise exception 'No profile'; end if;
  if exists (select 1 from public.appeals where user_id = auth.uid() and status = 'pending') then
    raise exception 'You already have a pending appeal';
  end if;
  insert into public.appeals (user_id, username, kind, reason, details, evidence, discord)
  values (auth.uid(), uname, p_kind, btrim(p_reason), btrim(p_details), btrim(coalesce(p_evidence, '')), btrim(coalesce(p_discord, '')))
  returning id into new_id;
  -- tell every staff member there is a new appeal
  insert into public.notifications (user_id, title, body, link)
  select id, 'New appeal from ' || uname, 'Open the Appeals page to review it.', 'appeals.html' from public.profiles where is_staff;
  return new_id;
end $$;
revoke all on function public.submit_appeal(text, text, text, text, text) from public, anon;
grant execute on function public.submit_appeal(text, text, text, text, text) to authenticated;

-- ---------- Staff approves or declines ----------
create or replace function public.review_appeal(p_id bigint, p_decision text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare a public.appeals%rowtype; note text := btrim(coalesce(p_note, ''));
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_decision is null or p_decision not in ('approved', 'declined') then raise exception 'Bad decision'; end if;
  if p_decision = 'declined' and char_length(note) < 3 then raise exception 'Add a reason'; end if;
  select * into a from public.appeals where id = p_id for update;
  if not found then raise exception 'Appeal not found'; end if;
  if a.status <> 'pending' then raise exception 'Already reviewed'; end if;
  update public.appeals
    set status = p_decision, staff_note = note, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
  -- tell the player
  insert into public.notifications (user_id, title, body, link)
  values (a.user_id,
          case when p_decision = 'approved' then 'Your appeal was approved' else 'Your appeal was declined' end,
          left(note, 400), 'appeals.html');
end $$;
revoke all on function public.review_appeal(bigint, text, text) from public, anon;
grant execute on function public.review_appeal(bigint, text, text) to authenticated;

-- =====================================================================
-- REPORTS (players report a player, a faction or a bug; only staff read them)
-- =====================================================================
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reporter text not null,
  type text not null check (type in ('player', 'faction', 'bug')),
  category text not null check (char_length(category) between 1 and 120),
  target text not null check (char_length(target) between 1 and 32),
  contact text not null default '' check (char_length(contact) <= 64),
  details text not null check (char_length(details) between 20 and 3000),
  evidence text not null default '' check (char_length(evidence) <= 500),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'dismissed')),
  staff_note text not null default '' check (char_length(staff_note) <= 400),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_created on public.reports (status, created_at desc);
create index if not exists reports_user_created on public.reports (user_id, created_at desc);
alter table public.reports enable row level security;

-- Only the player who sent a report, and staff, can read it. The reported player cannot.
drop policy if exists "reports: read own or staff" on public.reports;
create policy "reports: read own or staff" on public.reports
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
-- No insert/update/delete policies: reports can only be created and handled through the functions below.
grant select on public.reports to authenticated;

-- ---------- Player sends a report ----------
create or replace function public.submit_report(p_type text, p_category text, p_target text, p_details text, p_contact text default '', p_evidence text default '')
returns bigint language plpgsql security definer set search_path = public as $$
declare uname text; new_id bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username into uname from public.profiles where id = auth.uid();
  if uname is null then raise exception 'No profile'; end if;
  if (select count(*) from public.reports where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many reports';
  end if;
  insert into public.reports (user_id, reporter, type, category, target, contact, details, evidence)
  values (auth.uid(), uname, p_type, btrim(p_category), btrim(p_target), btrim(coalesce(p_contact, '')), btrim(p_details), btrim(coalesce(p_evidence, '')))
  returning id into new_id;
  -- tell every staff member there is a new report
  insert into public.notifications (user_id, title, body, link)
  select id, 'New ' || p_type || ' report: ' || left(btrim(p_target), 40), left(btrim(p_category), 200), 'support.html'
  from public.profiles where is_staff;
  return new_id;
end $$;
revoke all on function public.submit_report(text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_report(text, text, text, text, text, text) to authenticated;

-- ---------- Staff handles a report ----------
create or replace function public.review_report(p_id bigint, p_status text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare a public.reports%rowtype; note text := btrim(coalesce(p_note, ''));
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_status is null or p_status not in ('reviewing', 'resolved', 'dismissed') then raise exception 'Bad status'; end if;
  select * into a from public.reports where id = p_id for update;
  if not found then raise exception 'Report not found'; end if;
  if a.status in ('resolved', 'dismissed') then raise exception 'Already closed'; end if;
  update public.reports
    set status = p_status, staff_note = note, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
  -- tell the reporter once the report is closed
  if p_status in ('resolved', 'dismissed') then
    insert into public.notifications (user_id, title, body, link)
    values (a.user_id,
            case when p_status = 'resolved' then 'Your report RPT-' || a.id::text || ' was handled'
                 else 'Your report RPT-' || a.id::text || ' was reviewed' end,
            case when note <> '' then left(note, 400)
                 when p_status = 'resolved' then 'Thank you for helping keep CrownPVP fair.'
                 else 'Staff looked into it and no action was needed.' end,
            'support.html');
  end if;
end $$;
revoke all on function public.review_report(bigint, text, text) from public, anon;
grant execute on function public.review_report(bigint, text, text) to authenticated;
