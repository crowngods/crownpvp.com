# CrownPVP accounts + alerts setup (about 10 minutes, free)

Players create an account on your website and get alerts in a bell menu. Accounts are stored in Supabase (free plan is enough to start). Passwords are handled and hashed by Supabase, never by your site.

## 1. Create the Supabase project
1. Go to https://supabase.com, sign up, click **New project**.
2. Name it `crownpvp`, set a database password (save it somewhere, you will not need it on the site), pick the region closest to your players, click Create.

## 2. Create the tables
1. In the project, open **SQL Editor** > **New query**.
2. Open `supabase/setup.sql` from this repo, copy everything, paste it in, click **Run**. It should say "Success".

## 3. Allow your website address
Open **Authentication** > **URL Configuration**:
- **Site URL**: `https://yourdomain.com`
- **Redirect URLs**: add `https://yourdomain.com/**`
(Use your real domain. This is what makes the email confirm and password reset links work.)

Optional: **Authentication** > **Sign In / Providers** > **Email**: turn **Confirm email** off if you want players to sign up without confirming. Leave it on to stop fake email addresses (recommended). Supabase's built-in email sending has low limits, so if many players sign up, set up your own SMTP (Authentication > Emails > SMTP Settings).

## 4. Connect the website
1. In Supabase open **Project Settings** > **API**.
2. Copy the **Project URL** and the **anon public** key.
3. Paste them into `crownpvp/js/config.js`:
   ```js
   supabaseUrl: "https://xxxxxxxx.supabase.co",
   supabaseKey: "eyJ...your anon public key...",
   ```
   NEVER paste the `service_role` key anywhere on the website.
4. Commit/upload to GitHub. The site republishes and a **Sign in** button appears in the menu.

## 5. Make yourself staff
1. On your website, click **Sign in** > **Create account** and make your own account.
2. In Supabase **SQL Editor** run (put your username in):
   ```sql
   update public.profiles set is_staff = true where lower(username) = lower('YourName');
   ```
3. Open the **Alerts** page on the site. You now see a **Send an alert** form: send to one username, or leave "To" empty to send to everyone.

## 6. Appeals and reports (optional but recommended)
1. In **SQL Editor** > **New query**, paste everything from `supabase/appeals-and-reports.sql` and click **Run** ("Success. No rows returned"). It is safe to run again.
2. `appeals.html` now lets signed-in players send an appeal, and `support.html` lets them send a report. Only the sender and staff can read them. Staff get a **Staff review** tab on both pages to approve/decline appeals and start/resolve/dismiss reports, and the player gets an alert on the bell.
3. Approving an appeal does not unban anyone in game. Lift the ban or mute yourself.


## 7. Network upgrade: ranks, reports, ban appeals, audit log (run `network-upgrade.sql`)
1. **SQL Editor > New query**, paste everything from `supabase/network-upgrade.sql`, click **Run**. It is safe to run again and never deletes data. Anyone who was already staff becomes **Admin**; old reports/appeals stay in their old tables (untouched, no longer shown).
2. Make yourself Owner (your own website username):
   ```sql
   update public.profiles set staff_rank = 'owner' where lower(username) = lower('YourName');
   ```
   (The old `is_staff = true` trick no longer works: `is_staff` is now derived from `staff_rank`.)
3. Open **Staff dashboard** (`dashboard.html`). Owner and Co-Owner get a **Staff** tab to assign ranks to people who have a website account. Slots: 1 Owner, 1 Co-Owner, 2 Manager, 3 Admin, 3 Moderator, 3 Helper, 3 Media. `developer` is a permission rank (reviews cases) and is not shown on the public team page.
4. Who can do what lives in the `rank_permissions` table (Table Editor). Defaults: Owner/Co-Owner everything; Manager reports + appeals + audit log + change decisions; Admin reports + appeals; Developer reports + appeals + audit log; Moderator decide reports, read appeals; Helper read reports and mark them under review; Media nothing. Give one person an extra permission with `update public.profiles set extra_perms = '{appeals_decide}' where lower(username)=lower('Name');`
5. Evidence uploads use a **private** storage bucket called `evidence` (created by the script; PNG/JPG/WEBP/GIF/MP4/WEBM, 25 MB each, 5 per case).

### LiteBans data for player profiles
The GitHub Action already runs `sync-litebans.py --export`. It now also writes `players.json` (first join, last seen, latest name; never IPs). LiteBans does not track playtime, so the profile says "Not tracked" unless you set `PLAYTIME_TABLE` in the sync `.env`.
