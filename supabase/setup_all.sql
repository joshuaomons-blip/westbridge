-- Norvane Express — complete database setup (all migrations in order).
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Run it ONCE on a new project.

-- ===== 20261017000001_schema.sql =====
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

-- ===== 20261017000002_functions.sql =====
-- =====================================================================
-- Norvane Express — permission helpers, triggers, functions
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permission helpers (used by RLS policies and the app)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.administrator_profiles p
    where p.id = auth.uid() and p.is_active
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.administrator_profiles p
    join public.administrator_roles r on r.code = p.role_code
    where p.id = auth.uid() and p.is_active and p_permission = any (r.permissions)
  );
$$;

create or replace function public.my_admin_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'email', p.email, 'full_name', p.full_name,
    'role_code', p.role_code, 'role_name', r.name, 'permissions', to_jsonb(r.permissions)
  )
  from public.administrator_profiles p
  join public.administrator_roles r on r.code = p.role_code
  where p.id = auth.uid() and p.is_active;
$$;

-- ---------------------------------------------------------------------
-- updated_at / updated_by stamping
-- ---------------------------------------------------------------------
create or replace function public.tg_stamp_updated()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  begin
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  exception when undefined_column then
    null;
  end;
  return new;
end;
$$;

create or replace function public.tg_stamp_updated_at_only()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger stamp_updated before update on public.shipments          for each row execute function public.tg_stamp_updated();
create trigger stamp_updated before update on public.customers          for each row execute function public.tg_stamp_updated();
create trigger stamp_updated before update on public.contact_inquiries  for each row execute function public.tg_stamp_updated();
create trigger stamp_updated before update on public.services           for each row execute function public.tg_stamp_updated();
create trigger stamp_updated before update on public.website_content    for each row execute function public.tg_stamp_updated();
create trigger stamp_updated before update on public.translation_content for each row execute function public.tg_stamp_updated();
create trigger stamp_updated before update on public.site_settings      for each row execute function public.tg_stamp_updated();
create trigger stamp_updated before update on public.administrator_profiles for each row execute function public.tg_stamp_updated_at_only();

-- ---------------------------------------------------------------------
-- Audit logging (generic row trigger; runs as definer so it can always write)
-- ---------------------------------------------------------------------
create or replace function public.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_old jsonb;
  v_new jsonb;
  v_id text;
