-- CrownPVP: let EVERY signed-in player submit a staff application.
-- Fixes the "You do not have permission to do that." error on the Submit Application button.
-- Run once in the Supabase SQL Editor (safe to re-run). Run staff-applications.sql first if you never did.

-- 1) The decision-history table only allowed kinds 'report' and 'appeal'. Saving an application
--    writes a row of kind 'application', so the database rejected it ("violates check constraint").
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'case_events' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.case_events drop constraint %I', c.conname);
  end loop;
  alter table public.case_events
    add constraint case_events_kind_check check (kind in ('report','appeal','application'));
end $$;

-- 2) Re-create the submit function so that any signed-in account (player or staff) can apply, and so a
--    problem in the history log or the staff bell alerts can never block the application itself.
create or replace function public.submit_staff_application(
  p_mc_username text, p_discord text, p_role text, p_age_band text,
  p_timezone text, p_availability text, p_experience text, p_motivation text
)
returns bigint language plpgsql security definer set search_path = public as $$
declare uname text; new_id bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;

  if btrim(coalesce(p_mc_username,'')) = '' or btrim(coalesce(p_discord,'')) = '' or btrim(coalesce(p_role,'')) = ''
     or btrim(coalesce(p_age_band,'')) = '' or btrim(coalesce(p_timezone,'')) = ''
     or btrim(coalesce(p_availability,'')) = '' or btrim(coalesce(p_motivation,'')) = '' then
    raise exception 'Please fill in every required field.';
  end if;

  select username into uname from public.profiles where id = auth.uid();
  if uname is null or btrim(uname) = '' then uname := btrim(p_mc_username); end if;

  if exists (select 1 from public.staff_applications where user_id = auth.uid() and status in ('pending','under_review')) then
    raise exception 'You already have an open staff application waiting for review.';
  end if;

  insert into public.staff_applications (user_id, account_name, mc_username, discord, role, age_band, timezone, availability, experience, motivation)
  values (auth.uid(), uname, btrim(p_mc_username), btrim(p_discord), btrim(p_role), btrim(p_age_band), btrim(p_timezone), btrim(p_availability), btrim(coalesce(p_experience, '')), btrim(p_motivation))
  returning id into new_id;

  begin
    insert into public.case_events (kind, case_id, actor_id, actor_name, actor_rank, from_status, to_status, reason)
    values ('application', new_id, auth.uid(), uname, null, null, 'pending', '');
  exception when others then null; end;

  begin
    insert into public.notifications (user_id, title, body, link)
    select p.id, left('New Staff Application: ' || btrim(p_mc_username), 120), left('Applied for ' || btrim(p_role), 500), 'dashboard.html#applications'
    from public.profiles p left join public.rank_permissions rp on rp.rank = p.staff_rank
    where (coalesce(rp.applications_view, false) or 'applications_view' = any(coalesce(p.extra_perms, '{}'::text[]))) and p.id <> auth.uid();
  exception when others then null; end;

  return new_id;
end $$;
revoke all on function public.submit_staff_application(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_staff_application(text, text, text, text, text, text, text, text) to authenticated;

-- 3) Players can always read their own applications (for the "Your Submitted Applications" panel).
grant select on public.staff_applications to authenticated;
