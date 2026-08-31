# Supabase setup

The marketing site stays static. Auth, database and file storage live in a
Supabase project. Do this once.

## 1. Create the project
1. https://supabase.com → **New project**. Note the region and database password.
2. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key**

## 2. Fill in config.js
```bash
cp config.example.js config.js
```
Put the URL and key into `config.js`. It is git-ignored. The anon/publishable
key is meant to be public — Row-Level Security protects the data.

## 3. Run the schema
Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, run it.
It creates all tables, policies, triggers, the two storage buckets and an
`admin_overview` view. It's safe to re-run.

If bucket creation is blocked on your plan, create them by hand in
**Storage → New bucket** — names `documents` and `kyc`, both **private** — then
re-run the schema (the policies will attach).

## 4. Auth settings
**Authentication → Providers → Email**: enable it.
- **Confirm email: OFF** — under *Sign In / Providers → Email*. New accounts are
  usable right after sign-up (no email link, no approval step).
- **Authentication → URL Configuration → Site URL**: set to where the site runs
  (e.g. `http://localhost:8000` for local dev, your real domain in production).
  Add both to **Redirect URLs** if you use password reset.

## 5. Make yourself an admin
1. Start the site, open `/signup`, create your account.
2. In **SQL Editor** run (with your email):
   ```sql
   update public.profiles
     set role = 'admin', status = 'active', approved_at = now()
   where email = 'you@example.com';
   ```
3. Sign in at `/login` → you land on `/admin`.

## 6. Everyday flow
- Clients self-register at `/signup` and can sign in immediately. They show up in
  **Admin → Clients**, where you can **Suspend** an account if needed.
- **Admin → Safe Boxes**: create boxes, **Assign** to a client.
- **Admin → Documents**: upload SKRs / statements. Set **visibility**:
  - `public` — anyone can verify it at `/verify-receipt` by reference number.
  - `client` — only the assigned **Owner client** sees it in their dashboard.
  - `internal` — admins only.
- Clients use `/dashboard` for their box, documents, requests and KYC uploads.

## Local development
`config.js` points at the cloud project, so the Python static server
(`scratchpad/serve.py`) is enough to run everything locally. Keep the browser on
one host (`localhost` **or** `127.0.0.1`) and set that as the Supabase Site URL.
