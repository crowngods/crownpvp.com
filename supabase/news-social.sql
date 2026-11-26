-- CrownPVP news feed: staff posts, comments, emoji reactions, photo uploads, and OAuth-safe signups.
-- Run ONCE after setup.sql + network-upgrade.sql: Supabase > SQL Editor > paste > Run. Safe to run again.

-- 1. Discord/Google signups have no "username" metadata, which broke the old signup trigger. Build a valid unique one.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; cand text; n int := 0;
begin
  base := coalesce(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'preferred_username',
    new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1), 'player');
  base := regexp_replace(base, '[^A-Za-z0-9_]', '', 'g');
  if char_length(base) < 3 then base := 'player' || substr(replace(new.id::text, '-', ''), 1, 6); end if;
  base := left(base, 16); cand := base;
  while exists (select 1 from public.profiles where lower(username) = lower(cand)) loop
    n := n + 1; cand := left(base, 16 - char_length(n::text)) || n::text;
  end loop;
  insert into public.profiles (id, username) values (new.id, cand);
  insert into public.notifications (user_id, title, body, link)
  values (new.id, 'Welcome to CrownPVP!', 'Your account is ready. Staff alerts will show up here.', null);
  return new;
end $$;

-- 2. Who may post news: these staff ranks (edit the list to change it)
create or replace function public.can_post_news()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid()
    and staff_rank in ('owner','coowner','manager','admin','developer','media'));
$$;
revoke all on function public.can_post_news() from public, anon;
grant execute on function public.can_post_news() to authenticated;

-- 3. Posts
create table if not exists public.news_posts(
  id text primary key default gen_random_uuid()::text check (char_length(id) between 1 and 60),
  author text not null default 'Crown team' check (author = 'Crown team'),
  body text not null check (char_length(body) between 1 and 2000),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now());
alter table public.news_posts enable row level security;
drop policy if exists "read posts" on public.news_posts;
drop policy if exists "staff add posts" on public.news_posts;
drop policy if exists "staff delete posts" on public.news_posts;
create policy "read posts" on public.news_posts for select using (true);
create policy "staff add posts" on public.news_posts for insert to authenticated with check (public.can_post_news());
create policy "staff delete posts" on public.news_posts for delete to authenticated using (public.can_post_news());

-- 4. Comments + reactions (post = news_posts.id)
create table if not exists public.news_comments(
  id bigint generated always as identity primary key,
  post text not null check (char_length(post) between 1 and 60),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 1 and 40),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now());
create table if not exists public.news_reactions(
  post text not null check (char_length(post) between 1 and 60),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 12),
  created_at timestamptz not null default now(),
  primary key (post, user_id, emoji));
alter table public.news_comments enable row level security;
alter table public.news_reactions enable row level security;
drop policy if exists "read comments" on public.news_comments;
drop policy if exists "add own comment" on public.news_comments;
drop policy if exists "delete own comment" on public.news_comments;
drop policy if exists "read reactions" on public.news_reactions;
drop policy if exists "add own reaction" on public.news_reactions;
drop policy if exists "remove own reaction" on public.news_reactions;
create policy "read comments" on public.news_comments for select using (true);
create policy "add own comment" on public.news_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own comment" on public.news_comments for delete to authenticated using (auth.uid() = user_id or public.can_post_news());
create policy "read reactions" on public.news_reactions for select using (true);
create policy "add own reaction" on public.news_reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "remove own reaction" on public.news_reactions for delete to authenticated using (auth.uid() = user_id);

-- 5. Photo uploads for posts (public read, staff write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "news images read" on storage.objects;
drop policy if exists "news images staff upload" on storage.objects;
drop policy if exists "news images staff delete" on storage.objects;
create policy "news images read" on storage.objects for select using (bucket_id = 'news-images');
create policy "news images staff upload" on storage.objects for insert to authenticated with check (bucket_id = 'news-images' and public.can_post_news());
create policy "news images staff delete" on storage.objects for delete to authenticated using (bucket_id = 'news-images' and public.can_post_news());

-- 6. Starter posts (editable/deletable by staff afterwards)
insert into public.news_posts (id, body, image_url, created_at) values
('opening-date', E'SERVER OPENING DATE UPDATE\n\nHey everyone! We''ve decided to move the official opening of CrownPVP to November 27! We''re taking a little extra time to add more exciting features, improve gameplay, and make sure everyone gets the best possible experience when they join.\n\nWe want to make sure CrownPVP is worth the wait, and we''re working hard behind the scenes to bring you something you''ll truly enjoy! ❤️\n\nThank you for your patience and continued support. We can''t wait to see you all on release!', 'assets/opening-date.webp', now() - interval '3 hours'),
('staff-hiring', E'STAFF APPLICATIONS ARE OPEN\n\nWant to become part of the CrownPVP Staff Team? We''re looking for dedicated members to help our growing community as we prepare for more upcoming gamemodes!\n\n📋 Apply now through our website: https://crownpvp.com/staff\n\nGood luck, future staff members! ❤️', null, now() - interval '1 day'),
('raid-shield', E'⚔️ FACTION RAID SHIELD UPDATE\n\nTo keep raids fair and competitive, OP Factions now uses a 5-hour raid window: shields are open for 5 hours and closed for 19, repeating every 24 hours.\n\n🔥 Prepare your cannons. Protect your base. Choose your raid time wisely.\n\nFull details: https://crownpvp.com/opfactions#raid', null, now() - interval '2 days')
on conflict (id) do nothing;