begin
  select email into v_email from public.administrator_profiles where id = v_actor;
  if tg_op in ('UPDATE','DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_new := to_jsonb(new); end if;

  -- skip no-op updates
  if tg_op = 'UPDATE' and (v_old - 'updated_at' - 'updated_by') = (v_new - 'updated_at' - 'updated_by') then
    return new;
  end if;

  v_id := coalesce(v_new ->> 'id', v_old ->> 'id',
                   v_new ->> 'key', v_old ->> 'key',
                   v_new ->> 'code', v_old ->> 'code',
                   (v_new ->> 'locale') || ':' || (v_new ->> 'message_key'),
                   (v_old ->> 'locale') || ':' || (v_old ->> 'message_key'));
  if tg_table_name in ('website_content') then
    v_id := coalesce(v_new ->> 'key', v_old ->> 'key') || ':' || coalesce(v_new ->> 'locale', v_old ->> 'locale');
  end if;

  insert into public.audit_logs (actor_id, actor_email, action, table_name, record_id, old_data, new_data)
  values (v_actor, v_email, lower(tg_op), tg_table_name, v_id, v_old, v_new);

  return coalesce(new, old);
end;
$$;

create trigger audit after insert or update or delete on public.shipments            for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.shipment_events      for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.customers            for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.contact_inquiries    for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.services             for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.website_content      for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.translation_content  for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.administrator_profiles for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.site_settings        for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.shipment_statuses    for each row execute function public.tg_audit();

-- Explicit application events (sign-in, invitations, publishing…)
create or replace function public.write_audit_event(
  p_action text, p_table text default null, p_record text default null, p_summary text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_id, actor_email, action, table_name, record_id, summary)
  select auth.uid(), p.email, left(p_action, 60), p_table, p_record, left(p_summary, 1000)
  from public.administrator_profiles p where p.id = auth.uid();
end;
$$;

-- Audit rows can never be edited or removed through the API.
create or replace function public.tg_block_audit_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end;
$$;
create trigger block_changes before update or delete on public.audit_logs
  for each row execute function public.tg_block_audit_changes();

-- ---------------------------------------------------------------------
-- Shipment integrity rules
-- ---------------------------------------------------------------------
create or replace function public.tg_shipments_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.tracking_number := upper(new.tracking_number);
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
    return new;
  end if;

  -- Tracking numbers and internal refs are permanent once issued.
  if new.tracking_number is distinct from old.tracking_number
     or new.internal_ref is distinct from old.internal_ref
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.is_demo is distinct from old.is_demo then
    raise exception 'tracking number, reference, creator and demo flag cannot be changed' using errcode = '42501';
  end if;

  -- Archiving / restoring requires a dedicated permission.
  if new.archived_at is distinct from old.archived_at
     and auth.uid() is not null
     and not public.has_permission('shipments.archive') then
    raise exception 'archiving shipments requires the shipments.archive permission' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard before insert or update on public.shipments
  for each row execute function public.tg_shipments_guard();

-- Events: never silently rewritten. Changes to recorded content require a correction reason.
create or replace function public.tg_events_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
    new.recorded_at := now();
    new.updated_at := null;
    new.updated_by := null;
    if new.occurred_at > now() + interval '15 minutes' then
      raise exception 'an event cannot be recorded in the future' using errcode = '22023';
    end if;
    if new.is_voided then
      raise exception 'new events cannot be voided' using errcode = '22023';
    end if;
    if exists (select 1 from public.shipments s where s.id = new.shipment_id and s.archived_at is not null) then
      raise exception 'cannot add events to an archived shipment' using errcode = '22023';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- Only clearly-labelled demonstration data may be removed (see supabase/demo_remove.sql).
    if exists (select 1 from public.shipments s where s.id = old.shipment_id and s.is_demo) then
      return old;
    end if;
    raise exception 'tracking events cannot be deleted; void them with a correction reason instead' using errcode = '42501';
  end if;

  -- UPDATE
  if new.shipment_id is distinct from old.shipment_id
     or new.recorded_at is distinct from old.recorded_at
     or new.created_by is distinct from old.created_by then
    raise exception 'event origin fields cannot be changed' using errcode = '42501';
  end if;

  if (new.status_code, new.occurred_at, new.location, new.description, new.visibility, new.is_voided)
     is distinct from
     (old.status_code, old.occurred_at, old.location, old.description, old.visibility, old.is_voided) then
    if new.correction_reason is null
       or btrim(new.correction_reason) = ''
       or new.correction_reason is not distinct from old.correction_reason then
      raise exception 'a new correction reason is required to change a recorded event' using errcode = '22023';
    end if;
  end if;

  if old.is_voided and not new.is_voided then
    raise exception 'a voided event cannot be restored; record a new event instead' using errcode = '22023';
  end if;

  if new.occurred_at > now() + interval '15 minutes' then
    raise exception 'an event cannot be dated in the future' using errcode = '22023';
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;
create trigger guard before insert or update or delete on public.shipment_events
  for each row execute function public.tg_events_guard();

-- Keep shipments.current_status in sync with the latest valid event.
create or replace function public.sync_shipment_status(p_shipment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select e.status_code into v_status
  from public.shipment_events e
  where e.shipment_id = p_shipment and not e.is_voided
  order by e.occurred_at desc, e.recorded_at desc
  limit 1;

  update public.shipments
     set current_status = coalesce(v_status, 'shipment_created')
   where id = p_shipment
     and current_status is distinct from coalesce(v_status, 'shipment_created');
end;
$$;
revoke all on function public.sync_shipment_status(uuid) from public;

create or replace function public.tg_events_sync_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_shipment_status(new.shipment_id);
  return new;
end;
$$;
create trigger sync_status after insert or update on public.shipment_events
  for each row execute function public.tg_events_sync_status();

-- ---------------------------------------------------------------------
-- Administrator safety: always keep at least one active owner
-- ---------------------------------------------------------------------
create or replace function public.tg_admin_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'immutable fields' using errcode = '42501';
    end if;
  end if;

  if old.role_code = 'owner' and old.is_active
     and (tg_op = 'DELETE' or new.role_code <> 'owner' or not new.is_active) then
    if not exists (
      select 1 from public.administrator_profiles
      where role_code = 'owner' and is_active and id <> old.id
    ) then
      raise exception 'at least one active owner account must remain' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger guard before update or delete on public.administrator_profiles
  for each row execute function public.tg_admin_profiles_guard();

-- Administrators may change their own display name, nothing else.
create or replace function public.update_my_profile(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.administrator_profiles
     set full_name = nullif(left(btrim(p_full_name), 120), '')
   where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- Admin workflows (run with the caller's rights, so RLS applies)
-- ---------------------------------------------------------------------

-- Create a shipment and its first tracking event in one transaction.
create or replace function public.create_shipment(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer uuid := nullif(p ->> 'customer_id', '')::uuid;
  v_status   text := coalesce(nullif(p ->> 'current_status', ''), 'shipment_created');
  v_row      public.shipments;
  v_email    text := nullif(lower(btrim(p ->> 'sender_email')), '');
begin
  if not public.has_permission('shipments.write') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Optionally link (or create) the sender as a customer record.
  if v_customer is null and coalesce((p ->> 'link_sender_as_customer')::boolean, false) then
    if v_email is not null then
      select id into v_customer from public.customers
       where lower(email) = v_email and archived_at is null limit 1;
    end if;
    if v_customer is null then
      insert into public.customers (full_name, email, phone, country, city, address, created_by)
      values (p ->> 'sender_name', v_email, nullif(p ->> 'sender_phone', ''),
              p ->> 'origin_country', p ->> 'origin_city', nullif(p ->> 'origin_address', ''), auth.uid())
      returning id into v_customer;
    end if;
  end if;

  insert into public.shipments (
    customer_id, service_id, shipment_type,
    sender_name, sender_email, sender_phone, origin_country, origin_city, origin_address,
    recipient_name, recipient_email, recipient_phone, destination_country, destination_city, destination_address,
    package_description, package_quantity, weight_kg, estimated_delivery, current_status,
    internal_notes, is_published, shipment_date
  ) values (
    v_customer, nullif(p ->> 'service_id', '')::uuid, coalesce(nullif(p ->> 'shipment_type', ''), 'parcel'),
    p ->> 'sender_name', v_email, nullif(p ->> 'sender_phone', ''),
    p ->> 'origin_country', p ->> 'origin_city', nullif(p ->> 'origin_address', ''),
    p ->> 'recipient_name', nullif(lower(btrim(p ->> 'recipient_email')), ''), nullif(p ->> 'recipient_phone', ''),
    p ->> 'destination_country', p ->> 'destination_city', nullif(p ->> 'destination_address', ''),
    nullif(p ->> 'package_description', ''), coalesce(nullif(p ->> 'package_quantity', '')::int, 1),
    nullif(p ->> 'weight_kg', '')::numeric, nullif(p ->> 'estimated_delivery', '')::date, v_status,
    nullif(p ->> 'internal_notes', ''), coalesce((p ->> 'is_published')::boolean, true),
    coalesce(nullif(p ->> 'shipment_date', '')::date, current_date)
  )
  returning * into v_row;

  insert into public.shipment_events (shipment_id, status_code, occurred_at, location, description, visibility)
  values (
    v_row.id, v_status, now(),
    nullif(p ->> 'initial_location', ''),
    nullif(p ->> 'initial_description', ''),
    'public'
  );

  return jsonb_build_object('id', v_row.id, 'tracking_number', v_row.tracking_number, 'internal_ref', v_row.internal_ref);
end;
$$;

-- ---------------------------------------------------------------------
-- Public, read-only functions (granted to anonymous visitors)
-- ---------------------------------------------------------------------
create or replace function public.normalize_tracking_number(p text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p, ''), '[\s\-]', '', 'g'));
$$;

-- Returns ONLY the fields needed by the public tracking page.
create or replace function public.get_public_tracking(p_tracking_number text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_num  text := public.normalize_tracking_number(p_tracking_number);
  v_demo boolean;
  s      public.shipments;
  v_events jsonb;
  v_public_status text;
  v_last timestamptz;
begin
  if v_num !~ '^[A-Z0-9]{8,24}$' then
    return null;
  end if;

  select coalesce((value #>> '{}')::boolean, false) into v_demo
    from public.site_settings where key = 'demo_mode';

  select * into s from public.shipments
   where tracking_number = v_num
     and archived_at is null
     and is_published
     and (not is_demo or coalesce(v_demo, false));
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'status', e.status_code,
           'occurred_at', e.occurred_at,
           'location', e.location,
           'description', e.description
         ) order by e.occurred_at desc, e.recorded_at desc), '[]'::jsonb),
         max(greatest(e.recorded_at, coalesce(e.updated_at, e.recorded_at)))
    into v_events, v_last
    from public.shipment_events e
   where e.shipment_id = s.id and e.visibility = 'public' and not e.is_voided;

  select e.status_code into v_public_status
    from public.shipment_events e
   where e.shipment_id = s.id and e.visibility = 'public' and not e.is_voided
   order by e.occurred_at desc, e.recorded_at desc
   limit 1;

  return jsonb_build_object(
    'tracking_number', s.tracking_number,
    'status', coalesce(v_public_status, 'shipment_created'),
    'shipment_type', s.shipment_type,
    'created_at', s.created_at,
    'last_update', coalesce(v_last, s.created_at),
    'origin', jsonb_build_object('city', s.origin_city, 'country', s.origin_country),
    'destination', jsonb_build_object('city', s.destination_city, 'country', s.destination_country),
    'estimated_delivery', s.estimated_delivery,
    'package_quantity', s.package_quantity,
    'service', (select jsonb_build_object('slug', sv.slug, 'title', sv.title)
                  from public.services sv where sv.id = s.service_id and sv.is_published),
    'is_demo', s.is_demo,
    'events', v_events
  );
end;
$$;

create or replace function public.get_published_content(p_locale text)
returns table (key text, locale text, value text)
language sql
stable
security definer
set search_path = public
as $$
  select c.key, c.locale, c.published_value
  from public.website_content c
  where c.locale in (p_locale, 'all', 'en') and c.published_value is not null;
$$;

create or replace function public.get_translation_overrides(p_locale text)
returns table (message_key text, value text)
language sql
stable
security definer
set search_path = public
as $$
  select t.message_key, t.value
  from public.translation_content t
  where t.locale = p_locale and t.is_published;
$$;

create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'demo_mode', coalesce((select (value #>> '{}')::boolean from public.site_settings where key = 'demo_mode'), false)
  );
$$;

-- Contact form submission (validated; rate limited in the app before calling).
create or replace function public.submit_contact_inquiry(
  p_name text, p_email text, p_subject text, p_message text, p_locale text
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ref text;
  v_customer uuid;
  v_email text := lower(btrim(p_email));
begin
  if char_length(btrim(coalesce(p_name, ''))) = 0
     or char_length(btrim(coalesce(p_subject, ''))) = 0
     or char_length(btrim(coalesce(p_message, ''))) < 10 then
    raise exception 'invalid inquiry' using errcode = '22023';
  end if;

  select id into v_customer from public.customers
   where lower(email) = v_email and archived_at is null limit 1;

  insert into public.contact_inquiries (name, email, subject, message, locale, customer_id)
  values (left(btrim(p_name), 120), v_email, left(btrim(p_subject), 200), left(btrim(p_message), 5000),
          case when p_locale in ('en','pl','ja','es','de') then p_locale end, v_customer)
  returning reference into v_ref;
  return v_ref;
end;
$$;

-- Fixed-window rate limiter. Returns true when the request is allowed.
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits int;
begin
  if p_key is null or char_length(p_key) > 200 or p_max < 1 or p_window_seconds < 1 then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (bucket_key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (bucket_key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- opportunistic cleanup of old buckets
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------
-- Dashboard statistics (real records only; demo rows only while demo mode is on)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats(
  p_from date default null, p_to date default null,
  p_origin text default null, p_destination text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_demo boolean;
  v jsonb;
begin
  if not public.has_permission('shipments.read') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select coalesce((value #>> '{}')::boolean, false) into v_demo from public.site_settings where key = 'demo_mode';

  with s as (
    select * from public.shipments
    where archived_at is null
      and (coalesce(v_demo, false) or not is_demo)
      and (p_from is null or created_at >= p_from)
      and (p_to is null or created_at < p_to + 1)
      and (p_origin is null or origin_country ilike p_origin)
      and (p_destination is null or destination_country ilike p_destination)
  )
  select jsonb_build_object(
    'total',              (select count(*) from s),
    'in_transit',         (select count(*) from s join public.shipment_statuses st on st.code = s.current_status where st.category = 'active'),
    'delivered',          (select count(*) from s where current_status = 'delivered'),
    'awaiting_dispatch',  (select count(*) from s join public.shipment_statuses st on st.code = s.current_status where st.category = 'pending'),
    'delayed',            (select count(*) from s where current_status = 'delayed'),
    'exceptions',         (select count(*) from s where current_status = 'delivery_exception'),
    'new_inquiries',      (select count(*) from public.contact_inquiries i
                            where i.status = 'new' and i.archived_at is null and (coalesce(v_demo, false) or not i.is_demo)),
    'by_status',          (select coalesce(jsonb_object_agg(current_status, n), '{}'::jsonb)
                             from (select current_status, count(*) n from s group by 1) x),
    'by_day',             (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', n) order by d), '[]'::jsonb)
                             from (select created_at::date d, count(*) n from s
                                    where created_at >= coalesce(p_from, current_date - 29)
                                    group by 1) x),
    'includes_demo',      coalesce(v_demo, false) and exists (select 1 from s where is_demo)
  ) into v;
  return v;
end;
$$;

-- ===== 20261017000003_security.sql =====
-- =====================================================================
-- Norvane Express — Row Level Security and grants
-- Anonymous visitors get NO direct table access to private data; they use
-- the narrow security-definer functions defined in the previous migration.
-- =====================================================================

alter table public.site_settings          enable row level security;
alter table public.administrator_roles    enable row level security;
alter table public.administrator_profiles enable row level security;
alter table public.shipment_statuses      enable row level security;
alter table public.services               enable row level security;
alter table public.customers              enable row level security;
alter table public.shipments              enable row level security;
alter table public.shipment_events        enable row level security;
alter table public.contact_inquiries      enable row level security;
alter table public.website_content        enable row level security;
alter table public.translation_content    enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.rate_limits            enable row level security;

-- Defense in depth: strip table privileges from anonymous visitors on private tables.
revoke all on public.site_settings, public.administrator_roles, public.administrator_profiles,
              public.customers, public.shipments, public.shipment_events, public.contact_inquiries,
              public.website_content, public.translation_content, public.audit_logs, public.rate_limits
  from anon;
revoke all on public.rate_limits from authenticated;
revoke insert, update, delete, truncate on public.audit_logs from authenticated;
revoke delete, truncate on public.shipments, public.shipment_events, public.customers,
                          public.contact_inquiries from authenticated;

-- Sequences used by identity columns are not needed by clients.
revoke all on all sequences in schema public from anon;

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
create policy "admins read settings" on public.site_settings
  for select to authenticated using (public.is_admin());
create policy "owners update settings" on public.site_settings
  for update to authenticated using (public.has_permission('settings.write'))
  with check (public.has_permission('settings.write'));

-- ---------------------------------------------------------------------
-- Roles & administrator profiles
-- ---------------------------------------------------------------------
create policy "admins read roles" on public.administrator_roles
  for select to authenticated using (public.is_admin());

create policy "admins read admin profiles" on public.administrator_profiles
  for select to authenticated using (public.is_admin());
create policy "owners update admin profiles" on public.administrator_profiles
  for update to authenticated using (public.has_permission('admins.manage'))
  with check (public.has_permission('admins.manage'));
-- Inserts happen only through the server-side invite flow (service role) or SQL.

-- ---------------------------------------------------------------------
-- Statuses & services (public catalog data)
-- ---------------------------------------------------------------------
create policy "anyone reads statuses" on public.shipment_statuses
  for select to anon, authenticated using (true);
create policy "owners update statuses" on public.shipment_statuses
  for update to authenticated using (public.has_permission('settings.write'))
  with check (public.has_permission('settings.write'));

create policy "public reads published services" on public.services
  for select to anon, authenticated using (is_published or public.is_admin());
create policy "editors insert services" on public.services
  for insert to authenticated with check (public.has_permission('services.write'));
create policy "editors update services" on public.services
  for update to authenticated using (public.has_permission('services.write'))
  with check (public.has_permission('services.write'));
create policy "editors delete services" on public.services
  for delete to authenticated using (public.has_permission('services.write'));
revoke insert, update, delete, truncate on public.services from anon;
revoke insert, update, delete, truncate on public.shipment_statuses from anon;

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
create policy "staff read customers" on public.customers
  for select to authenticated using (public.has_permission('customers.read'));
create policy "staff insert customers" on public.customers
  for insert to authenticated with check (public.has_permission('customers.write'));
create policy "staff update customers" on public.customers
  for update to authenticated using (public.has_permission('customers.write'))
  with check (public.has_permission('customers.write'));

-- ---------------------------------------------------------------------
-- Shipments & events
-- ---------------------------------------------------------------------
create policy "staff read shipments" on public.shipments
  for select to authenticated using (public.has_permission('shipments.read'));
create policy "staff insert shipments" on public.shipments
  for insert to authenticated with check (public.has_permission('shipments.write') and not is_demo);
create policy "staff update shipments" on public.shipments
  for update to authenticated using (public.has_permission('shipments.write'))
  with check (public.has_permission('shipments.write'));

create policy "staff read events" on public.shipment_events
  for select to authenticated using (public.has_permission('shipments.read'));
create policy "staff insert events" on public.shipment_events
  for insert to authenticated with check (public.has_permission('events.write'));
create policy "staff update events" on public.shipment_events
  for update to authenticated using (public.has_permission('events.write'))
  with check (public.has_permission('events.write'));

-- ---------------------------------------------------------------------
-- Contact inquiries (public submissions go through submit_contact_inquiry)
-- ---------------------------------------------------------------------
create policy "staff read inquiries" on public.contact_inquiries
  for select to authenticated using (public.has_permission('inquiries.read'));
create policy "staff update inquiries" on public.contact_inquiries
  for update to authenticated using (public.has_permission('inquiries.write'))
  with check (public.has_permission('inquiries.write'));
revoke insert on public.contact_inquiries from authenticated;

-- ---------------------------------------------------------------------
-- Website content & translations (drafts are private; public reads via functions)
-- ---------------------------------------------------------------------
create policy "admins read content" on public.website_content
  for select to authenticated using (public.is_admin());
create policy "editors insert content" on public.website_content
  for insert to authenticated with check (public.has_permission('content.write'));
create policy "editors update content" on public.website_content
  for update to authenticated using (public.has_permission('content.write'))
  with check (public.has_permission('content.write'));
create policy "editors delete content" on public.website_content
  for delete to authenticated using (public.has_permission('content.write'));

create policy "admins read translations" on public.translation_content
  for select to authenticated using (public.is_admin());
create policy "translators insert translations" on public.translation_content
  for insert to authenticated with check (public.has_permission('translations.write'));
create policy "translators update translations" on public.translation_content
  for update to authenticated using (public.has_permission('translations.write'))
  with check (public.has_permission('translations.write'));
create policy "translators delete translations" on public.translation_content
  for delete to authenticated using (public.has_permission('translations.write'));

-- ---------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------
create policy "managers read audit log" on public.audit_logs
  for select to authenticated using (public.has_permission('logs.read'));

-- rate_limits: no policies at all (only reachable via hit_rate_limit()).

-- ---------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on function public.get_public_tracking(text)            to anon, authenticated;
grant execute on function public.get_published_content(text)          to anon, authenticated;
grant execute on function public.get_translation_overrides(text)      to anon, authenticated;
grant execute on function public.get_public_settings()                to anon, authenticated;
grant execute on function public.submit_contact_inquiry(text, text, text, text, text) to anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int)       to anon, authenticated;
grant execute on function public.normalize_tracking_number(text)      to anon, authenticated;

-- is_admin() is referenced by a policy anonymous visitors evaluate (services); it returns false for them.
grant execute on function public.is_admin()                           to anon, authenticated;
grant execute on function public.has_permission(text)                 to authenticated;
grant execute on function public.my_admin_context()                   to authenticated;
grant execute on function public.write_audit_event(text, text, text, text) to authenticated;
grant execute on function public.update_my_profile(text)              to authenticated;
grant execute on function public.create_shipment(jsonb)               to authenticated;
grant execute on function public.dashboard_stats(date, date, text, text) to authenticated;
grant execute on function public.generate_tracking_number()           to authenticated;

-- Trigger functions must not be callable directly.
revoke execute on function public.sync_shipment_status(uuid) from authenticated;

-- Future functions are private unless explicitly granted.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- ===== 20261017000004_storage.sql =====
-- =====================================================================
-- Image storage for website content (Supabase Storage)
-- Public read; uploads restricted to content editors; images only, 5 MB max.
-- Files are served as static objects by Supabase Storage and never executed.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads site media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-media');

create policy "editors upload site media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.has_permission('content.write'));

create policy "editors update site media" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and public.has_permission('content.write'))
  with check (bucket_id = 'site-media' and public.has_permission('content.write'));

create policy "editors delete site media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and public.has_permission('content.write'));

-- ===== 20261017000005_starter_services.sql =====
-- =====================================================================
-- Starter service listings. Created UNPUBLISHED on purpose: review each
-- description in the dashboard (Services) and publish only the services
-- Norvane Express actually offers.
-- =====================================================================
insert into public.services (slug, icon, sort_order, is_published, title, description) values
('international-parcel', 'globe', 10, false,
 '{"en":"International Parcel Shipping","pl":"Międzynarodowa wysyłka paczek","ja":"国際小包配送","es":"Envío internacional de paquetes","de":"Internationaler Paketversand"}',
 '{"en":"Send parcels across borders with a tracking reference for every shipment.","pl":"Wysyłaj paczki za granicę z numerem śledzenia dla każdej przesyłki.","ja":"すべての貨物に追跡番号を付けて、国境を越えて小包をお届けします。","es":"Envíe paquetes al extranjero con un número de seguimiento para cada envío.","de":"Versenden Sie Pakete ins Ausland – mit einer Sendungsnummer für jede Lieferung."}'),
('domestic-delivery', 'truck', 20, false,
 '{"en":"Domestic Delivery","pl":"Dostawa krajowa","ja":"国内配送","es":"Entrega nacional","de":"Inlandszustellung"}',
 '{"en":"Pickup and delivery of parcels and documents within the country.","pl":"Odbiór i dostawa paczek oraz dokumentów na terenie kraju.","ja":"国内での小包や書類の集荷と配達。","es":"Recogida y entrega de paquetes y documentos dentro del país.","de":"Abholung und Zustellung von Paketen und Dokumenten im Inland."}'),
('freight', 'container', 30, false,
 '{"en":"Freight Transportation","pl":"Transport towarowy","ja":"貨物輸送","es":"Transporte de carga","de":"Frachttransport"}',
 '{"en":"Transport for larger consignments, pallets and bulk goods.","pl":"Transport większych przesyłek, palet i towarów masowych.","ja":"大型貨物、パレット、大量の商品の輸送。","es":"Transporte de envíos de mayor tamaño, palés y mercancías a granel.","de":"Transport größerer Sendungen, Paletten und Massengüter."}'),
('business-shipping', 'briefcase', 40, false,
 '{"en":"Business Shipping","pl":"Wysyłka dla firm","ja":"法人向け配送","es":"Envíos para empresas","de":"Geschäftsversand"}',
 '{"en":"Regular shipping arrangements for companies and online sellers.","pl":"Regularne usługi wysyłkowe dla firm i sprzedawców internetowych.","ja":"企業やオンライン販売者向けの定期配送サービス。","es":"Servicios de envío regulares para empresas y vendedores en línea.","de":"Regelmäßige Versandlösungen für Unternehmen und Online-Händler."}'),
('shipment-tracking', 'map-pin', 50, false,
 '{"en":"Shipment Tracking","pl":"Śledzenie przesyłek","ja":"貨物追跡","es":"Seguimiento de envíos","de":"Sendungsverfolgung"}',
 '{"en":"Follow the recorded progress of your shipment online with your tracking number.","pl":"Śledź zarejestrowany postęp przesyłki online za pomocą numeru śledzenia.","ja":"追跡番号を使って、貨物の記録された進捗状況をオンラインで確認できます。","es":"Siga en línea el progreso registrado de su envío con su número de seguimiento.","de":"Verfolgen Sie den erfassten Fortschritt Ihrer Sendung online mit Ihrer Sendungsnummer."}'),
('logistics-support', 'headset', 60, false,
 '{"en":"Logistics Support","pl":"Wsparcie logistyczne","ja":"物流サポート","es":"Soporte logístico","de":"Logistik-Support"}',
 '{"en":"Help with planning shipments, documentation and delivery questions.","pl":"Pomoc w planowaniu przesyłek, dokumentacji i pytaniach o dostawę.","ja":"配送計画、書類、配達に関するご相談をサポートします。","es":"Ayuda con la planificación de envíos, documentación y preguntas sobre entregas.","de":"Unterstützung bei Versandplanung, Dokumenten und Fragen zur Zustellung."}');

-- ===== 20261017000006_hardening.sql =====
-- Trigger functions run automatically; nobody needs to call them through the API.
revoke execute on function public.tg_admin_profiles_guard(), public.tg_audit(), public.tg_events_guard(),
  public.tg_events_sync_status(), public.tg_shipments_guard(), public.tg_stamp_updated(),
  public.tg_stamp_updated_at_only(), public.tg_block_audit_changes(), public.sync_shipment_status(uuid)
  from public, anon, authenticated;
-- Tracking numbers are generated by column default (needs execute for signed-in staff only).
revoke execute on function public.generate_tracking_number() from public, anon, authenticated;
grant execute on function public.generate_tracking_number() to authenticated;
-- Fixed search paths
alter function public.tg_stamp_updated() set search_path = public;
alter function public.tg_stamp_updated_at_only() set search_path = public;
alter function public.tg_block_audit_changes() set search_path = public;
alter function public.normalize_tracking_number(text) set search_path = public;

-- ===== 20261017000007_route_stops.sql =====
-- Planned route stops (public): intermediate places a shipment is expected to pass
-- through, shown on the tracking page as upcoming stops until an event reaches them.
alter table public.shipments
  add column if not exists route_stops text[] not null default '{}'::text[];

alter table public.shipments
  drop constraint if exists shipments_route_stops_check;
alter table public.shipments
  add constraint shipments_route_stops_check
  check (cardinality(route_stops) <= 15 and array_to_string(route_stops, '') !~ '[<>]'
         and char_length(array_to_string(route_stops, '|')) <= 1600);

create or replace function public.get_public_tracking(p_tracking_number text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_num  text := public.normalize_tracking_number(p_tracking_number);
  v_demo boolean;
  s      public.shipments;
  v_events jsonb;
  v_public_status text;
  v_last timestamptz;
begin
  if v_num !~ '^[A-Z0-9]{8,24}$' then
    return null;
  end if;

  select coalesce((value #>> '{}')::boolean, false) into v_demo
    from public.site_settings where key = 'demo_mode';

  select * into s from public.shipments
   where tracking_number = v_num
     and archived_at is null
     and is_published
     and (not is_demo or coalesce(v_demo, false));
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'status', e.status_code,
           'occurred_at', e.occurred_at,
           'location', e.location,
           'description', e.description
         ) order by e.occurred_at desc, e.recorded_at desc), '[]'::jsonb),
         max(greatest(e.recorded_at, coalesce(e.updated_at, e.recorded_at)))
    into v_events, v_last
    from public.shipment_events e
   where e.shipment_id = s.id and e.visibility = 'public' and not e.is_voided;

  select e.status_code into v_public_status
    from public.shipment_events e
   where e.shipment_id = s.id and e.visibility = 'public' and not e.is_voided
   order by e.occurred_at desc, e.recorded_at desc
   limit 1;

  return jsonb_build_object(
    'tracking_number', s.tracking_number,
    'status', coalesce(v_public_status, 'shipment_created'),
    'shipment_type', s.shipment_type,
    'created_at', s.created_at,
    'last_update', coalesce(v_last, s.created_at),
    'origin', jsonb_build_object('city', s.origin_city, 'country', s.origin_country),
    'destination', jsonb_build_object('city', s.destination_city, 'country', s.destination_country),
    'estimated_delivery', s.estimated_delivery,
    'package_quantity', s.package_quantity,
    'service', (select jsonb_build_object('slug', sv.slug, 'title', sv.title)
                  from public.services sv where sv.id = s.service_id and sv.is_published),
    'route_stops', to_jsonb(coalesce(s.route_stops, '{}'::text[])),
    'is_demo', s.is_demo,
    'events', v_events
  );
end;
$$;

revoke execute on function public.get_public_tracking(text) from public;
grant execute on function public.get_public_tracking(text) to anon, authenticated;
