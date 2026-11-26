-- CrownPVP Services project requests. Run once in Supabase > SQL Editor (after network-upgrade.sql, which provides has_perm).
create table if not exists public.service_requests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 64),
  email text not null check (char_length(email) between 5 and 120),
  discord text not null default '' check (char_length(discord) <= 64),
  service text not null check (service in ('Website design & development','Full-stack application','UI / UX redesign','Website maintenance','Minecraft resource pack','Minecraft plugin','Minecraft map or build','Minecraft website','Something custom')),
  budget text not null default '' check (char_length(budget) <= 40),
  timeline text not null default '' check (char_length(timeline) <= 40),
  brief text not null check (char_length(brief) between 30 and 4000),
  reference text not null default '' check (char_length(reference) <= 500),
  status text not null default 'new' check (status in ('new','reviewing','quoted','accepted','declined','done')),
  created_at timestamptz not null default now()
);
create index if not exists service_requests_created on public.service_requests (created_at desc);
create index if not exists service_requests_email_created on public.service_requests (email, created_at desc);
alter table public.service_requests enable row level security;
drop policy if exists "service_requests: staff read" on public.service_requests;
create policy "service_requests: staff read" on public.service_requests
  for select to authenticated using ((select public.has_perm('reports_view')));
grant select on public.service_requests to authenticated;
-- No insert policy: visitors submit only through the function below.

create or replace function public.submit_service_request(p_name text, p_email text, p_discord text, p_service text, p_budget text, p_timeline text, p_brief text, p_reference text)
returns text language plpgsql security definer set search_path = public as $$
declare nm text := btrim(coalesce(p_name,'')); em text := lower(btrim(coalesce(p_email,''))); br text := btrim(coalesce(p_brief,'')); ref text := btrim(coalesce(p_reference,'')); new_id bigint;
begin
  if char_length(nm) < 2 or char_length(nm) > 64 then raise exception 'Please enter your name.'; end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(em) > 120 then raise exception 'Enter a valid email address.'; end if;
  if coalesce(p_service,'') not in ('Website design & development','Full-stack application','UI / UX redesign','Website maintenance','Minecraft resource pack','Minecraft plugin','Minecraft map or build','Minecraft website','Something custom') then raise exception 'Choose the service you need.'; end if;
  if char_length(br) < 30 or char_length(br) > 4000 then raise exception 'Please add at least 30 characters to your project brief.'; end if;
  if ref <> '' and ref !~* '^https?://\S+$' then raise exception 'Reference link must start with http:// or https://'; end if;
  if (select count(*) from public.service_requests where email = em and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.service_requests where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Too many project requests. Please try again later.';
  end if;
  insert into public.service_requests (name, email, discord, service, budget, timeline, brief, reference)
  values (nm, em, left(btrim(coalesce(p_discord,'')),64), p_service, left(btrim(coalesce(p_budget,'')),40), left(btrim(coalesce(p_timeline,'')),40), br, left(ref,500))
  returning id into new_id;
  insert into public.notifications (user_id, title, body, link)
  select p.id, 'New project request', left(p_service || ' · ' || nm, 200), 'services.html'
  from public.profiles p left join public.rank_permissions rp on rp.rank = p.staff_rank
  where (rp.reports_view or 'reports_view' = any(p.extra_perms));
  return 'CP-SV-' || lpad(new_id::text, 5, '0');
end $$;
revoke all on function public.submit_service_request(text,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_service_request(text,text,text,text,text,text,text,text) to anon, authenticated;
