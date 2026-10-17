-- Automatic shipment emails: per-shipment switch and the language emails are written in.
alter table public.shipments
  add column if not exists notify_emails boolean not null default true,
  add column if not exists notify_locale text not null default 'en';

alter table public.shipments drop constraint if exists shipments_notify_locale_check;
alter table public.shipments
  add constraint shipments_notify_locale_check check (notify_locale in ('en','pl','ja','es','de'));
