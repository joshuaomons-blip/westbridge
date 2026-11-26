-- Vehicle shipments: new shipment type and vehicle details (staff only;
-- printed on the receipt and label, not returned by public tracking).
alter table public.shipments drop constraint if exists shipments_shipment_type_check;
alter table public.shipments add constraint shipments_shipment_type_check
  check (shipment_type in ('parcel','document','freight','pallet','vehicle','other'));
alter table public.shipments
  add column if not exists vehicle_make  text check (vehicle_make  is null or char_length(vehicle_make)  <= 60),
  add column if not exists vehicle_model text check (vehicle_model is null or char_length(vehicle_model) <= 60),
  add column if not exists vehicle_year  int  check (vehicle_year  is null or vehicle_year between 1900 and 2100),
  add column if not exists vehicle_color text check (vehicle_color is null or char_length(vehicle_color) <= 40),
  add column if not exists vehicle_vin   text check (vehicle_vin   is null or vehicle_vin ~ '^[A-HJ-NPR-Z0-9]{11,17}$');
