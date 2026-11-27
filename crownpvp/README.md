# CrownPVP Website — Elite Upgrade

A responsive multi-page CrownPVP website built with HTML, CSS, vanilla JavaScript and Cloudflare Pages Functions (D1). No frontend build step is required.

## Run locally in VS Code

1. Install Node.js 22 or newer.
2. Extract this project and open the `crownpvp` folder in VS Code.
3. Open Terminal → New Terminal and run:

   ```powershell
   node dev/server.mjs
   ```

4. Open `http://localhost:8788`.
5. The local owner inbox is at `http://localhost:8788/owner`.
6. Local-only owner key: `crown-local-owner-key` (printed in the terminal). This key only exists in the local preview and must never be used on the live site.

The local preview uses an in-memory SQLite database. Reports and applications submitted during a preview are cleared when the local server stops.

## Forms work with or without the backend

Reports and staff applications call `/api/reports` and `/api/applications`. If the API or D1 database is not deployed (for example on a plain static host), the visitor sees no error: the submission is saved on their device, shown as a ready-to-send message with Copy and Open Discord buttons, and re-sent automatically once the API becomes healthy.

To enable the real private inbox, open `/api/health` on your site. It reports `"forms": true` when D1 is bound and `schema.sql` is applied. If it says otherwise, follow the Cloudflare steps below.

## Main features

- Interactive "Play on CrownPVP" card with a Minecraft multiplayer mock-up: Done (copy IP) copies the address and adds the live server (players, MOTD) to the list.
- Live status with 60 second auto-refresh, scroll progress bar, back-to-top button and reveal animations.
- Gold calculator on the store, searchable FAQ, recent player searches on the stats page, form draft autosave and character counters.

- CrownPVP home page with the supplied cinematic battle artwork, a subtle animated camera-drift background, reduced-motion support, and a server-join panel that copies `play.crownpvp.eu`.
- Partnership announcement in the top bar, linked to the supplied Discord channel.
- Clean public URLs (`/store`, `/client`, `/staff`, `/rules`, `/stats`, `/support`, etc.). Old `.html` paths redirect to the clean versions.
- Crown Client page is intentionally text-led with no hero/gameplay image. It distinguishes planned Free and Premium features and does not claim ban bypass or a working VPN.
- Separate OpFactions, other game mode and Discord rules. The original detailed OpFactions rules data is retained.
- Public player, faction and bug reports with a redesigned responsive report experience; all report details are visible only in the private owner inbox. The owner can read, reply, and set new/reviewing/resolved/dismissed status.
- Staff applications with requested openings: Admin 3, Moderator 2, Helper 3 and Trial Staff 5. The owner can read applications, save private replies and decide pending/reviewing/accepted/denied. Accepted applications consume an available slot and the accepted Minecraft username is added to the public staff roster.
- Player stats lookup supports searching a different Minecraft username. Stats data still comes from the server sync endpoint; searching does not invent missing statistics.
- Tebex cart, punishments and other existing pages remain in the project.

## Cloudflare Pages deployment

Deploy the contents of the `crownpvp/` directory to Cloudflare Pages. Use no build command and set the output directory to `.`. The included `functions/api/[[path]].js` is the Pages Functions API route.

### 1. Create / bind D1

Create the D1 database named `crownpvp`, update `database_id` in `wrangler.toml`, then apply the schema:

```bash
wrangler d1 execute crownpvp --remote --file=schema.sql
```

For an existing database, this schema uses `CREATE TABLE IF NOT EXISTS` for the new private message and staff application tables; it does not delete current punishments, appeals, reports or stats.

### 2. Add required Cloudflare secrets

In Cloudflare Pages → your project → Settings → Variables and Secrets, add:

- `REPORT_OWNER_KEY` — a long, random secret used to unlock `/owner`. Generate a new value for production and keep it private.
- `SYNC_TOKEN` — shared secret for punishments/stats sync tools.
- `TRACE_FINGERPRINT_SECRET` — dedicated random key for trace-only IP fingerprints; do not reuse other secrets.

Optional:

- `REPORT_OWNER_NAME` — display name saved on private owner replies (defaults to `Owner`).
- `DISCORD_WEBHOOK` — webhook URL for the existing appeal notification.
- `SESSION_SECRET`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` — only required if you re-enable the account / Microsoft sign-in features.
- `TEBEX_PUBLIC_TOKEN` — public Tebex Headless API token for the backend checkout flow, if you use it.

Do not put `REPORT_OWNER_KEY`, `SYNC_TOKEN`, `TRACE_FINGERPRINT_SECRET`, Microsoft client secrets or Tebex private API keys in `js/config.js` or any public HTML/JavaScript file.

### 3. Public settings

Edit `js/config.js` to update the server IP, Discord invite, partnership/support channel, status API and Tebex package IDs/URLs. The store currently uses example package URLs; add your real Tebex package IDs or URLs before accepting payments. Do a test checkout before launch.

### 4. Private owner inbox

Open `https://YOURDOMAIN/owner` and enter the production `REPORT_OWNER_KEY`. The key is held in page memory for the current visit and is not placed in public JavaScript or local storage. Reports and staff applications can be opened from the two tabs. Reports may include a Discord contact, and staff applications require one. Owner replies are saved as private inbox history; this project does not send Discord DMs automatically. Use the supplied Discord contact for follow-up.

