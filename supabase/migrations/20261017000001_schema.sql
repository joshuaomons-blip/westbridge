-- =====================================================================
-- Norvane Express — core schema
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
create table public.site_settings (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

insert into public.site_settings (key, value) values
  ('demo_mode', 'false'::jsonb),
  ('tracking_prefix', '"NV"'::jsonb);

-- ---------------------------------------------------------------------
-- Administrators and roles
-- ---------------------------------------------------------------------
create table public.administrator_roles (
  code         text primary key check (code ~ '^[a-z_]+$'),
  name         text not null,
  description  text,
  permissions  text[] not null default '{}',
  rank         int not null default 0,
  created_at   timestamptz not null default now()
);

insert into public.administrator_roles (code, name, description, rank, permissions) values
  ('owner', 'Owner', 'Full access, including administrator accounts and settings.', 100,
    array['shipments.read','shipments.write','shipments.archive','events.write',
          'customers.read','customers.write','inquiries.read','inquiries.write',
          'services.write','content.write','translations.write','logs.read',
          'admins.manage','settings.write']),
  ('manager', 'Manager', 'Manages shipments, customers, website content and translations.', 50,
    array['shipments.read','shipments.write','shipments.archive','events.write',
          'customers.read','customers.write','inquiries.read','inquiries.write',
          'services.write','content.write','translations.write','logs.read']),
  ('operator', 'Operator', 'Creates and updates shipments and tracking events; handles inquiries.', 20,
    array['shipments.read','shipments.write','events.write',
          'customers.read','customers.write','inquiries.read','inquiries.write']),
  ('viewer', 'Viewer', 'Read-only access to shipments, customers and inquiries.', 10,
    array['shipments.read','customers.read','inquiries.read']);

create table public.administrator_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  role_code   text not null default 'viewer' references public.administrator_roles(code),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);
create unique index administrator_profiles_email_key on public.administrator_profiles (lower(email));

-- ---------------------------------------------------------------------
-- Shipment statuses (stable internal codes; labels live in translation files)
-- ---------------------------------------------------------------------
create table public.shipment_statuses (
  code         text primary key check (code ~ '^[a-z_]+$'),
  category     text not null check (category in ('pending','active','delivered','exception','closed')),
  sort_order   int not null default 0,
  is_active    boolean not null default true
);

insert into public.shipment_statuses (code, category, sort_order) values
  ('shipment_created',    'pending',   10),
  ('shipment_registered', 'pending',   20),
  ('awaiting_dispatch',   'pending',   30),
  ('in_transit',          'active',    40),
  ('arrived_at_facility', 'active',    50),
  ('customs_processing',  'active',    60),
  ('customs_cleared',     'active',    70),
  ('out_for_delivery',    'active',    80),
  ('delivered',           'delivered', 90),
  ('delivery_exception',  'exception', 100),
  ('delayed',             'exception', 110),
  ('returned_to_sender',  'closed',    120),
  ('cancelled',           'closed',    130);

-- ---------------------------------------------------------------------
-- Services (configurable listings; per-language text stored as JSON)
-- ---------------------------------------------------------------------
create table public.services (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  icon          text not null default 'package' check (icon ~ '^[a-z0-9-]{1,40}$'),
  title         jsonb not null default '{}'::jsonb check (jsonb_typeof(title) = 'object'),
  description   jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  sort_order    int not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null
);

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (char_length(full_name) between 1 and 200),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or char_length(phone) <= 40),
  company     text check (company is null or char_length(company) <= 200),
  country     text check (country is null or char_length(country) <= 100),
  city        text check (city is null or char_length(city) <= 100),
  address     text check (address is null or char_length(address) <= 500),
  notes       text check (notes is null or char_length(notes) <= 5000),
  is_demo     boolean not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  updated_by  uuid references auth.users(id) on delete set null
);
create unique index customers_email_active_key on public.customers (lower(email))
  where email is not null and archived_at is null;
create index customers_name_idx on public.customers (lower(full_name));

