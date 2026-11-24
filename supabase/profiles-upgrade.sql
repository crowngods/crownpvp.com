-- CrownPVP profiles: picture, bio, one-time username change, public profile view.
-- Run AFTER setup.sql, network-upgrade.sql and news-social.sql. Safe to run again.
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 300);
alter table public.profiles add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 400);
alter table public.profiles add column if not exists username_changed boolean not null default false;

-- Save bio and/or picture (players can only edit their own row, and only through this function)
create or replace function public.update_my_profile(p_bio text, p_avatar_url text default null, p_clear_avatar boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_bio is not null and char_length(p_bio) > 300 then raise exception 'bio too long'; end if;
  if p_avatar_url is not null and p_avatar_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/' then raise exception 'bad avatar'; end if;
  update public.profiles set
    bio = nullif(btrim(coalesce(p_bio, '')), ''),
    avatar_url = case when p_clear_avatar then null when p_avatar_url is not null then p_avatar_url else avatar_url end
  where id = auth.uid();
end $$;
revoke all on function public.update_my_profile(text, text, boolean) from public, anon;
grant execute on function public.update_my_profile(text, text, boolean) to authenticated;

-- Change username: allowed exactly once per account
create or replace function public.change_my_username(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare cur record;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select username, username_changed into cur from public.profiles where id = auth.uid();
  if not found then raise exception 'no profile'; end if;
  if cur.username_changed then raise exception 'username already changed'; end if;
  if p_username !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'invalid username'; end if;
  if exists (select 1 from public.profiles where lower(username) = lower(p_username) and id <> auth.uid()) then raise exception 'username taken'; end if;
  update public.profiles set username = p_username, username_changed = true where id = auth.uid();
  if to_regclass('public.news_comments') is not null then update public.news_comments set username = p_username where user_id = auth.uid(); end if;
  return p_username;
end $$;
revoke all on function public.change_my_username(text) from public, anon;
grant execute on function public.change_my_username(text) to authenticated;

-- Public profile card (no email, no private data)
create or replace function public.get_profile(p_username text)
returns table(username text, bio text, avatar_url text, staff_rank text, created_at timestamptz, comments bigint, reactions bigint)
language sql security definer stable set search_path = public as $$
  select p.username, p.bio, p.avatar_url, p.staff_rank, p.created_at,
    (select count(*) from public.news_comments c where c.user_id = p.id),
    (select count(*) from public.news_reactions r where r.user_id = p.id)
  from public.profiles p where lower(p.username) = lower(p_username) limit 1;
$$;
grant execute on function public.get_profile(text) to anon, authenticated;

-- Profile pictures: public read, each player writes only inside their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
drop policy if exists "avatars read" on storage.objects;
drop policy if exists "avatars insert own" on storage.objects;
drop policy if exists "avatars update own" on storage.objects;
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars insert own" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
