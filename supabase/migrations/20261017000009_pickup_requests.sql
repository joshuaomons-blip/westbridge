-- Pickup / quote requests arrive in the same inbox as contact messages.
alter table public.contact_inquiries
  add column if not exists kind  text not null default 'message',
  add column if not exists phone text;
alter table public.contact_inquiries drop constraint if exists contact_inquiries_kind_check;
alter table public.contact_inquiries add constraint contact_inquiries_kind_check check (kind in ('message','pickup'));
alter table public.contact_inquiries drop constraint if exists contact_inquiries_phone_check;
alter table public.contact_inquiries add constraint contact_inquiries_phone_check
  check (phone is null or (char_length(phone) between 5 and 40 and phone ~ '^[0-9+()\s.-]+$'));

-- Proof of delivery: name of the person who received the shipment (public, on delivered events).
alter table public.shipment_events add column if not exists received_by text;
alter table public.shipment_events drop constraint if exists shipment_events_received_by_check;
alter table public.shipment_events add constraint shipment_events_received_by_check
  check (received_by is null or char_length(received_by) between 1 and 80);

create or replace function public.submit_pickup_request(
  p_name text, p_email text, p_phone text, p_subject text, p_message text, p_locale text
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
    raise exception 'invalid request' using errcode = '22023';
  end if;

  select id into v_customer from public.customers
   where lower(email) = v_email and archived_at is null limit 1;

  insert into public.contact_inquiries (kind, name, email, phone, subject, message, locale, customer_id)
  values ('pickup', left(btrim(p_name), 120), v_email, nullif(left(btrim(coalesce(p_phone, '')), 40), ''),
          left(btrim(p_subject), 200), left(btrim(p_message), 5000),
          case when p_locale in ('en','pl','ja','es','de') then p_locale end, v_customer)
  returning reference into v_ref;
  return v_ref;
end;
$$;

revoke execute on function public.submit_pickup_request(text, text, text, text, text, text) from public;
grant execute on function public.submit_pickup_request(text, text, text, text, text, text) to anon, authenticated;

-- Public tracking: include the receiver's name on delivered events.
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
           'description', e.description,
           'received_by', case when e.status_code = 'delivered' then e.received_by end
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
