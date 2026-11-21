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
