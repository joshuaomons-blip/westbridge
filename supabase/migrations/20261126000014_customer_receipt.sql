-- Customer copy of the shipment receipt. Returned only when the caller also
-- gives the last 4 digits of the sender's or recipient's phone number.
create or replace function public.get_customer_receipt(p_tracking_number text, p_phone_last4 text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_num  text := public.normalize_tracking_number(p_tracking_number);
  v_l4   text := regexp_replace(coalesce(p_phone_last4, ''), '\D', '', 'g');
  v_demo boolean;
  s      public.shipments;
begin
  if v_num !~ '^[A-Z0-9]{8,24}$' or v_l4 !~ '^[0-9]{4}$' then
    return null;
  end if;
  select coalesce((value #>> '{}')::boolean, false) into v_demo
    from public.site_settings where key = 'demo_mode';
  select * into s from public.shipments
   where tracking_number = v_num and archived_at is null and is_published
     and (not is_demo or coalesce(v_demo, false));
  if not found then
    return null;
  end if;
  if not (
       right(regexp_replace(coalesce(s.sender_phone, ''), '\D', '', 'g'), 4) = v_l4
    or right(regexp_replace(coalesce(s.recipient_phone, ''), '\D', '', 'g'), 4) = v_l4
  ) then
    return null;
  end if;
  return jsonb_build_object(
    'tracking_number', s.tracking_number,
    'internal_ref', s.internal_ref,
    'shipment_type', s.shipment_type,
    'shipment_date', s.shipment_date,
    'estimated_delivery', s.estimated_delivery,
    'service', (select sv.title from public.services sv where sv.id = s.service_id),
    'sender', jsonb_build_object('name', s.sender_name, 'city', s.origin_city, 'country', s.origin_country, 'address', s.origin_address),
    'recipient', jsonb_build_object('name', s.recipient_name, 'city', s.destination_city, 'country', s.destination_country, 'address', s.destination_address),
    'package_description', s.package_description,
    'package_quantity', s.package_quantity,
    'weight_kg', s.weight_kg,
    'route_stops', to_jsonb(coalesce(s.route_stops, '{}'::text[])),
    'vehicle', case when coalesce(s.vehicle_make, s.vehicle_model, s.vehicle_vin) is not null then
                 jsonb_build_object('make', s.vehicle_make, 'model', s.vehicle_model, 'year', s.vehicle_year,
                                    'color', s.vehicle_color, 'vin', s.vehicle_vin) end,
    'amount_paid_usdt', s.amount_paid_usdt
  );
end;
$$;
revoke execute on function public.get_customer_receipt(text, text) from public;
grant execute on function public.get_customer_receipt(text, text) to anon, authenticated;
