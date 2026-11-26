-- CrownPVP: show commenters' profile pictures on news comments.
-- Run once in the Supabase SQL Editor (safe to re-run). Needs profiles-upgrade.sql applied first (avatar_url column).
-- Only exposes username, rank and avatar for accounts that actually wrote a public news comment.
create or replace function public.get_news_comment_authors(p_user_ids uuid[])
returns table(user_id uuid, username text, staff_rank text, avatar_url text)
language sql security definer stable set search_path = public as $$
  select p.id, p.username, p.staff_rank, p.avatar_url
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, '{}'::uuid[]))
    and exists (select 1 from public.news_comments c where c.user_id = p.id);
$$;
revoke all on function public.get_news_comment_authors(uuid[]) from public;
grant execute on function public.get_news_comment_authors(uuid[]) to anon, authenticated;
