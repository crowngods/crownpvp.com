-- CrownPVP Social Hub: friends, friend requests, private messages and online presence.
-- Run AFTER setup.sql, network-upgrade.sql, news-social.sql and profiles-upgrade.sql.
-- Safe to run again. Does not remove existing accounts, comments or messages.

-- Prerequisites: stop with a clear message if an earlier script has not been run.
do $$ begin
  if to_regclass('public.profiles') is null or to_regclass('public.notifications') is null then
    raise exception 'Run setup.sql first (public.profiles / public.notifications are missing).';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'staff_rank') then
    raise exception 'Run network-upgrade.sql first (profiles.staff_rank is missing).';
  end if;
  if to_regclass('public.news_comments') is null or to_regclass('public.news_reactions') is null then
    raise exception 'Run news-social.sql first (news_comments / news_reactions are missing).';
  end if;
end $$;

-- Profile columns this file reads. Same as profiles-upgrade.sql, so running that file before or after is harmless.
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 300);
alter table public.profiles add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 400);
alter table public.profiles add column if not exists username_changed boolean not null default false;

create table if not exists public.friend_requests (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_not_self check (requester_id <> receiver_id)
);
create unique index if not exists friend_requests_pending_pair
  on public.friend_requests(requester_id, receiver_id) where status = 'pending';
create index if not exists friend_requests_receiver_pending
  on public.friend_requests(receiver_id, created_at desc) where status = 'pending';

create table if not exists public.friendships (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint friendships_sorted_pair check (user_low < user_high)
);
create index if not exists friendships_high_user on public.friendships(user_high);

create table if not exists public.direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint direct_messages_not_self check (sender_id <> recipient_id)
);
create index if not exists direct_messages_sender_created on public.direct_messages(sender_id, created_at desc);
create index if not exists direct_messages_recipient_created on public.direct_messages(recipient_id, created_at desc);
create index if not exists direct_messages_unread on public.direct_messages(recipient_id, sender_id) where read_at is null;

-- Only the authenticated user's own presence is written by the presence RPC.
create table if not exists public.site_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now()
);
create index if not exists site_presence_last_seen on public.site_presence(last_seen desc);

-- Anonymous website visitor pings are keyed by a random browser token.
-- No IP address, email, location or other personal data is stored in this table.
create table if not exists public.website_visitors (
  session_id uuid primary key,
  last_seen timestamptz not null default now()
);
create index if not exists website_visitors_last_seen on public.website_visitors(last_seen desc);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;
alter table public.site_presence enable row level security;
alter table public.website_visitors enable row level security;

drop policy if exists "friend requests visible to participants" on public.friend_requests;
create policy "friend requests visible to participants" on public.friend_requests
  for select to authenticated using (requester_id = auth.uid() or receiver_id = auth.uid());
drop policy if exists "friendships visible to participants" on public.friendships;
create policy "friendships visible to participants" on public.friendships
  for select to authenticated using (user_low = auth.uid() or user_high = auth.uid());
drop policy if exists "messages visible to participants" on public.direct_messages;
create policy "messages visible to participants" on public.direct_messages
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());

-- No direct writes or visitor-table reads. All operations go through scoped RPCs below.
revoke all on public.friend_requests, public.friendships, public.direct_messages,
  public.site_presence, public.website_visitors from anon, authenticated;
grant select on public.friend_requests, public.friendships, public.direct_messages to authenticated;