Keep `/owner` private and use HTTPS. The key is checked by the server on every inbox request. Never share it with staff members who should not read all private reports/applications.

## Punishments (LiteBans) on GitHub Pages + Namecheap

No Cloudflare needed. `.github/workflows/pages.yml` runs every 10 minutes: it reads your LiteBans MySQL database (`litebans-sync/sync-litebans.py --export`), writes `ban.json`, `mute.json`, `warn.json`, `kick.json` (newest 10,000 of each, no IP addresses), and publishes the site to GitHub Pages. `/punishments` reads those files.

1. Put the whole project in a GitHub repo (branch `main`). GitHub Pages is free only for **public** repos. That is safe here because no password is stored in any file, but never upload `litebans-sync/.env`.
2. Repo > Settings > Secrets and variables > Actions: add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASS`.
3. Repo > Settings > Pages > Source: **GitHub Actions**.
4. Repo > Actions > "Publish site" > Run workflow. When it is green, the site is live at `https://<username>.github.io/<repo>/`.
5. Domain: Pages > Custom domain. In Namecheap > Advanced DNS add four A records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a CNAME `www` pointing to `<username>.github.io`. Then tick "Enforce HTTPS".

If the workflow fails at "Export punishments", the database is not reachable from GitHub: enable remote access for the database in your Minecraft host's panel.

Reports, staff applications, appeals, sign-in and Tebex checkout need the backend in `functions/` (Cloudflare Pages + D1) and do not run on GitHub Pages. To use the backend instead, set `punishmentsData: ""` in `js/config.js` and use `sync-litebans.py` without `--export` (it pushes to `SITE_URL`).

## Player stats sync

Player stats are not fabricated. Apply `schema.sql`, then send real player data from your server to `POST /api/stats/sync` using the `SYNC_TOKEN` secret:

```bash
curl -X POST https://YOURDOMAIN/api/stats/sync \
  -H "Authorization: Bearer $SYNC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"players":[{"uuid":"069a79f4-44e9-4726-a5be-fca90e38aaf5","name":"Notch","gold":12500,"kills":40,"deaths":9,"playtime":86400,"last_seen":1760000000000}]}'
```

`playtime` is in seconds and `last_seen` is in milliseconds. Send up to 500 player records per request. The stats page accepts any valid Minecraft username, but a player's numbers appear only after that player has been synced.

## Tebex store

Set package IDs or public package URLs in the `tebex` map in `js/config.js`. If using Headless checkout, set the appropriate public Headless token in `js/config.js` only if it is specifically designated by Tebex as safe for browser use; otherwise configure the server-side `TEBEX_PUBLIC_TOKEN` secret and use the backend checkout route. The included store configuration still contains placeholders until you add your real packages. Store purchases are not ready until this is configured and tested.

## Crown Client

Crown Client is presented as an upcoming project only. There is no download in this website. Java 1.8+ and 1.21+ are target compatibility ranges, not a verified release matrix. The Premium Raid Menu is a planned optional feature. No VPN service, ban bypass or anti-cheat bypass is advertised.

## Staff page, Vote page and Support tickets (latest update)

