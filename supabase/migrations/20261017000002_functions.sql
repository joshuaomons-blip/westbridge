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
