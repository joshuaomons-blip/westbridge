-- =====================================================================
-- DEMONSTRATION DATA — for testing before launch only.
-- Every row here is flagged is_demo = true and tracking numbers start with
-- "DEMO". These are SAMPLE records, not real packages. Demo shipments are
-- only visible on the public site while demo mode is switched on.
--
-- Load:   run this file in the Supabase SQL editor (or psql).
-- Remove: run supabase/demo_remove.sql, then turn demo mode off in
--         Dashboard -> Settings.
-- =====================================================================
begin;

update public.site_settings set value = 'true'::jsonb where key = 'demo_mode';

insert into public.customers (id, full_name, email, phone, country, city, is_demo) values
  ('00000000-0000-4000-8000-0000000000c1', 'Sample Customer A', 'sample.a@example.com', '+00 000 000 001', 'Poland', 'Warsaw', true),
  ('00000000-0000-4000-8000-0000000000c2', 'Sample Customer B', 'sample.b@example.com', null, 'Japan', 'Osaka', true);

insert into public.shipments (
  id, tracking_number, internal_ref, customer_id, shipment_type,
  sender_name, sender_email, origin_country, origin_city,
  recipient_name, destination_country, destination_city,
  package_description, package_quantity, weight_kg, estimated_delivery,
  internal_notes, is_demo, created_at
) values
  ('00000000-0000-4000-8000-0000000000a1', 'DEMO00000001', 'DEMO-SHP-001', '00000000-0000-4000-8000-0000000000c1', 'parcel',
   'Sample Customer A', 'sample.a@example.com', 'Poland', 'Warsaw',
   'Sample Recipient A', 'Germany', 'Berlin',
   'SAMPLE: books', 1, 2.4, current_date + 2,
   'SAMPLE internal note — must never appear publicly.', true, now() - interval '3 days'),
  ('00000000-0000-4000-8000-0000000000a2', 'DEMO00000002', 'DEMO-SHP-002', '00000000-0000-4000-8000-0000000000c2', 'document',
   'Sample Customer B', 'sample.b@example.com', 'Japan', 'Osaka',
   'Sample Recipient B', 'Spain', 'Madrid',
   'SAMPLE: documents', 1, 0.3, current_date - 1,
   null, true, now() - interval '6 days'),
  ('00000000-0000-4000-8000-0000000000a3', 'DEMO00000003', 'DEMO-SHP-003', null, 'freight',
   'Sample Sender C', null, 'Germany', 'Hamburg',
   'Sample Recipient C', 'Poland', 'Gdańsk',
   'SAMPLE: pallet', 2, 180, current_date + 5,
   null, true, now() - interval '1 day');

insert into public.shipment_events (shipment_id, status_code, occurred_at, location, description, visibility) values
  ('00000000-0000-4000-8000-0000000000a1', 'shipment_created',    now() - interval '3 days',            'Warsaw, PL', 'SAMPLE event: shipment record created.', 'public'),
  ('00000000-0000-4000-8000-0000000000a1', 'in_transit',          now() - interval '2 days',            'Warsaw, PL', 'SAMPLE event: departed facility.', 'public'),
  ('00000000-0000-4000-8000-0000000000a1', 'arrived_at_facility', now() - interval '1 day',             'Berlin, DE', 'SAMPLE event: arrived at facility.', 'public'),
  ('00000000-0000-4000-8000-0000000000a1', 'arrived_at_facility', now() - interval '20 hours',          'Berlin, DE', 'SAMPLE internal event: label re-printed.', 'internal'),
  ('00000000-0000-4000-8000-0000000000a2', 'shipment_created',    now() - interval '6 days',            'Osaka, JP',  'SAMPLE event: shipment record created.', 'public'),
  ('00000000-0000-4000-8000-0000000000a2', 'customs_processing',  now() - interval '3 days',            'Madrid, ES', 'SAMPLE event: customs processing.', 'public'),
  ('00000000-0000-4000-8000-0000000000a2', 'delivered',           now() - interval '1 day',             'Madrid, ES', 'SAMPLE event: delivered.', 'public'),
  ('00000000-0000-4000-8000-0000000000a3', 'shipment_created',    now() - interval '1 day',             'Hamburg, DE', 'SAMPLE event: shipment record created.', 'public'),
  ('00000000-0000-4000-8000-0000000000a3', 'delayed',             now() - interval '2 hours',           'Hamburg, DE', 'SAMPLE event: awaiting vehicle.', 'public');

insert into public.contact_inquiries (name, email, subject, message, locale, is_demo) values
  ('Sample Visitor', 'visitor@example.com', 'SAMPLE: delivery question', 'This is a sample inquiry used for testing the dashboard.', 'en', true);

commit;
