-- CrownPVP Staff Applications (matches reports & appeals architecture)
-- Run once in Supabase SQL Editor AFTER network-upgrade.sql

alter table public.rank_permissions
  add column if not exists applications_view boolean not null default false,
  add column if not exists applications_decide boolean not null default false;

update public.rank_permissions
set applications_view = true, applications_decide = true
where rank in ('owner', 'coowner', 'manager', 'admin');

update public.rank_permissions
set applications_view = true
where rank in ('developer', 'moderator');

create or replace function public.has_perm(p text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text; extra text[]; ok boolean := false;
begin
  if auth.uid() is null then return false; end if;
  if p not in ('reports_view','reports_review','reports_decide','appeals_view','appeals_decide','applications_view','applications_decide','cases_reopen','audit_view','staff_manage') then
    return false;
  end if;
  select staff_rank, extra_perms into r, extra from public.profiles where id = auth.uid();
  if r is null then return false; end if;
  if p = any(extra) then return true; end if;
  execute format('select coalesce((select %I from public.rank_permissions where rank = $1), false)', p) into ok using r;
  return coalesce(ok, false);
end $$;

create or replace function public.my_access()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r text; uname text; perms text[];
begin
  if auth.uid() is null then return null; end if;
  select username, staff_rank into uname, r from public.profiles where id = auth.uid();
  perms := array(
    select p from unnest(array['reports_view','reports_review','reports_decide','appeals_view','appeals_decide','applications_view','applications_decide','cases_reopen','audit_view','staff_manage']) as p
    where public.has_perm(p));
  return jsonb_build_object('username', uname, 'rank', r, 'perms', to_jsonb(perms));
end $$;

create table if not exists public.staff_applications (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  account_name text not null default '',
  mc_username text not null,
  discord text not null,
  role text not null,
  age_band text not null,
  timezone text not null,
  availability text not null,
  experience text not null default '',
  motivation text not null,
  status text not null default 'pending' check (status in ('pending','under_review','approved','denied')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_by_name text,
  handled_by_rank text,
  decision_reason text not null default '' check (char_length(decision_reason) <= 1000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_applications_status_created on public.staff_applications (status, created_at desc);
create index if not exists staff_applications_user_created on public.staff_applications (user_id, created_at desc);
alter table public.staff_applications enable row level security;

drop policy if exists "staff_applications: read own or staff" on public.staff_applications;
create policy "staff_applications: read own or staff" on public.staff_applications
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_perm('applications_view')));

grant select on public.staff_applications to authenticated;

alter table public.case_events drop constraint if exists case_events_kind_check;
alter table public.case_events add constraint case_events_kind_check check (kind in ('report','appeal','application'));

create or replace function public.submit_staff_application(
  p_mc_username text, p_discord text, p_role text, p_age_band text,
  p_timezone text, p_availability text, p_experience text, p_motivation text
)
returns bigint language plpgsql security definer set search_path = public as $$
declare uname text; new_id bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username into uname from public.profiles where id = auth.uid();
  if uname is null then uname := btrim(p_mc_username); end if;

  if exists (select 1 from public.staff_applications where user_id = auth.uid() and status in ('pending','under_review')) then
    raise exception 'You already have an open staff application waiting for review.';
  end if;

  insert into public.staff_applications (user_id, account_name, mc_username, discord, role, age_band, timezone, availability, experience, motivation)
  values (auth.uid(), uname, btrim(p_mc_username), btrim(p_discord), btrim(p_role), btrim(p_age_band), btrim(p_timezone), btrim(p_availability), btrim(coalesce(p_experience, '')), btrim(p_motivation))
  returning id into new_id;

  insert into public.case_events (kind, case_id, actor_id, actor_name, actor_rank, from_status, to_status, reason)
  values ('application', new_id, auth.uid(), uname, null, null, 'pending', '');

  insert into public.notifications (user_id, title, body, link)
  select p.id, 'New Staff Application: ' || btrim(p_mc_username), 'Applied for ' || btrim(p_role), 'dashboard.html#applications'
  from public.profiles p left join public.rank_permissions rp on rp.rank = p.staff_rank
  where (rp.applications_view or 'applications_view' = any(p.extra_perms)) and p.id <> auth.uid();

  return new_id;
end $$;
revoke all on function public.submit_staff_application(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_staff_application(text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.set_application_status(p_id bigint, p_status text, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare r public.staff_applications%rowtype; me record; reason text := btrim(coalesce(p_reason, '')); decided boolean;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select username, staff_rank into me from public.profiles where id = auth.uid();
  if me.staff_rank is null then raise exception 'Staff only'; end if;
  if coalesce(p_status, '') not in ('pending','under_review','approved','denied') then raise exception 'Bad status'; end if;

  decided := p_status in ('approved','denied');
  if decided then
    if not public.has_perm('applications_decide') then raise exception 'Your rank cannot accept or deny applications'; end if;
    if char_length(reason) < 5 then raise exception 'Write a description/reason first (at least 5 characters)'; end if;
  elsif not (public.has_perm('applications_view') or public.has_perm('applications_decide')) then
    raise exception 'Your rank cannot review applications';
  end if;

  select * into r from public.staff_applications where id = p_id for update;
  if not found then raise exception 'Application not found'; end if;
  if r.status in ('approved','denied') and not public.has_perm('cases_reopen') then
    raise exception 'This application was already decided. Only a Manager or above can reopen it.';
  end if;

  update public.staff_applications
     set status = p_status, handled_by = auth.uid(), handled_by_name = me.username, handled_by_rank = me.staff_rank,
         decision_reason = case when decided then reason else coalesce(nullif(reason, ''), decision_reason) end,
         decided_at = case when decided then now() else null end,
         updated_at = now()
   where id = p_id;

  insert into public.case_events (kind, case_id, actor_id, actor_name, actor_rank, from_status, to_status, reason)
  values ('application', p_id, auth.uid(), me.username, me.staff_rank, r.status, p_status, reason);
  insert into public.audit_log (actor_id, actor_name, actor_rank, action, target_kind, target_id, target_label, from_status, to_status, reason)
  values (auth.uid(), me.username, me.staff_rank, 'application.' || p_status, 'application', p_id, r.mc_username, r.status, p_status, reason);

  if r.user_id is not null and (decided or p_status = 'under_review') then
    insert into public.notifications (user_id, title, body, link)
    values (r.user_id,
            case p_status when 'approved' then 'Your Staff Application APP-' || p_id || ' was ACCEPTED!'
                          when 'denied' then 'Your Staff Application APP-' || p_id || ' was DENIED'
                          else 'Your Staff Application APP-' || p_id || ' is UNDER REVIEW' end,
            case when decided then left('[' || public.rank_label(me.staff_rank) || ' ' || me.username || '] ' || reason, 480)
                 else 'Management is currently reviewing your application.' end,
            'staff.html#my-applications');
  end if;
end $$;
revoke all on function public.set_application_status(bigint, text, text) from public, anon;
grant execute on function public.set_application_status(bigint, text, text) to authenticated;
