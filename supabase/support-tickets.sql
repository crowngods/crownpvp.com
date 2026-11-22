-- CrownPVP support tickets. Run once in Supabase > SQL Editor AFTER network-upgrade.sql (it uses has_perm, profiles and notifications from that file).
create table if not exists public.support_tickets (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  title text not null check (char_length(title) between 3 and 100),
  topic text not null check (topic in ('About Discord','Connection issues','Denied staff application','Missing prize','Buy merchandise','Something else')),
  description text not null check (char_length(description) between 10 and 3000),
  status text not null default 'open' check (status in ('open','answered','closed')),
  staff_reply text not null default '' check (char_length(staff_reply) <= 2000),
  replied_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Existing installs: allow the new 'Buy merchandise' topic.
alter table public.support_tickets drop constraint if exists support_tickets_topic_check;
alter table public.support_tickets add constraint support_tickets_topic_check check (topic in ('About Discord','Connection issues','Denied staff application','Missing prize','Buy merchandise','Something else'));
create index if not exists support_tickets_user_created on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_created on public.support_tickets (status, created_at desc);
alter table public.support_tickets enable row level security;
drop policy if exists "support_tickets: read own or staff" on public.support_tickets;
create policy "support_tickets: read own or staff" on public.support_tickets
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_perm('reports_view')));
grant select on public.support_tickets to authenticated;
-- No insert/update/delete policies: tickets are created and answered only through the functions below.

create or replace function public.submit_support_ticket(p_username text, p_title text, p_topic text, p_description text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint; uname text := btrim(coalesce(p_username, '')); ttl text := btrim(coalesce(p_title, '')); des text := btrim(coalesce(p_description, ''));
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if uname !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'Enter a valid Minecraft username (3-16 letters, numbers or underscores)'; end if;
  if char_length(ttl) < 3 or char_length(ttl) > 100 then raise exception 'The title must be 3 to 100 characters'; end if;
  if coalesce(p_topic, '') not in ('About Discord','Connection issues','Denied staff application','Missing prize','Buy merchandise','Something else') then raise exception 'Choose a topic'; end if;
  if char_length(des) < 10 or char_length(des) > 3000 then raise exception 'The description must be 10 to 3000 characters'; end if;
  if (select count(*) from public.support_tickets where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many tickets. Please wait a while before opening another.';
  end if;
  insert into public.support_tickets (user_id, username, title, topic, description) values (auth.uid(), uname, ttl, p_topic, des) returning id into new_id;
  insert into public.notifications (user_id, title, body, link)
  select p.id, 'New ticket: ' || left(ttl, 80), left(p_topic || ' · ' || uname, 200), 'tickets.html'
  from public.profiles p left join public.rank_permissions rp on rp.rank = p.staff_rank
  where (rp.reports_view or 'reports_view' = any(p.extra_perms)) and p.id <> auth.uid();
  return new_id;
end $$;
revoke all on function public.submit_support_ticket(text, text, text, text) from public, anon;
grant execute on function public.submit_support_ticket(text, text, text, text) to authenticated;

create or replace function public.reply_support_ticket(p_id bigint, p_reply text, p_close boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare me text; rep text := btrim(coalesce(p_reply, '')); owner_id uuid;
begin
  if auth.uid() is null or not public.has_perm('reports_decide') then raise exception 'You do not have permission to answer tickets'; end if;
  if char_length(rep) > 2000 then raise exception 'The reply is too long (2000 characters max)'; end if;
  if not p_close and char_length(rep) < 2 then raise exception 'Write a reply first'; end if;
  select username into me from public.profiles where id = auth.uid();
  update public.support_tickets
     set staff_reply = case when rep <> '' then rep else staff_reply end,
         replied_by = case when rep <> '' then me else replied_by end,
         status = case when p_close then 'closed' else 'answered' end,
         updated_at = now()
   where id = p_id returning user_id into owner_id;
  if owner_id is null then raise exception 'Ticket not found'; end if;
  insert into public.notifications (user_id, title, body, link)
  values (owner_id, case when p_close then 'Your ticket was closed' else 'Staff replied to your ticket' end, 'Ticket #' || p_id, 'tickets.html');
end $$;
revoke all on function public.reply_support_ticket(bigint, text, boolean) from public, anon;
grant execute on function public.reply_support_ticket(bigint, text, boolean) to authenticated;
