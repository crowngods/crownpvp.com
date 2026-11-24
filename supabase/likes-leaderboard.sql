-- CrownPVP "Most liked players" list for the profile page.
-- Run once in the Supabase SQL Editor AFTER social-hub.sql. Safe to run again. Reads only; changes no data.

create or replace function public.get_top_liked_profiles(p_limit int default 10)
returns table(username text, avatar_url text, staff_rank text, like_count bigint)
language sql security definer stable set search_path = public as $$
  select p.username, p.avatar_url, p.staff_rank, count(pl.liker_id)::bigint as like_count
  from public.profiles p
  join public.profile_likes pl on pl.profile_id = p.id
  group by p.id, p.username, p.avatar_url, p.staff_rank
  order by like_count desc, p.username asc
  limit greatest(1, least(coalesce(p_limit, 10), 25));
$$;
revoke all on function public.get_top_liked_profiles(int) from public;
grant execute on function public.get_top_liked_profiles(int) to anon, authenticated;
