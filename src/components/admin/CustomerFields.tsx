import { TextField, TextAreaField, CountryList } from "./fields";

export type CustomerDefaults = Partial<{
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
}>;

export function CustomerFields({ d = {} }: { d?: CustomerDefaults }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CountryList />
      <TextField name="full_name" label="Full name" required maxLength={200} defaultValue={d.full_name} />
      <TextField name="company" label="Company" maxLength={200} defaultValue={d.company} />
      <TextField name="email" label="Email" type="email" maxLength={254} defaultValue={d.email} />
      <TextField name="phone" label="Phone" type="tel" maxLength={40} defaultValue={d.phone} />
      <TextField name="country" label="Country" list="countries" maxLength={100} defaultValue={d.country} />
      <TextField name="city" label="City" maxLength={100} defaultValue={d.city} />
      <TextAreaField name="address" label="Address" rows={2} maxLength={500} defaultValue={d.address} className="sm:col-span-2" />
      <TextAreaField name="notes" label="Internal notes" rows={3} maxLength={5000} defaultValue={d.notes} hint="Staff only." className="sm:col-span-2" />
    </div>
  );
}
