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
