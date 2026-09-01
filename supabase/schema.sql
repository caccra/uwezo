-- =============================================================================
-- Uwezo Security — database schema, security policies, triggers, storage
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL -> New query).
-- Safe to re-run: it drops and recreates its own objects.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role     as enum ('client', 'admin');
  create type user_status   as enum ('pending', 'active', 'rejected', 'suspended');
  create type box_status     as enum ('available', 'occupied', 'maintenance');
  create type doc_visibility as enum ('public', 'client', 'internal');
  create type request_type   as enum ('deposit', 'withdrawal', 'release', 'access');
  create type request_status as enum ('open', 'approved', 'denied', 'completed');
  create type kyc_status      as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text        not null,
  full_name    text,
  phone        text,
  company      text,
  role         user_role   not null default 'client',
  status       user_status not null default 'pending',
  created_at   timestamptz not null default now(),
  approved_at  timestamptz,
  approved_by  uuid references public.profiles(id)
);

create table if not exists public.safe_boxes (
  id           uuid primary key default gen_random_uuid(),
  box_number   text unique not null,
  size         text,                       -- Small | Medium | Large | Vault
  location     text,
  monthly_fee  numeric(12,2) default 0,
  currency     text default 'USD',
  status       box_status not null default 'available',
  assigned_to  uuid references public.profiles(id) on delete set null,
  assigned_at  timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_boxes_assigned on public.safe_boxes(assigned_to);

create table if not exists public.holdings (
  id             uuid primary key default gen_random_uuid(),
  box_id         uuid not null references public.safe_boxes(id) on delete cascade,
  description    text not null,
  category       text,
  declared_value numeric(14,2) default 0,
  currency       text default 'USD',
  added_at       timestamptz not null default now(),
  added_by       uuid references public.profiles(id)
);
create index if not exists idx_holdings_box on public.holdings(box_id);

create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  reference    text unique not null,
  title        text not null,
  category     text,
  visibility   doc_visibility not null default 'internal',
  customer     text,
  commodity    text,
  issue_date   date,
  status       text,
  purpose      text,                        -- reason for the deposit / custody
  description  text,
  file_path    text,                        -- object path in the 'documents' storage bucket
  file_name    text,
  file_size    bigint,
  owner_id     uuid references public.profiles(id) on delete set null,   -- which client it belongs to
  box_id       uuid references public.safe_boxes(id) on delete set null,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_documents_owner on public.documents(owner_id);
create index if not exists idx_documents_ref   on public.documents(lower(reference));
-- additive migration for existing databases
alter table public.documents add column if not exists purpose text;

create table if not exists public.requests (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles(id) on delete cascade,
  box_id         uuid references public.safe_boxes(id) on delete set null,
  type           request_type not null,
  details        text,
  preferred_date date,
  status         request_status not null default 'open',
  admin_note     text,
  handled_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_requests_client on public.requests(client_id);
create index if not exists idx_requests_status on public.requests(status);

create table if not exists public.kyc_documents (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles(id) on delete cascade,
  doc_type    text not null,               -- National ID | Passport | Proof of address | Other
  file_path   text not null,
  file_name   text,
  file_size   bigint,
  status      kyc_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists idx_kyc_client on public.kyc_documents(client_id);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_email text,
  action      text not null,               -- e.g. 'insert' | 'update' | 'delete'
  entity      text not null,               -- table name
  entity_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on public.audit_log(created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- create the profile row whenever a new auth user signs up.
-- status 'active' = no admin approval step; admins can still suspend/reject later.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, company, role, status)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'company', ''),
    'client',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists t_boxes_touch     on public.safe_boxes;
drop trigger if exists t_documents_touch on public.documents;
drop trigger if exists t_requests_touch  on public.requests;
create trigger t_boxes_touch     before update on public.safe_boxes for each row execute function public.touch_updated_at();
create trigger t_documents_touch before update on public.documents  for each row execute function public.touch_updated_at();
create trigger t_requests_touch  before update on public.requests   for each row execute function public.touch_updated_at();

-- audit-log writer (attached to the tables we care about)
create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  eid text;
  em  text;
begin
  select email into em from public.profiles where id = auth.uid();
  eid := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'));
  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, meta)
  values (
    auth.uid(), em, lower(tg_op), tg_table_name, eid,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists a_boxes    on public.safe_boxes;
drop trigger if exists a_docs     on public.documents;
drop trigger if exists a_requests on public.requests;
drop trigger if exists a_profiles on public.profiles;
drop trigger if exists a_kyc      on public.kyc_documents;
create trigger a_boxes    after insert or update or delete on public.safe_boxes    for each row execute function public.write_audit();
create trigger a_docs     after insert or update or delete on public.documents     for each row execute function public.write_audit();
create trigger a_requests after insert or update or delete on public.requests      for each row execute function public.write_audit();
create trigger a_profiles after update              on public.profiles      for each row execute function public.write_audit();
create trigger a_kyc      after insert or update or delete on public.kyc_documents for each row execute function public.write_audit();

-- ---------------------------------------------------------------------------
-- 4. Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.safe_boxes    enable row level security;
alter table public.holdings      enable row level security;
alter table public.documents     enable row level security;
alter table public.requests      enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.audit_log     enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists p_profiles_self_read   on public.profiles;
drop policy if exists p_profiles_admin_read  on public.profiles;
drop policy if exists p_profiles_self_update on public.profiles;
drop policy if exists p_profiles_admin_all   on public.profiles;

create policy p_profiles_self_read on public.profiles
  for select using (id = auth.uid());
create policy p_profiles_admin_read on public.profiles
  for select using (public.is_admin());
create policy p_profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role   = (select role   from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  );
create policy p_profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- safe_boxes --------------------------------------------------------------
drop policy if exists p_boxes_client_read on public.safe_boxes;
drop policy if exists p_boxes_admin_all   on public.safe_boxes;
create policy p_boxes_client_read on public.safe_boxes
  for select using (assigned_to = auth.uid());
create policy p_boxes_admin_all on public.safe_boxes
  for all using (public.is_admin()) with check (public.is_admin());

-- holdings --------------------------------------------------------------
drop policy if exists p_holdings_client_read on public.holdings;
drop policy if exists p_holdings_admin_all   on public.holdings;
create policy p_holdings_client_read on public.holdings
  for select using (
    exists (select 1 from public.safe_boxes b where b.id = box_id and b.assigned_to = auth.uid())
  );
create policy p_holdings_admin_all on public.holdings
  for all using (public.is_admin()) with check (public.is_admin());

-- documents --------------------------------------------------------------
drop policy if exists p_docs_public_read on public.documents;
drop policy if exists p_docs_client_read on public.documents;
drop policy if exists p_docs_admin_all   on public.documents;
-- anyone (including logged-out visitors) can read PUBLIC documents -> /verify-receipt
create policy p_docs_public_read on public.documents
  for select to anon, authenticated
  using (visibility = 'public');
create policy p_docs_client_read on public.documents
  for select to authenticated
  using (visibility = 'client' and owner_id = auth.uid());
create policy p_docs_admin_all on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- requests --------------------------------------------------------------
drop policy if exists p_req_client_read   on public.requests;
drop policy if exists p_req_client_insert on public.requests;
drop policy if exists p_req_admin_all     on public.requests;
create policy p_req_client_read on public.requests
  for select using (client_id = auth.uid());
create policy p_req_client_insert on public.requests
  for insert with check (
    client_id = auth.uid()
    and status = 'open'
    and (select status from public.profiles where id = auth.uid()) = 'active'
  );
create policy p_req_admin_all on public.requests
  for all using (public.is_admin()) with check (public.is_admin());

-- kyc_documents --------------------------------------------------------------
drop policy if exists p_kyc_client_read   on public.kyc_documents;
drop policy if exists p_kyc_client_insert on public.kyc_documents;
drop policy if exists p_kyc_admin_all     on public.kyc_documents;
create policy p_kyc_client_read on public.kyc_documents
  for select using (client_id = auth.uid());
create policy p_kyc_client_insert on public.kyc_documents
  for insert with check (client_id = auth.uid() and status = 'pending');
create policy p_kyc_admin_all on public.kyc_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- audit_log --------------------------------------------------------------
drop policy if exists p_audit_admin_read on public.audit_log;
create policy p_audit_admin_read on public.audit_log
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Storage buckets + policies
--    (Buckets are created here; if the API rejects that on your plan, create
--     'documents' and 'kyc' as PRIVATE buckets in Dashboard -> Storage instead.)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false), ('kyc', 'kyc', false)
on conflict (id) do nothing;

drop policy if exists s_docs_admin        on storage.objects;
drop policy if exists s_docs_public_files on storage.objects;
drop policy if exists s_docs_client_files on storage.objects;
drop policy if exists s_kyc_admin         on storage.objects;
drop policy if exists s_kyc_client        on storage.objects;

-- admins: full access to both buckets
create policy s_docs_admin on storage.objects
  for all using (bucket_id in ('documents','kyc') and public.is_admin())
  with check (bucket_id in ('documents','kyc') and public.is_admin());

-- anon + clients may read a file in 'documents' only if it backs a PUBLIC document row
create policy s_docs_public_files on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'documents'
    and exists (select 1 from public.documents d where d.file_path = name and d.visibility = 'public')
  );

