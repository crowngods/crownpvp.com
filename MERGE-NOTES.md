# CrownPVP — Merged Professional Update

This project combines the complete CrownPVP Social Hub project with the newer v3 visual and responsive update, plus persistent player-profile likes.

## What's included

- The complete CrownPVP website, page set, artwork, configuration, local preview server, and deployment files.
- The newer shared v3 visual layer and improved mobile navigation.
- The Social Hub: friend requests, friends list, online/offline presence, private messages, and an active website visitor count.
- Public player profiles with profile pictures, bios, staff rank, comments, reactions, and **profile likes**.
- Profile likes are stored in Supabase. Each signed-in website account can like a player's profile once and can unlike it; players cannot like their own profile. The total is displayed publicly on the profile.
- Supabase SQL migrations, GitHub Pages workflow, and the LiteBans sync utility.


## Visual restoration update

The supplied third image is installed as `crownpvp/assets/crownpvp-header.webp` and is used as the homepage hero artwork. The previous CrownPVP battle scenery (`crown-voxel-battle.webp`) is restored as a subtle fixed page backdrop so it does not move during scrolling. A new `crownpvp/css/visual-restored.css` stylesheet loads after the v3 layer and fixes the news composer, post author names, reactions, comments, and Quick Links contrast for the dark theme. The application loader and HTML cache keys were updated so browsers fetch the new stylesheet.

## Required Supabase setup

For a fresh database, run these scripts in Supabase SQL Editor in order:

1. `supabase/setup.sql`
2. `supabase/network-upgrade.sql`
3. `supabase/news-social.sql`
4. `supabase/profiles-upgrade.sql`
5. `supabase/social-hub.sql`

For an existing Social Hub installation, **re-run `supabase/social-hub.sql` once** to create the profile-likes table and RPC functions. The script is written to be safe to run again. Do not remove existing tables or player data.

Make sure `crownpvp/js/config.js` contains your Supabase project URL and public anon key. Never put a Supabase service-role key, database password, webhook secret, or other private credential in browser JavaScript.

## Preview locally

Install Node.js 22 or newer, open the `crownpvp/` folder in a terminal, and run:

```bash
node dev/server.mjs
```

Then open `http://localhost:8788`. The local preview uses demo data and does not connect to or modify your live Supabase project.

## Publish

Deploy the contents of `crownpvp/` using the hosting workflow in `crownpvp/README.md`. Keep `supabase/`, `litebans-sync/`, and `.github/` in your repository as needed for migrations, vote/punishment syncing, and GitHub Actions.

**Important:** the active counter measures recent website visitors, not live Minecraft server players. Friends' online/offline indicators represent signed-in website presence.

## Network masthead and staff application navigation update

The previous oversized homepage hero has been replaced by a compact, network-style masthead using `crownpvp/assets/crownpvp-header.webp` (the supplied CrownPVP battle artwork). It includes a Play Now link, a click-to-copy server IP panel, and a beveled gold navigation bar modeled on the reference layout. The navigation now includes a dedicated **Staff Applications** link to `staff.html#apply`; the homepage Quick Links card also has a prominent Staff Applications callout. The staff application page and its form were already present in the project and have been preserved.

The existing dark scenery backdrop, feed styling, social features, and profile-like functionality remain in place. Main navigation is responsive and collapses to a menu on smaller screens. Cache-busting references were updated so browsers fetch the new shared header code and stylesheet.


## Black Paper skin

`crownpvp/css/crown-darkpaper.css` (loaded last by `js/app.js`) puts `assets/black-paper.webp` behind every page, replaces the beige torn-edge mounts on the home page with clean dark gold-edged frames, and adds the polish layer (gold headings, glass cards, hover lifts, drifting embers). To roll back, remove the `darkPaperStyles` block from `js/app.js`.

Tile art: `assets/tile-gold|merch|vote|staff.webp` are the four home quick-link illustrations (pixel art, set in `js/app.js`). `assets/crown-team-logo.webp` is the official "Crown Team" news avatar (set in `js/news-social.js`).
