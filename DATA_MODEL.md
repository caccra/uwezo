# Data model

Backend: **Supabase** (Postgres + Auth + Storage). All rules live in
`supabase/schema.sql`. Setup steps in `supabase/README.md`.

## Roles & status
- `profiles.role` — `client` | `admin`
- `profiles.status` — `active` (default) | `suspended` | `rejected` | `pending`
- New sign-ups land as `client` / `active` — no approval step (trigger `handle_new_user`).
  Admins can still `suspend` an account. Re-enable approval by changing the trigger
  to insert `'pending'`.
- First admin is promoted with one SQL statement (see README).

## Tables
| Table | Who can read | Who can write |
|---|---|---|
| `profiles` | own row; admins all | own row (not role/status); admins all |
| `safe_boxes` | client if `assigned_to = me`; admins all | admins |
| `holdings` | client if the box is theirs; admins all | admins |
| `documents` | anyone → `visibility='public'`; client → own `visibility='client'`; admins all | admins |
| `requests` | client → own; admins all | client inserts own (status forced `open`); admins update |
| `kyc_documents` | client → own; admins all | client inserts own; admins review |
| `audit_log` | admins | DB triggers only |

## Storage buckets (private)
- `documents/<uuid>-<name>` — SKRs, statements. Served via short-lived signed URLs.
  Anon can fetch a file only if it backs a `public` document row.
- `kyc/<user-id>/<name>` — client identity uploads. Client + admins only.

## Document visibility
| visibility | seen by | where |
|---|---|---|
| `public` | everyone, logged out | `/verify-receipt` (by reference), file downloadable |
| `client` | the `owner_id` client | `/dashboard` → Documents |
| `internal` | admins | `/admin` → Documents |

## Pages
| Route | Guard | Purpose |
|---|---|---|
| `/signup` | — | client self-registration |
| `/login` | — | sign in; routes admin→`/admin`, active client→`/dashboard` |
| `/dashboard` | client, active | Safe Box · Documents · Requests · Profile & KYC |
| `/admin` | admin | Overview · Clients · Safe Boxes · Documents · Requests · Audit Log |
| `/verify-receipt` | — | public reference lookup against `documents` where `visibility='public'` |

## Front-end files
- `config.js` (git-ignored) — `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `assets/supabase-client.js` — builds `window.sb`
- `assets/auth.js` — `UwezoAuth.requireRole()`, `getProfile()`, `signOut()`
- `assets/ui.js` — DOM/format helpers, toast, modal, signed-URL download
- `assets/admin-app.js` — all `/admin` logic
- `dashboard.html` — self-contained client dashboard logic
