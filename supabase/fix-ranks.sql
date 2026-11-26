-- Run once in Supabase > SQL Editor. Puts the leadership on their real ranks.
-- (The website cannot change your own rank, and the migration set every old staff member to Admin.)
update public.profiles set staff_rank = 'owner',     position_title = 'Owner'     where lower(username) = 'medicalweed';
update public.profiles set staff_rank = 'coowner',   position_title = 'Co-Owner'  where lower(username) = 'ksa_70007';
update public.profiles set staff_rank = 'developer', position_title = 'Developer' where lower(username) = 'raizukennn';
-- Check the result:
select username, staff_rank from public.profiles where lower(username) in ('medicalweed','ksa_70007','raizukennn');
