# CrownPVP Community Hub + News Author Update

## Website changes
- Replaced the homepage Community Hub panel with separate charcoal folded-paper cards and subtle gold trim.
- The first panel shows active website visitors (not the Minecraft server's in-game player count), refreshed every 30 seconds.
- Signed-in members see up to five friends, each friend's online/offline state, and a one-click message icon.
- Added an inline Add Friend field to the homepage sidebar. Friend requests can be accepted, declined, or cancelled in the full Community panel.
- Private messages remain restricted to accepted friends and are handled by Supabase RPC functions.
- News posts now show the publishing account's username/avatar and rank directly beneath the name. Posts with no account author show Crown Team / Official News.
- Existing staff-only news publishing permissions remain unchanged.

## Required Supabase update
If `social-hub.sql` was already run on your Supabase project, run the updated `supabase/social-hub.sql` again in Supabase Dashboard → SQL Editor → New query → Run. It is safe to rerun and adds the `get_news_post_authors` public-safe RPC used by the news author display.

For a new project, follow `supabase/README.md` and run the SQL files in the documented order. Never put a Supabase service-role key in the website.

## Important count clarification
The counter reports active browser visitors to crownpvp.com within the last three minutes. It does not query the Minecraft server's live player count. The existing server player count remains separate.