- **Staff page**: Owner (MedicalWeed), Co-owner (ksa_70007) and the Developer (Raizukennn, Discord `Rairai.32`) are set in `js/config.js` (`leadership`, `developer`). The "staff online" counter was removed. Other staff still come from the database.
- **Players page** (`/player`): searching a username shows the 3D skin (walk / run / idle / still, download skin). Total playtime was removed. The old Player stats page now redirects here.
- **Vote page** (`/vote`): the 4 voting links live in `js/config.js` (`voteSites`). The 24h tracker is a personal reminder stored in the visitor's browser and does not verify votes. A "Top voters" list needs vote data from your server (Votifier), so it is not included.
- **Discord card** (home page): shows online and member counts from your invite, and member avatars from the Discord server widget. Turn the widget on in Discord > Server Settings > Widget > Enable Server Widget. The server ID is `discordGuildId` in `js/config.js`.
- **Merchandise** (`/merch`): the product list is `merch` in `js/config.js`. Orders go through a ticket with the topic "Buy merchandise" (re-run `supabase/support-tickets.sql` once so the database accepts that topic).
- **Ranks**: run `supabase/fix-ranks.sql` once to put MedicalWeed on Owner, ksa_70007 on Co-Owner and Raizukennn on Developer. The Staff page also has an "Add a player to a role" panel for ranks with the manage-staff permission.
- **Theme**: `css/minecraft.css` is the Minecraft look (pixel buttons, bevelled panels, grass strips, welcome toast). Remove its `<link>` from a page to turn it off there.
- **Home hub**: the news feed is `news` in `js/config.js` (newest first, add or edit entries there). The hero has a PLAY NOW button plus live player and Discord count pills.
- **Join boosters**: a follow-along "Play now" bar, a "Claim the crown" call-to-action above every footer, and a Minecraft-style pop-up when someone copies the IP (all in `js/features.js` and `css/minecraft.css`).
- **Partnership**: the top-bar link opens a ticket with the topic "Partnership". Re-run `supabase/support-tickets.sql` once so the database accepts that topic.
- **Is the new version live?** Scroll to the footer. It should say "Site v8". If it does not, the new files are not published yet (check GitHub > Actions).
- **Support tickets** (`/tickets`): topics are in `js/config.js` (`ticketTopics`). Run `supabase/support-tickets.sql` once in Supabase > SQL Editor, after `network-upgrade.sql`. Players must be signed in. Staff with report access see an "All tickets" tab and can reply or close tickets.

## Important launch checklist

- [ ] Apply `schema.sql` to the production D1 database.
- [ ] Configure `REPORT_OWNER_KEY` and `SYNC_TOKEN` as Cloudflare secrets.
- [ ] Open `/owner` and test the private inbox.
- [ ] Submit one test report and one test staff application, then test owner replies and decisions.
- [ ] Confirm the staff roster reflects actual filled roles before accepting successful applications.
- [ ] Add real Tebex package IDs/URLs and complete a test checkout.
- [ ] Confirm the live server IP and Discord invite.
- [ ] Connect your Minecraft server to `/api/stats/sync` before advertising live balances or leaderboards.


## Visual refresh and verification

The supplied CrownPVP battle artwork remains in the homepage hero. Shared page backgrounds are now static charcoal/black while scrolling, without the former animated/parallax backdrop. The report form and private owner inbox also have a refreshed dark charcoal, muted gold and crimson interface.

The updated project was smoke-tested locally on 21 November 2026:
- Home and report pages returned HTTP 200.
- The optimized background image and stylesheet returned HTTP 200.
- All 17 JavaScript files passed `node --check`.
- The local report API accepted a test report, returned it to the owner inbox, and accepted a status change and private reply.

These local tests do not configure your live Cloudflare account. For live report delivery, deploy the `crownpvp/` folder to Cloudflare Pages, bind the D1 database as `DB`, apply `schema.sql`, and set the production `REPORT_OWNER_KEY` and `SYNC_TOKEN` secrets as described above. The local preview database is temporary and is not your live database.

## 2026 v3 visual and responsive update
The shared shell now loads `css/crown-v3.css` last, giving the pages a consistent dark-and-gold network theme and fixing the mobile navigation open/close behavior. The Social Hub keeps its floating friends/messages panel and homepage community card. The player profile page now includes a four-part profile stats strip and a persisted Like profile button; signed-in players can like another account once, unlike it later, and see the public total. Self-likes are blocked.

## Social Hub (friends, private messages and live presence)
Apply `supabase/social-hub.sql` after `setup.sql`, `network-upgrade.sql`, `news-social.sql` and `profiles-upgrade.sql`. It adds friend requests, accepted friendships, one-to-one private messages, friend online/offline status, the active website visitor count, and persisted profile likes. Each signed-in account can like another player's profile once and can remove that like; profile owners cannot like themselves. Re-run this same SQL file on an existing installation to add the likes migration safely. The floating Community control appears on every page; the homepage also has a Community Hub card in the right sidebar. Player names in news comments now open their public profiles, where visitors can send friend requests or message existing friends.

The active count measures browser sessions with a recent heartbeat (three-minute window), not verified Minecraft server connections. Friend presence is for signed-in website accounts only. Direct messages are limited to accepted friends.

## Network upgrade (reports, appeals, staff dashboard, team, player profiles, CrownClient)
These pages run on GitHub Pages + Supabase (not the Cloudflare functions): `support.html` (reports), `appeals.html`, `dashboard.html` (staff only), `staff.html`, `player.html`, `client.html`. Setup: `supabase/network-upgrade.sql` (see `supabase/README.md`, section 7). CrownClient shows COMING SOON until you set `CROWN.client.status = "released"` and real https links in `js/config.js`. Theme: `css/kingdom.css`.


