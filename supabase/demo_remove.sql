-- =====================================================================
-- Remove ALL demonstration data and switch demo mode off.
-- Only rows flagged is_demo = true are touched. Run in the Supabase SQL editor.
-- =====================================================================
begin;
delete from public.shipment_events where shipment_id in (select id from public.shipments where is_demo);
delete from public.shipments         where is_demo;
delete from public.contact_inquiries where is_demo;
delete from public.customers         where is_demo and id not in (select customer_id from public.shipments where customer_id is not null);
update public.site_settings set value = 'false'::jsonb where key = 'demo_mode';
commit;
