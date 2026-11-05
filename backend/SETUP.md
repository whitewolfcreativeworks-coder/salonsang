# Salon Sang appointments: setup

Everything is built and tested. These are the only steps that need a person (about 15 minutes), then we connect Sang's iPhone.

## 1. Create the free Supabase project (Jason)
1. Go to **supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**: name `salon-sang`, region **West US (Oregon)**, make a strong database password (save it somewhere safe). Free plan.
3. Wait about a minute for it to finish setting up.

## 2. Install the backend
1. Left menu → **SQL Editor** → **New query**.
2. Paste the whole of `backend/salon-sang.sql` → **Run**. It should say *Success*.
3. New query, paste this with Sang's real email, **Run**:
   ```sql
   update private.config set owner_emails = array['SANGS-EMAIL@example.com'];
   ```

## 3. Sang's login
1. **Authentication → Users → Add user → Create new user**: Sang's email + a password, tick **Auto Confirm User**.
2. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up" (only Sang should have an account).
3. **Authentication → URL Configuration**: Site URL `https://salonsang.com`, and add `https://salonsang.com/portal/` under Redirect URLs.

## 4. Send Claude two values
**Project Settings → API keys / Data API**:
- **Project URL** (looks like `https://abcd1234.supabase.co`)
- the **anon** / **publishable** key (it's safe to share; the database rules protect everything)

Claude puts them in `src/config.js`, rebuilds and pushes. Then **Book online** appears on salonsang.com and the portal goes live at salonsang.com/portal.

## 5. Sang's iPhone
Follow **salonsang.com/portal/setup.html** (home-screen app, ntfy alerts, the "Salon Sang texts" shortcut + hourly automations).

## How it works
- `salon-sang.sql` creates the tables, the security rules (row-level security: the public can only read the menu, see free times and book one; only Sang's login sees appointments), the booking and reminder logic, and a 15-minute housekeeping job.
- Texts are queued in `messages`. Confirmations are due right away; reminders ~4 hours before (setting), never before 8 AM. The iPhone shortcut fetches due texts (`rpc/phone_outbox` with the secret phone key), sends them from Sang's number, and marks each sent (`rpc/phone_sent`). Message wording is written fresh at send time, so "today/tomorrow" is always right.
- New online bookings alert Sang through ntfy.sh (free, open source) with a secret topic name.
- Free-tier note: Supabase pauses projects after 7 days without activity; the hourly shortcut keeps it awake.

## Tests
`npm run test:backend` runs the SQL in a real Postgres (PGlite) and checks slots, double-booking, privacy, reminder timing, the phone outbox and cancellations.

## Preview
`salonsang.com/?demo` (booking) and `salonsang.com/portal/?demo` (portal) run on pretend data in the browser; nothing is saved or sent.