## 2026 Realm UI redesign
The visual redesign is loaded from `css/realm-redesign.css` and `js/realm-polish.js`. It is a progressive visual layer and does not change Supabase, SQL, authentication, API routes, or backend behavior.


## CrownPVP Services project intake (separate from support tickets)

The `/services` page uses `POST /api/service-tickets` and stores commissions in the dedicated Cloudflare D1 table `service_project_tickets`. It does not call the support-ticket page, the Supabase support-ticket tables, or the player support workflow.

Before accepting live requests, apply `server/service-project-tickets.sql` to the Cloudflare D1 database bound as `DB` (the same Cloudflare D1 binding used by the site's API, but a separate table and route). Optional: set `SERVICE_TICKET_WEBHOOK` to a private Discord webhook URL to receive new project-request notifications. Owner-only retrieval is available at `GET /api/service-tickets` with the existing `x-owner-key` header (`REPORT_OWNER_KEY`). Never expose that key in browser code.

## Private Minecraft account trace

### Public username-to-UUID lookup (Python)

For a standalone terminal lookup of public profile details only:

```powershell
cd .\crownpvp
py .\mc_profile.py Notch
```

This calls Mojang's public profile endpoint and prints the current username and UUID. It does not query Pika Network, locate IP addresses, or discover alternate accounts. Python 3.8+ is required; there are no third-party packages.

The browser version is available at `/public-profile.html`. It shows the same public name and UUID lookup and explicitly marks faction history and account links as unavailable from the public profile service.

`/trace` is a private Pika Network investigation workspace. The page is static on GitHub Pages; its authenticated API runs as a Supabase Edge Function and reads the private `mc_trace_*` tables with the server-only service role. No Cloudflare Worker, D1 database, or Cloudflare authentication is needed for trace. `/trace.html` redirects to the clean route; the static fallback is used by GitHub Pages, while `.htaccess` provides an HTTP redirect on Apache hosting.

To enable the trace backend:

1. Apply `../supabase/trace-api.sql` in the Supabase SQL Editor. It creates missing tables and service-only helper functions without deleting existing rows.
2. Link this repository to the same Supabase project used by `js/config.js`, then deploy the Edge Function:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy trace-api --no-verify-jwt
   ```

3. In Supabase Edge Function secrets, set `TRACE_OWNER_KEY` to the owner password, `TRACE_SESSION_SECRET` to a random secret of at least 32 characters, `TRACE_SYNC_TOKEN` to a separate ingestion secret, and `TRACE_FINGERPRINT_SECRET` to a separate random fingerprint key. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase. Never place any of these secrets in GitHub files or browser configuration.
4. Publish the site through the existing GitHub Pages workflow and open `https://crownpvp.com/trace`. The browser sends the password only to the HTTPS Edge Function during login; the function returns a short-lived signed session, never the password. Sessions are held in memory and expire after 30 minutes. Five failed attempts from one address are rate-limited for 15 minutes.

The existing trace tables in Supabase are reused. The SQL does not delete or overwrite existing trace rows. If the only copy of prior records is in the old D1 database, export and import those records into Supabase before retiring that database; this project cannot migrate remote D1 data without database credentials.

This workspace does not connect directly to Pika Network logs in this repository. Configure a trusted bridge on a server you administer to submit only records it is authorized to process to `POST /functions/v1/trace-api/sync` on your Supabase project:

```json
{
  "records": [
    {
      "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
      "name": "ExamplePlayer",
      "logins": [
        { "at": 1760000000000, "ip": "ADDRESS_FROM_AUTHORIZED_LOG" }
      ]
    }
  ]
}
```

Send that JSON with `Authorization: Bearer $TRACE_SYNC_TOKEN` and `Content-Type: application/json` to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/trace-api/sync`. `at` is a Unix timestamp in milliseconds. Use real authorized records only; the example identity and timestamp are illustrative and are not dashboard data. Batches support up to 500 player records and 2,000 login events. The bridge must transmit over HTTPS and must not accept client-supplied log data as verified server evidence.

For privacy, raw IP addresses are HMAC-fingerprinted with the server-side `TRACE_FINGERPRINT_SECRET` during ingestion and then discarded; they are never returned by the API or shown in the report. Rotating this key changes fingerprints, so previously imported records will no longer correlate with new ones. Correlation suggestions require both a repeated shared fingerprint and login overlaps within 30 minutes on at least three separate days in the last 90 days. A shared IP/network alone never generates a suspected alternate. Suggestions are investigative leads, not proof, and shared households, schools, VPNs, or public networks can explain overlaps.

The dashboard's account, connection, and conversation totals reflect only data in D1. When no log bridge is configured, the connection history and correlations remain empty and IP information is clearly unavailable. Conversation records and private investigation notes are administrator-entered and linked to an imported trace record or existing synced player-stat profile; private messages are not read or extracted.
