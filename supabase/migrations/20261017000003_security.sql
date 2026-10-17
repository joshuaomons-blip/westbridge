-- =====================================================================
-- Westbridge Global Express — Row Level Security and grants
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