-- ---------------------------------------------------------------------
-- Tracking number generator (server-side, unique, with check digit)
-- ---------------------------------------------------------------------
create or replace function public.generate_tracking_number()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_prefix text;
  v_digits text;
  v_sum int;
  v_candidate text;
  i int;
begin
  select coalesce(value #>> '{}', 'NV') into v_prefix from public.site_settings where key = 'tracking_prefix';
  v_prefix := upper(regexp_replace(coalesce(v_prefix, 'NV'), '[^A-Za-z]', '', 'g'));
  if v_prefix = '' then v_prefix := 'NV'; end if;
  v_prefix := left(v_prefix, 4);

  loop
    -- 10 cryptographically random digits
    v_digits := '';
    for i in 1..10 loop
      v_digits := v_digits || (get_byte(gen_random_bytes(1), 0) % 10)::text;
    end loop;
    -- simple mod-10 check digit to catch typos
    v_sum := 0;
    for i in 1..10 loop
      v_sum := v_sum + substr(v_digits, i, 1)::int * (case when i % 2 = 0 then 3 else 1 end);
    end loop;
    v_candidate := v_prefix || v_digits || ((10 - (v_sum % 10)) % 10)::text;
    exit when not exists (select 1 from public.shipments where tracking_number = v_candidate);
  end loop;
  return v_candidate;
end;
$$;

-- ---------------------------------------------------------------------
-- Shipments
-- ---------------------------------------------------------------------
create table public.shipments (
  id                   uuid primary key default gen_random_uuid(),
  internal_ref         text not null unique
                       default ('SHP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  tracking_number      text not null,
  customer_id          uuid references public.customers(id) on delete set null,
  service_id           uuid references public.services(id) on delete set null,
  shipment_type        text not null default 'parcel'
                       check (shipment_type in ('parcel','document','freight','pallet','other')),

  sender_name          text not null check (char_length(sender_name) between 1 and 200),
  sender_email         text check (sender_email is null or sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  sender_phone         text check (sender_phone is null or char_length(sender_phone) <= 40),
  origin_country       text not null check (char_length(origin_country) between 1 and 100),
  origin_city          text not null check (char_length(origin_city) between 1 and 100),
  origin_address       text check (origin_address is null or char_length(origin_address) <= 500),

  recipient_name       text not null check (char_length(recipient_name) between 1 and 200),
  recipient_email      text check (recipient_email is null or recipient_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  recipient_phone      text check (recipient_phone is null or char_length(recipient_phone) <= 40),
  destination_country  text not null check (char_length(destination_country) between 1 and 100),
  destination_city     text not null check (char_length(destination_city) between 1 and 100),
  destination_address  text check (destination_address is null or char_length(destination_address) <= 500),

  package_description  text check (package_description is null or char_length(package_description) <= 1000),
  package_quantity     int not null default 1 check (package_quantity between 1 and 10000),
  weight_kg            numeric(10,3) check (weight_kg is null or (weight_kg > 0 and weight_kg < 1000000)),
  estimated_delivery   date,
  current_status       text not null default 'shipment_created' references public.shipment_statuses(code),
  internal_notes       text check (internal_notes is null or char_length(internal_notes) <= 10000),

  is_published         boolean not null default true,
  is_demo              boolean not null default false,
  shipment_date        date not null default current_date,
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id) on delete set null,
  updated_by           uuid references auth.users(id) on delete set null,

  constraint shipments_tracking_number_key unique (tracking_number),
  constraint shipments_tracking_number_format check (tracking_number ~ '^[A-Z0-9]{8,24}$')
);
alter table public.shipments alter column tracking_number set default public.generate_tracking_number();

create index shipments_status_idx       on public.shipments (current_status) where archived_at is null;
create index shipments_created_idx      on public.shipments (created_at desc);
create index shipments_customer_idx     on public.shipments (customer_id);
create index shipments_origin_idx       on public.shipments (origin_country);
create index shipments_destination_idx  on public.shipments (destination_country);

-- ---------------------------------------------------------------------
-- Shipment events (tracking history)
-- ---------------------------------------------------------------------
create table public.shipment_events (
  id                 uuid primary key default gen_random_uuid(),
  shipment_id        uuid not null references public.shipments(id) on delete restrict,
  status_code        text not null references public.shipment_statuses(code),
  occurred_at        timestamptz not null,                 -- when the event happened
  recorded_at        timestamptz not null default now(),   -- when it was entered
  location           text check (location is null or char_length(location) <= 200),
  description        text check (description is null or char_length(description) <= 1000),
  visibility         text not null default 'public' check (visibility in ('public','internal')),
  is_voided          boolean not null default false,
  correction_reason  text check (correction_reason is null or char_length(correction_reason) <= 1000),
  created_by         uuid references auth.users(id) on delete set null,
  updated_at         timestamptz,
  updated_by         uuid references auth.users(id) on delete set null
);
create index shipment_events_shipment_idx on public.shipment_events (shipment_id, occurred_at desc);
create index shipment_events_recorded_idx on public.shipment_events (recorded_at desc);

-- ---------------------------------------------------------------------
-- Contact inquiries
-- ---------------------------------------------------------------------
create table public.contact_inquiries (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique
                  default ('INQ-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5))),
  name            text not null check (char_length(name) between 1 and 120),
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  subject         text not null check (char_length(subject) between 1 and 200),
  message         text not null check (char_length(message) between 1 and 5000),
  locale          text check (locale is null or locale in ('en','pl','ja','es','de')),
  status          text not null default 'new' check (status in ('new','in_progress','resolved')),
  internal_notes  text check (internal_notes is null or char_length(internal_notes) <= 10000),
  customer_id     uuid references public.customers(id) on delete set null,
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);
create index contact_inquiries_created_idx on public.contact_inquiries (created_at desc);
create index contact_inquiries_status_idx  on public.contact_inquiries (status) where archived_at is null;
create index contact_inquiries_email_idx   on public.contact_inquiries (lower(email));

-- ---------------------------------------------------------------------
-- Website content (draft + published values, per locale; 'all' = any locale)
-- ---------------------------------------------------------------------
create table public.website_content (
  key              text not null check (key ~ '^[a-z0-9_.]{2,100}$'),
  locale           text not null check (locale in ('en','pl','ja','es','de','all')),
  published_value  text check (published_value is null or char_length(published_value) <= 20000),
  draft_value      text check (draft_value is null or char_length(draft_value) <= 20000),
  published_at     timestamptz,
  published_by     uuid references auth.users(id) on delete set null,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id) on delete set null,
  primary key (key, locale)
);

-- ---------------------------------------------------------------------
-- Translation overrides (edit interface text without touching code)
-- ---------------------------------------------------------------------
create table public.translation_content (
  locale        text not null check (locale in ('en','pl','ja','es','de')),
  message_key   text not null check (message_key ~ '^[A-Za-z0-9_.]{2,150}$'),
  value         text not null check (char_length(value) <= 5000),
  is_published  boolean not null default true,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null,
  primary key (locale, message_key)
);

-- ---------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  actor_id     uuid,
  actor_email  text,
  action       text not null check (char_length(action) <= 60),
  table_name   text,
  record_id    text,
  summary      text check (summary is null or char_length(summary) <= 1000),
  old_data     jsonb,
  new_data     jsonb
);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);
create index audit_logs_record_idx   on public.audit_logs (table_name, record_id);
create index audit_logs_actor_idx    on public.audit_logs (actor_id);

-- ---------------------------------------------------------------------
-- Rate limiting buckets (keys are salted hashes, never raw IPs)
-- ---------------------------------------------------------------------
create table public.rate_limits (
  bucket_key    text not null check (char_length(bucket_key) <= 200),
  window_start  timestamptz not null,
  hits          int not null default 0,
  primary key (bucket_key, window_start)
);
