import { TextField, TextAreaField, SelectField, CheckboxField, Fieldset, CountryList } from "./fields";

export type ShipmentDefaults = Partial<{
  shipment_type: string;
  service_id: string | null;
  shipment_date: string;
  sender_name: string;
  sender_email: string | null;
  sender_phone: string | null;
  origin_country: string;
  origin_city: string;
  origin_address: string | null;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  destination_country: string;
  destination_city: string;
  destination_address: string | null;
  package_description: string | null;
  package_quantity: number;
  weight_kg: number | null;
  estimated_delivery: string | null;
  internal_notes: string | null;
  is_published: boolean;
}>;

export function ShipmentFields({
  d = {},
  services,
}: {
  d?: ShipmentDefaults;
  services: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-6">
      <CountryList />
      <Fieldset legend="Shipment" description="Type, service and dates.">
        <SelectField
          name="shipment_type"
          label="Shipment type"
          required
          defaultValue={d.shipment_type ?? "parcel"}
          options={[
            { value: "parcel", label: "Parcel" },
            { value: "document", label: "Documents" },
            { value: "freight", label: "Freight" },
            { value: "pallet", label: "Pallet" },
            { value: "other", label: "Other" },
          ]}
        />
        <SelectField
          name="service_id"
          label="Shipping service"
          defaultValue={d.service_id ?? ""}
          options={[{ value: "", label: "— Not specified —" }, ...services.map((s) => ({ value: s.id, label: s.label }))]}
        />
        <TextField name="shipment_date" label="Shipment date" type="date" defaultValue={d.shipment_date ?? new Date().toISOString().slice(0, 10)} />
        <TextField name="estimated_delivery" label="Estimated delivery date" type="date" defaultValue={d.estimated_delivery} hint="Optional. Shown to customers as an estimate." />
      </Fieldset>

      <Fieldset legend="Sender" description="Private — never shown on the public tracking page.">
        <TextField name="sender_name" label="Sender name" required maxLength={200} defaultValue={d.sender_name} className="sm:col-span-2" />
        <TextField name="sender_email" label="Sender email" type="email" maxLength={254} defaultValue={d.sender_email} />
        <TextField name="sender_phone" label="Sender phone" type="tel" maxLength={40} defaultValue={d.sender_phone} />
        <TextField name="origin_country" label="Origin country" required list="countries" maxLength={100} defaultValue={d.origin_country} />
        <TextField name="origin_city" label="Origin city" required maxLength={100} defaultValue={d.origin_city} />
        <TextAreaField name="origin_address" label="Origin address" rows={2} maxLength={500} defaultValue={d.origin_address} className="sm:col-span-2" />
      </Fieldset>

      <Fieldset legend="Recipient" description="Private — only the city and country appear publicly.">
        <TextField name="recipient_name" label="Recipient name" required maxLength={200} defaultValue={d.recipient_name} className="sm:col-span-2" />
        <TextField name="recipient_email" label="Recipient email" type="email" maxLength={254} defaultValue={d.recipient_email} />
        <TextField name="recipient_phone" label="Recipient phone" type="tel" maxLength={40} defaultValue={d.recipient_phone} />
        <TextField name="destination_country" label="Destination country" required list="countries" maxLength={100} defaultValue={d.destination_country} />
        <TextField name="destination_city" label="Destination city" required maxLength={100} defaultValue={d.destination_city} />
        <TextAreaField name="destination_address" label="Destination address" rows={2} maxLength={500} defaultValue={d.destination_address} className="sm:col-span-2" />
      </Fieldset>

      <Fieldset legend="Package" description="Contents and handling.">
        <TextAreaField name="package_description" label="Package description" rows={2} maxLength={1000} defaultValue={d.package_description} className="sm:col-span-2" />
        <TextField name="package_quantity" label="Number of packages" type="number" min="1" step="1" required defaultValue={d.package_quantity ?? 1} />
        <TextField name="weight_kg" label="Total weight (kg)" type="number" min="0" step="0.001" defaultValue={d.weight_kg ?? ""} />
        <TextAreaField
          name="internal_notes"
          label="Internal notes"
          rows={3}
          maxLength={10000}
          defaultValue={d.internal_notes}
          hint="Staff only. Never shown to customers."
          className="sm:col-span-2"
        />
        <CheckboxField
          name="is_published"
          label="Publish tracking page"
          defaultChecked={d.is_published ?? true}
          hint="When off, the tracking number returns “not found” on the public site."
          className="sm:col-span-2"
        />
      </Fieldset>
    </div>
  );
}