-- clients may read a file in 'documents' that backs one of THEIR client documents
create policy s_docs_client_files on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.file_path = name and d.visibility = 'client' and d.owner_id = auth.uid()
    )
  );

-- clients upload/read their own KYC files under a folder named after their uid
create policy s_kyc_client on storage.objects
  for select to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy s_kyc_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- 6. OPERATIONS MODULE — Sites, Personnel, Deployments, Incidents, Invoices
--    Covers: Clients > Client Sites; Security Operations > Guard Deployment /
--    Duty Rosters / Shift Management / Site Assignments / Incident Management /
--    Occurrence Book; Personnel > All Guards / Supervisors / Managers; Sites;
--    Finance > Invoices / Outstanding Balances.
-- =============================================================================
do $$ begin
  create type personnel_role    as enum ('guard', 'supervisor', 'manager');
  create type personnel_status  as enum ('active', 'on_leave', 'suspended', 'terminated');
  create type deployment_shift  as enum ('day', 'night', '24hr');
  create type deployment_status as enum ('scheduled', 'active', 'completed', 'cancelled');
  create type incident_severity as enum ('low', 'medium', 'high', 'critical');
  create type incident_status   as enum ('open', 'investigating', 'resolved', 'closed');
  create type invoice_status    as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.sites (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  client_id    uuid references public.profiles(id) on delete set null,
  address      text,
  risk_level   text,                       -- Low | Medium | High
  instructions text,
  equipment    text,
  status       text not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_sites_client on public.sites(client_id);

create table if not exists public.personnel (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  role        personnel_role not null default 'guard',
  phone       text,
  national_id text,
  status      personnel_status not null default 'active',
  site_id     uuid references public.sites(id) on delete set null,
  hire_date   date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_personnel_site on public.personnel(site_id);

create table if not exists public.deployments (
  id           uuid primary key default gen_random_uuid(),
  personnel_id uuid not null references public.personnel(id) on delete cascade,
  site_id      uuid not null references public.sites(id) on delete cascade,
  shift        deployment_shift not null default 'day',
  start_date   date not null,
  end_date     date,
  status       deployment_status not null default 'scheduled',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_deployments_personnel on public.deployments(personnel_id);
create index if not exists idx_deployments_site on public.deployments(site_id);

create table if not exists public.incidents (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid references public.sites(id) on delete set null,
  personnel_id uuid references public.personnel(id) on delete set null,
  occurred_at  timestamptz not null default now(),
  category     text,                       -- Theft | Trespass | Medical | Equipment fault | Other
  severity     incident_severity not null default 'low',
  status       incident_status not null default 'open',
  description  text,
  action_taken text,
  reported_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_incidents_site on public.incidents(site_id);
create index if not exists idx_incidents_status on public.incidents(status);

create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  invoice_no  text unique not null,
  client_id   uuid references public.profiles(id) on delete set null,
  description text,
  amount      numeric(14,2) not null default 0,
  currency    text not null default 'UGX',
  status      invoice_status not null default 'draft',
  issue_date  date not null default current_date,
  due_date    date,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);

-- updated_at + audit triggers (reuses the functions defined above)
drop trigger if exists t_sites_touch       on public.sites;
drop trigger if exists t_personnel_touch   on public.personnel;
drop trigger if exists t_deployments_touch on public.deployments;
drop trigger if exists t_incidents_touch   on public.incidents;
drop trigger if exists t_invoices_touch    on public.invoices;
create trigger t_sites_touch       before update on public.sites       for each row execute function public.touch_updated_at();
create trigger t_personnel_touch   before update on public.personnel   for each row execute function public.touch_updated_at();
create trigger t_deployments_touch before update on public.deployments for each row execute function public.touch_updated_at();
create trigger t_incidents_touch   before update on public.incidents   for each row execute function public.touch_updated_at();
create trigger t_invoices_touch    before update on public.invoices    for each row execute function public.touch_updated_at();

drop trigger if exists a_sites       on public.sites;
drop trigger if exists a_personnel   on public.personnel;
drop trigger if exists a_deployments on public.deployments;
drop trigger if exists a_incidents   on public.incidents;
drop trigger if exists a_invoices    on public.invoices;
create trigger a_sites       after insert or update or delete on public.sites       for each row execute function public.write_audit();
create trigger a_personnel   after insert or update or delete on public.personnel   for each row execute function public.write_audit();
create trigger a_deployments after insert or update or delete on public.deployments for each row execute function public.write_audit();
create trigger a_incidents   after insert or update or delete on public.incidents   for each row execute function public.write_audit();
create trigger a_invoices    after insert or update or delete on public.invoices    for each row execute function public.write_audit();

alter table public.sites       enable row level security;
alter table public.personnel   enable row level security;
alter table public.deployments enable row level security;
alter table public.incidents   enable row level security;
alter table public.invoices    enable row level security;

drop policy if exists p_sites_admin_all    on public.sites;
drop policy if exists p_sites_client_read  on public.sites;
create policy p_sites_admin_all on public.sites
  for all using (public.is_admin()) with check (public.is_admin());
create policy p_sites_client_read on public.sites
  for select using (client_id = auth.uid());

drop policy if exists p_personnel_admin_all on public.personnel;
create policy p_personnel_admin_all on public.personnel
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_deployments_admin_all on public.deployments;
create policy p_deployments_admin_all on public.deployments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_incidents_admin_all on public.incidents;
create policy p_incidents_admin_all on public.incidents
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_invoices_admin_all   on public.invoices;
drop policy if exists p_invoices_client_read on public.invoices;
create policy p_invoices_admin_all on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());
create policy p_invoices_client_read on public.invoices
  for select using (client_id = auth.uid());

-- let a client see the personnel/deployments currently at THEIR sites ("My Security Team")
drop policy if exists p_personnel_client_read on public.personnel;
create policy p_personnel_client_read on public.personnel
  for select using (site_id in (select id from public.sites where client_id = auth.uid()));

drop policy if exists p_deployments_client_read on public.deployments;
create policy p_deployments_client_read on public.deployments
  for select using (site_id in (select id from public.sites where client_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. Convenience view for the admin overview
--    (placed after the operations module so it can count sites/personnel/etc.)
-- ---------------------------------------------------------------------------
create or replace view public.admin_overview
  with (security_invoker = on) as
  select
    (select count(*) from public.profiles where role='client')                     as clients_total,
    (select count(*) from public.profiles where role='client' and status='pending') as clients_pending,
    (select count(*) from public.safe_boxes)                                        as boxes_total,
    (select count(*) from public.safe_boxes where status='available')               as boxes_available,
    (select count(*) from public.documents)                                         as documents_total,
    (select count(*) from public.requests where status='open')                      as requests_open,
    (select count(*) from public.sites)                                             as sites_total,
    (select count(*) from public.personnel where status='active')                   as personnel_active,
    (select count(*) from public.deployments where status in ('scheduled','active')) as deployments_active,
    (select count(*) from public.incidents where status in ('open','investigating')) as incidents_open,
    (select count(*) from public.invoices where status in ('sent','overdue'))       as invoices_outstanding;

-- =============================================================================
-- 8. NOTIFICATIONS — client-facing alerts, pushed by an admin
-- =============================================================================
do $$ begin
  create type notification_type as enum ('info', 'alert', 'success', 'warning');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.profiles(id) on delete cascade,  -- null = broadcast to all clients
  title      text not null,
  body       text,
  type       notification_type not null default 'info',
  read       boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_client on public.notifications(client_id);

alter table public.notifications enable row level security;

drop policy if exists p_notif_client_read   on public.notifications;
drop policy if exists p_notif_client_update on public.notifications;
drop policy if exists p_notif_admin_all     on public.notifications;
create policy p_notif_client_read on public.notifications
  for select using (client_id = auth.uid() or client_id is null);
create policy p_notif_client_update on public.notifications
  for update using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy p_notif_admin_all on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- keep profiles.email in sync once a client actually confirms an email change
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- =============================================================================
-- 9. AFTER RUNNING: promote your own account to admin
--    (sign up once through /signup first, then run:)
--
--    update public.profiles
--      set role = 'admin', status = 'active', approved_at = now()
--    where email = 'you@example.com';
-- =============================================================================