create or replace function public.ping_website_presence(p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_session_id is null then raise exception 'A visitor session is required'; end if;
  insert into public.website_visitors(session_id, last_seen)
  values (p_session_id, now())
  on conflict (session_id) do update set last_seen = excluded.last_seen;
  -- Low-frequency cleanup prevents abandoned browser tokens accumulating forever.
  if random() < 0.02 then
    delete from public.website_visitors where last_seen < now() - interval '1 day';
  end if;
end $$;
revoke all on function public.ping_website_presence(uuid) from public;
grant execute on function public.ping_website_presence(uuid) to anon, authenticated;

create or replace function public.get_website_active_count()
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::integer from public.website_visitors
  where last_seen > now() - interval '3 minutes';
$$;
revoke all on function public.get_website_active_count() from public;
grant execute on function public.get_website_active_count() to anon, authenticated;

create or replace function public.ping_my_presence()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.site_presence(user_id, last_seen) values (auth.uid(), now())
  on conflict (user_id) do update set last_seen = excluded.last_seen;
end $$;
revoke all on function public.ping_my_presence() from public, anon;
grant execute on function public.ping_my_presence() to authenticated;

create or replace function public.get_my_friends()
returns table(
  user_id uuid, username text, avatar_url text, staff_rank text,
  last_seen timestamptz, is_online boolean, unread_count integer
)
language sql security definer stable set search_path = public as $$
  select p.id, p.username, p.avatar_url, p.staff_rank, sp.last_seen,
    coalesce(sp.last_seen > now() - interval '3 minutes', false),
    (select count(*)::integer from public.direct_messages dm
      where dm.sender_id = p.id and dm.recipient_id = auth.uid() and dm.read_at is null)
  from public.friendships f
  join public.profiles p on p.id = case when f.user_low = auth.uid() then f.user_high else f.user_low end
  left join public.site_presence sp on sp.user_id = p.id
  where auth.uid() is not null and (f.user_low = auth.uid() or f.user_high = auth.uid())
  order by coalesce(sp.last_seen > now() - interval '3 minutes', false) desc, lower(p.username);
$$;
revoke all on function public.get_my_friends() from public, anon;
grant execute on function public.get_my_friends() to authenticated;

create or replace function public.get_my_friend_requests()
returns table(request_id bigint, username text, avatar_url text, direction text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select fr.id, p.username, p.avatar_url,
    case when fr.receiver_id = auth.uid() then 'incoming' else 'outgoing' end,
    fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.id = case when fr.receiver_id = auth.uid() then fr.requester_id else fr.receiver_id end
  where auth.uid() is not null and fr.status = 'pending'
    and (fr.requester_id = auth.uid() or fr.receiver_id = auth.uid())
  order by fr.created_at desc limit 50;
$$;
revoke all on function public.get_my_friend_requests() from public, anon;
grant execute on function public.get_my_friend_requests() to authenticated;

create or replace function public.get_social_profile(p_username text)
returns table(
  username text, bio text, avatar_url text, staff_rank text, created_at timestamptz,
  comments bigint, reactions bigint, is_online boolean, friendship_status text, friend_request_id bigint
)
language sql security definer stable set search_path = public as $$
  select p.username, p.bio, p.avatar_url, p.staff_rank, p.created_at,
    (select count(*) from public.news_comments c where c.user_id = p.id),
    (select count(*) from public.news_reactions r where r.user_id = p.id),
    coalesce(sp.last_seen > now() - interval '3 minutes', false),
    case
      when auth.uid() is null or auth.uid() = p.id then 'none'
      when exists (select 1 from public.friendships f where f.user_low = least(auth.uid(), p.id) and f.user_high = greatest(auth.uid(), p.id)) then 'friends'
      when exists (select 1 from public.friend_requests fr where fr.requester_id = p.id and fr.receiver_id = auth.uid() and fr.status = 'pending') then 'incoming'
      when exists (select 1 from public.friend_requests fr where fr.requester_id = auth.uid() and fr.receiver_id = p.id and fr.status = 'pending') then 'outgoing'
      else 'none'
    end,
    (select fr.id from public.friend_requests fr
      where fr.status = 'pending' and ((fr.requester_id = p.id and fr.receiver_id = auth.uid()) or (fr.requester_id = auth.uid() and fr.receiver_id = p.id))
      order by fr.created_at desc limit 1)
  from public.profiles p
  left join public.site_presence sp on sp.user_id = p.id
  where lower(p.username) = lower(btrim(p_username)) limit 1;
$$;
revoke all on function public.get_social_profile(text) from public;
grant execute on function public.get_social_profile(text) to anon, authenticated;

create or replace function public.send_friend_request(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare target_id uuid; reverse_request bigint; sender_name text;
begin
  if auth.uid() is null then raise exception 'Sign in to add friends'; end if;
  select id into target_id from public.profiles where lower(username) = lower(btrim(p_username)) limit 1;
  if target_id is null then raise exception 'No CrownPVP account found with that username'; end if;
  if target_id = auth.uid() then raise exception 'You cannot add yourself'; end if;
  if exists (select 1 from public.friendships where user_low = least(auth.uid(), target_id) and user_high = greatest(auth.uid(), target_id)) then
    return 'friends';
  end if;
  if exists (select 1 from public.friend_requests where requester_id = auth.uid() and receiver_id = target_id and status = 'pending') then
    return 'pending';
  end if;
  select id into reverse_request from public.friend_requests
    where requester_id = target_id and receiver_id = auth.uid() and status = 'pending' limit 1;
  if reverse_request is not null then
    perform public.respond_friend_request(reverse_request, true);
    return 'accepted';
  end if;
  insert into public.friend_requests(requester_id, receiver_id, status)
    values (auth.uid(), target_id, 'pending')
    on conflict (requester_id, receiver_id) where status = 'pending' do nothing;
  select username into sender_name from public.profiles where id = auth.uid();
  insert into public.notifications(user_id, title, body, link)
    values (target_id, 'New friend request', sender_name || ' wants to add you as a friend.', 'index.html?tab=friends');
  return 'sent';
end $$;
revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;

create or replace function public.respond_friend_request(p_request_id bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare req public.friend_requests%rowtype; target_name text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into req from public.friend_requests where id = p_request_id for update;
  if not found or req.receiver_id <> auth.uid() or req.status <> 'pending' then raise exception 'Friend request is no longer available'; end if;
  if p_accept then
    insert into public.friendships(user_low, user_high)
      values (least(req.requester_id, req.receiver_id), greatest(req.requester_id, req.receiver_id))
      on conflict do nothing;
    update public.friend_requests set status = 'accepted', responded_at = now() where id = p_request_id;
    select username into target_name from public.profiles where id = auth.uid();
    insert into public.notifications(user_id, title, body, link)
      values (req.requester_id, 'Friend request accepted', target_name || ' accepted your friend request.', 'index.html?tab=friends');
  else
    update public.friend_requests set status = 'declined', responded_at = now() where id = p_request_id;
  end if;
end $$;
revoke all on function public.respond_friend_request(bigint, boolean) from public, anon;
grant execute on function public.respond_friend_request(bigint, boolean) to authenticated;

create or replace function public.cancel_friend_request(p_request_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  delete from public.friend_requests where id = p_request_id and requester_id = auth.uid() and status = 'pending';
end $$;
revoke all on function public.cancel_friend_request(bigint) from public, anon;
grant execute on function public.cancel_friend_request(bigint) to authenticated;

create or replace function public.remove_friend(p_username text)
returns void language plpgsql security definer set search_path = public as $$
declare target_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select id into target_id from public.profiles where lower(username) = lower(btrim(p_username)) limit 1;
  if target_id is null then raise exception 'Player not found'; end if;
  delete from public.friendships where user_low = least(auth.uid(), target_id) and user_high = greatest(auth.uid(), target_id);
end $$;
revoke all on function public.remove_friend(text) from public, anon;
grant execute on function public.remove_friend(text) to authenticated;

create or replace function public.send_direct_message(p_username text, p_body text)
returns bigint language plpgsql security definer set search_path = public as $$
declare target_id uuid; sender_name text; new_id bigint; clean_body text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  clean_body := btrim(coalesce(p_body, ''));
  if char_length(clean_body) < 1 or char_length(clean_body) > 2000 then raise exception 'Message must be between 1 and 2000 characters'; end if;
  select id into target_id from public.profiles where lower(username) = lower(btrim(p_username)) limit 1;
  if target_id is null or target_id = auth.uid() then raise exception 'Player not found'; end if;
  if not exists (select 1 from public.friendships where user_low = least(auth.uid(), target_id) and user_high = greatest(auth.uid(), target_id)) then
    raise exception 'You can message friends only. Send a friend request first';
  end if;
  if (select count(*) from public.direct_messages where sender_id = auth.uid() and created_at > now() - interval '10 seconds') >= 8 then
    raise exception 'Please slow down before sending another message';
  end if;
  insert into public.direct_messages(sender_id, recipient_id, body)
    values (auth.uid(), target_id, clean_body) returning id into new_id;
  select username into sender_name from public.profiles where id = auth.uid();
  insert into public.notifications(user_id, title, body, link)
    values (target_id, 'New message from ' || sender_name, left(clean_body, 140), 'index.html?chat=' || sender_name);
  return new_id;
end $$;
revoke all on function public.send_direct_message(text, text) from public, anon;
grant execute on function public.send_direct_message(text, text) to authenticated;

create or replace function public.get_direct_messages(p_username text)
returns table(id bigint, sender_id uuid, recipient_id uuid, body text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare target_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select pr.id into target_id from public.profiles pr where lower(pr.username) = lower(btrim(p_username)) limit 1;
  if target_id is null or not exists (
    select 1 from public.friendships where user_low = least(auth.uid(), target_id) and user_high = greatest(auth.uid(), target_id)
  ) then raise exception 'You can message friends only'; end if;
  update public.direct_messages um set read_at = now()
    where um.sender_id = target_id and um.recipient_id = auth.uid() and um.read_at is null;
  return query
    select dm.id, dm.sender_id, dm.recipient_id, dm.body, dm.created_at
    from public.direct_messages dm
    where (dm.sender_id = auth.uid() and dm.recipient_id = target_id)
       or (dm.sender_id = target_id and dm.recipient_id = auth.uid())
    order by dm.created_at desc limit 100;
end $$;
revoke all on function public.get_direct_messages(text) from public, anon;
grant execute on function public.get_direct_messages(text) to authenticated;

-- Public author labels for published news posts. Only exposes username, public rank and avatar;
-- the profile is returned only when that account authored a publicly readable news post.
create or replace function public.get_news_post_authors(p_user_ids uuid[])
returns table(user_id uuid, username text, staff_rank text, position_title text, avatar_url text)
language sql security definer stable set search_path = public as $$
  select p.id, p.username, p.staff_rank, p.position_title, p.avatar_url
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, '{}'::uuid[]))
    and exists (select 1 from public.news_posts n where n.created_by = p.id);
$$;
revoke all on function public.get_news_post_authors(uuid[]) from public;
grant execute on function public.get_news_post_authors(uuid[]) to anon, authenticated;

-- Keep access limited to the functions above; no client can read another player's private messages.

-- Public profile likes. A player can like each profile once and can remove their own like.
-- Direct table access is denied; clients use the two scoped RPC functions below.
create table if not exists public.profile_likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  liker_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, liker_id),
  constraint profile_likes_not_self check (profile_id <> liker_id)
);
create index if not exists profile_likes_liker_idx on public.profile_likes(liker_id);
alter table public.profile_likes enable row level security;
revoke all on public.profile_likes from public, anon, authenticated;

create or replace function public.get_profile_likes(p_username text)
returns table(like_count bigint, liked_by_me boolean)
language sql security definer stable set search_path = public as $$
  select count(pl.liker_id)::bigint,
    coalesce(bool_or(pl.liker_id = auth.uid()), false)
  from public.profiles p
  left join public.profile_likes pl on pl.profile_id = p.id
  where lower(p.username) = lower(btrim(p_username))
  group by p.id;
$$;
revoke all on function public.get_profile_likes(text) from public;
grant execute on function public.get_profile_likes(text) to anon, authenticated;

create or replace function public.toggle_profile_like(p_username text)
returns table(like_count bigint, liked_by_me boolean)
language plpgsql security definer set search_path = public as $$
declare target_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to like a profile'; end if;
  select p.id into target_id
    from public.profiles p
    where lower(p.username) = lower(btrim(p_username))
    limit 1;
  if target_id is null then raise exception 'Player profile not found'; end if;
  if target_id = auth.uid() then raise exception 'You cannot like your own profile'; end if;

  if exists (select 1 from public.profile_likes pl where pl.profile_id = target_id and pl.liker_id = auth.uid()) then
    delete from public.profile_likes pl where pl.profile_id = target_id and pl.liker_id = auth.uid();
  else
    insert into public.profile_likes(profile_id, liker_id)
      values (target_id, auth.uid())
      on conflict (profile_id, liker_id) do nothing;
  end if;

  return query
    select count(*)::bigint,
      exists (select 1 from public.profile_likes pl where pl.profile_id = target_id and pl.liker_id = auth.uid())
    from public.profile_likes pl
    where pl.profile_id = target_id;
end $$;
revoke all on function public.toggle_profile_like(text) from public, anon;
grant execute on function public.toggle_profile_like(text) to authenticated;

