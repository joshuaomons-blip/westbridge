-- =====================================================================
-- Database security & behaviour tests.
-- Run against a database where the migrations and demo_data.sql are loaded:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/security_tests.sql
-- Each check raises an exception (and stops the run) if it fails.
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- ---------- helpers ----------
create schema if not exists t;
grant usage on schema t to anon, authenticated;

create or replace function t.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

create or replace function t.fails(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok - % (blocked: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAILED (statement was allowed): %', label;
end $$;

create or replace function t.rows(sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'select count(*) from (' || sql || ') x' into n;
  return n;
end $$;

create table if not exists t.vars (k text primary key, v text);
grant all on t.vars to anon, authenticated;
grant execute on all functions in schema t to anon, authenticated;

-- ---------- fixtures ----------
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'operator@test.local'),
  ('33333333-3333-4333-8333-333333333333', 'viewer@test.local'),
  ('44444444-4444-4444-8444-444444444444', 'inactive@test.local'),
  ('55555555-5555-4555-8555-555555555555', 'stranger@test.local');
insert into public.administrator_profiles (id, email, role_code, is_active) values
  ('11111111-1111-4111-8111-111111111111', 'owner@test.local',    'owner',    true),
  ('22222222-2222-4222-8222-222222222222', 'operator@test.local', 'operator', true),
  ('33333333-3333-4333-8333-333333333333', 'viewer@test.local',   'viewer',   true),
  ('44444444-4444-4444-8444-444444444444', 'inactive@test.local', 'manager',  false);

\echo '--- anonymous visitor ---'
set role anon;
select set_config('request.jwt.claims', '', false);

select t.fails('select * from public.shipments', 'anon cannot read shipments table');
select t.fails('select * from public.customers', 'anon cannot read customers');
select t.fails('select * from public.shipment_events', 'anon cannot read events table');
select t.fails('select * from public.contact_inquiries', 'anon cannot read inquiries');
select t.fails('select * from public.audit_logs', 'anon cannot read audit log');
select t.fails('select * from public.website_content', 'anon cannot read content drafts');
select t.fails('select * from public.administrator_profiles', 'anon cannot read admin accounts');
select t.fails($$insert into public.contact_inquiries (name,email,subject,message) values ('x','x@y.zz','s','message text')$$, 'anon cannot insert inquiries directly');
select t.fails($$insert into public.shipment_events (shipment_id,status_code,occurred_at) values ('00000000-0000-4000-8000-0000000000a1','delivered',now())$$, 'anon cannot create tracking events');
select t.fails('select public.create_shipment(''{}''::jsonb)', 'anon cannot call create_shipment');
select t.fails('select public.dashboard_stats()', 'anon cannot read dashboard stats');

select t.ok((select count(*) from public.services) = 0, 'anon sees no unpublished services');

-- public tracking of a demo record while demo mode is ON
select t.ok((public.get_public_tracking('DEMO00000001') ->> 'status') = 'arrived_at_facility', 'public tracking returns latest PUBLIC status');
select t.ok(jsonb_array_length(public.get_public_tracking('DEMO00000001') -> 'events') = 3, 'internal event excluded from public timeline');
select t.ok(public.get_public_tracking('DEMO00000001')::text not ilike '%internal note%', 'internal notes never in public payload');
select t.ok(public.get_public_tracking('DEMO00000001')::text not ilike '%Sample Customer A%', 'sender name not in public payload');
select t.ok(public.get_public_tracking('DEMO00000001')::text not ilike '%sample.a@example.com%', 'sender email not in public payload');
select t.ok(public.get_public_tracking('DEMO00000001')::text not ilike '%Sample Recipient%', 'recipient name not in public payload');
select t.ok((public.get_public_tracking('demo-0000 0001') ->> 'tracking_number') = 'DEMO00000001', 'tracking input is normalised (case, spaces, dashes)');
select t.ok(public.get_public_tracking('NOTREAL12345') is null, 'unknown tracking number returns nothing (no fabricated data)');
select t.ok(public.get_public_tracking('x'' or 1=1 --') is null, 'malformed input returns nothing');
select t.ok((public.get_public_tracking('DEMO00000001') ->> 'is_demo')::boolean, 'demo record is labelled as demo');

-- contact form & rate limiting
select t.ok(public.submit_contact_inquiry('Anna', 'Anna@Example.com', 'Question', 'Hello, I have a question.', 'pl') like 'INQ-%', 'anon can submit an inquiry via the function');
select t.fails($$select public.submit_contact_inquiry('', 'a@b.cc', 's', 'long enough message', 'en')$$, 'empty name rejected');
select t.fails($$select public.submit_contact_inquiry('A', 'not-an-email', 's', 'long enough message', 'en')$$, 'invalid email rejected');
select t.ok(public.hit_rate_limit('test:ip1', 3, 60) and public.hit_rate_limit('test:ip1', 3, 60) and public.hit_rate_limit('test:ip1', 3, 60), 'rate limiter allows up to the limit');
select t.ok(not public.hit_rate_limit('test:ip1', 3, 60), 'rate limiter blocks over the limit');
reset role;

\echo '--- operator ---'
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222"}', false);

insert into t.vars
select 'ship', public.create_shipment(jsonb_build_object(
  'sender_name','Jan Kowalski','sender_email','JAN@example.com','origin_country','Poland','origin_city','Kraków',
  'recipient_name','Erika Muster','destination_country','Germany','destination_city','München',
  'package_description','Ceramics','package_quantity','2','weight_kg','3.5','current_status','shipment_registered',
  'internal_notes','fragile - call before delivery','link_sender_as_customer','true','initial_location','Kraków, PL'))::text;

select t.ok((select (v::jsonb ->> 'tracking_number') ~ '^WB[0-9]{11}$' from t.vars where k='ship'), 'server-generated tracking number has expected format');
select t.ok((select current_status from public.shipments where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')) = 'shipment_registered', 'initial status stored');
select t.ok((select count(*) from public.shipment_events where shipment_id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')) = 1, 'initial tracking event created');
select t.ok((select customer_id is not null from public.shipments where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')), 'sender linked as customer');
select t.ok((select created_by = '22222222-2222-4222-8222-222222222222' from public.shipments where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')), 'creator recorded');

-- public event + internal event
insert into public.shipment_events (shipment_id, status_code, occurred_at, location, description, visibility)
select (v::jsonb->>'id')::uuid, 'in_transit', now(), 'Kraków, PL', 'Departed', 'public' from t.vars where k='ship';
insert into public.shipment_events (shipment_id, status_code, occurred_at, location, description, visibility)
select (v::jsonb->>'id')::uuid, 'delayed', now(), 'Kraków, PL', 'Driver note - van issue', 'internal' from t.vars where k='ship';

select t.ok((select current_status from public.shipments where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')) = 'delayed', 'admin status follows latest event (incl. internal)');
select t.ok((public.get_public_tracking((select v::jsonb->>'tracking_number' from t.vars where k='ship')) ->> 'status') = 'in_transit', 'public status ignores internal event');
select t.ok(public.get_public_tracking((select v::jsonb->>'tracking_number' from t.vars where k='ship'))::text not ilike '%van issue%', 'internal event text stays private');
select t.ok(public.get_public_tracking((select v::jsonb->>'tracking_number' from t.vars where k='ship'))::text not ilike '%fragile%', 'internal shipment notes stay private');

-- corrections
select t.fails($$update public.shipment_events set location = 'Warsaw, PL' where status_code = 'in_transit' and description = 'Departed'$$, 'event cannot be edited without a correction reason');
update public.shipment_events set location = 'Katowice, PL', correction_reason = 'Wrong depot entered' where status_code = 'in_transit' and description = 'Departed';
select t.ok((select location from public.shipment_events where description = 'Departed') = 'Katowice, PL', 'event corrected with reason');
select t.fails($$update public.shipment_events set location = 'Łódź, PL', correction_reason = 'Wrong depot entered' where description = 'Departed'$$, 'each correction needs a new reason');
update public.shipment_events set is_voided = true, correction_reason = 'Entered by mistake' where description = 'Driver note - van issue';
select t.ok((select current_status from public.shipments where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')) = 'in_transit', 'voiding an event re-syncs status');
select t.fails($$update public.shipment_events set is_voided = false, correction_reason = 'undo' where description = 'Driver note - van issue'$$, 'voided events cannot be restored');
select t.fails($$delete from public.shipment_events where description = 'Departed'$$, 'operator cannot delete events');
select t.fails($$insert into public.shipment_events (shipment_id,status_code,occurred_at) select (v::jsonb->>'id')::uuid,'delivered',now()+interval '2 days' from t.vars where k='ship'$$, 'events cannot be dated in the future');

-- shipment integrity
select t.fails($$update public.shipments set tracking_number = 'WB99999999999' where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')$$, 'tracking number is permanent');
select t.fails($$update public.shipments set archived_at = now() where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')$$, 'operator cannot archive (needs shipments.archive)');
select t.fails($$delete from public.shipments$$, 'operator cannot delete shipments');
update public.shipments set estimated_delivery = current_date + 3 where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship');
select t.ok((select updated_by = '22222222-2222-4222-8222-222222222222' from public.shipments where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship')), 'edit persisted and stamped');
select t.fails($$insert into public.shipments (tracking_number, sender_name, origin_country, origin_city, recipient_name, destination_country, destination_city) values ((select v::jsonb->>'tracking_number' from t.vars where k='ship'), 'a','b','c','d','e','f')$$, 'duplicate tracking number rejected by database');
select t.fails($$insert into public.shipments (sender_name, origin_country, origin_city, recipient_name, destination_country, destination_city, is_demo) values ('a','b','c','d','e','f', true)$$, 'staff cannot create fake demo-flagged records');

-- other areas
select t.ok(t.rows('select * from public.audit_logs') = 0, 'operator cannot read audit log');
select t.fails($$insert into public.website_content (key, locale, draft_value) values ('home.headline','en','x')$$, 'operator cannot edit website content');
update public.administrator_profiles set role_code = 'owner' where id = '22222222-2222-4222-8222-222222222222';
select t.ok((select role_code from public.administrator_profiles where id = '22222222-2222-4222-8222-222222222222') = 'operator', 'operator cannot promote themselves');
select t.ok((public.dashboard_stats() ->> 'total')::int >= 1, 'dashboard stats readable by staff');
reset role;

\echo '--- viewer ---'
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333"}', false);
select t.ok(t.rows('select * from public.shipments') >= 1, 'viewer can read shipments');
select t.fails($$select public.create_shipment('{"sender_name":"a","origin_country":"b","origin_city":"c","recipient_name":"d","destination_country":"e","destination_city":"f"}')$$, 'viewer cannot create shipments');
select t.fails($$insert into public.shipment_events (shipment_id,status_code,occurred_at) select id,'delivered',now() from public.shipments limit 1$$, 'viewer cannot add events');
update public.shipments set internal_notes = 'hacked';
select t.ok(not exists (select 1 from public.shipments where internal_notes = 'hacked'), 'viewer updates have no effect');
reset role;

\echo '--- inactive admin & signed-in stranger ---'
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444"}', false);
select t.ok(t.rows('select * from public.shipments') = 0, 'deactivated admin sees nothing');
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555"}', false);
select t.ok(t.rows('select * from public.shipments') = 0, 'signed-in non-admin sees no shipments');
select t.ok(t.rows('select * from public.customers') = 0, 'signed-in non-admin sees no customers');
select t.fails('select public.write_audit_event(''login'')', 'non-admin cannot write audit events');
reset role;

\echo '--- owner ---'
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111"}', false);
select t.ok(t.rows('select * from public.audit_logs where table_name = ''shipment_events'' and action = ''update''') >= 2, 'event corrections recorded in audit log');
select t.ok(exists (select 1 from public.audit_logs where table_name = 'shipment_events' and action = 'update' and old_data ->> 'location' = 'Kraków, PL' and new_data ->> 'location' = 'Katowice, PL'), 'audit log keeps original and corrected values');
select t.fails($$update public.audit_logs set summary = 'x'$$, 'audit log cannot be modified');
select t.fails($$delete from public.audit_logs$$, 'audit log cannot be deleted');
select t.fails($$update public.administrator_profiles set role_code = 'manager' where id = '11111111-1111-4111-8111-111111111111'$$, 'last owner cannot be demoted');
update public.administrator_profiles set role_code = 'manager' where id = '22222222-2222-4222-8222-222222222222';
select t.ok((select role_code from public.administrator_profiles where id = '22222222-2222-4222-8222-222222222222') = 'manager', 'owner can change roles');
update public.shipments set archived_at = now() where id = (select (v::jsonb->>'id')::uuid from t.vars where k='ship');
select t.ok(public.get_public_tracking((select v::jsonb->>'tracking_number' from t.vars where k='ship')) is null, 'archived shipment hidden from public tracking');
select t.fails($$insert into public.shipment_events (shipment_id,status_code,occurred_at) select (v::jsonb->>'id')::uuid,'delivered',now() from t.vars where k='ship'$$, 'no events on archived shipments');
insert into public.website_content (key, locale, draft_value) values ('home.headline', 'en', 'Draft headline');
select t.ok(not exists (select 1 from public.get_published_content('en') where key = 'home.headline'), 'drafts are not public until published');
update public.website_content set published_value = draft_value, published_at = now() where key = 'home.headline';
select t.ok(exists (select 1 from public.get_published_content('en') where key = 'home.headline' and value = 'Draft headline'), 'published content becomes public');
update public.services set is_published = true where slug = 'international-parcel';
select public.write_audit_event('test.event', null, null, 'owner wrote an app event');
reset role;

\echo '--- demo mode off ---'
update public.site_settings set value = 'false'::jsonb where key = 'demo_mode';
set role anon;
select set_config('request.jwt.claims', '', false);
select t.ok(public.get_public_tracking('DEMO00000001') is null, 'demo shipments hidden when demo mode is off');
select t.ok((select count(*) from public.services) = 1, 'anon sees published service');
select t.ok((public.get_public_settings() ->> 'demo_mode')::boolean = false, 'public settings expose demo flag only');
reset role;

\echo '--- demo removal ---'
\i supabase/demo_remove.sql
select t.ok(not exists (select 1 from public.shipments where is_demo), 'demo shipments removed');
select t.ok(exists (select 1 from public.shipments where not is_demo), 'real shipments untouched by demo removal');

\echo 'ALL DATABASE TESTS PASSED'
