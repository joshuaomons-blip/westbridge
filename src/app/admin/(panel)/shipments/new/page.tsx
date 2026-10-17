import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { getServiceOptions } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ShipmentFields } from "@/components/admin/ShipmentFields";
import { TextField, SelectField, CheckboxField, Fieldset } from "@/components/admin/fields";
import { createShipment } from "@/actions/admin/shipments";
import { STATUS_ADMIN_LABEL } from "@/lib/statuses";

export const metadata: Metadata = { title: "Create shipment" };

export default async function NewShipmentPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  await requirePermission("shipments.write");
  const { customer } = await searchParams;
  const services = await getServiceOptions();

  // Optional: prefill from an existing customer (/admin/shipments/new?customer=<id>)
  let prefill: { id: string; full_name: string; email: string | null; phone: string | null; country: string | null; city: string | null; address: string | null } | null = null;
  if (customer && /^[0-9a-f-]{36}$/i.test(customer)) {
    const db = await createSessionClient();
    const { data } = await db.from("customers").select("id, full_name, email, phone, country, city, address").eq("id", customer).maybeSingle();
    prefill = data;
  }

  return (
    <>
      <PageHeader
        title="Create shipment"
        description="A unique tracking number is generated automatically when you save."
        back={{ href: "/admin/shipments", label: "Shipments" }}
      />
      <ActionForm action={createShipment} className="max-w-4xl space-y-6">
        {prefill && <input type="hidden" name="customer_id" value={prefill.id} />}
        <ShipmentFields
          services={services}
          d={
            prefill
              ? {
                  sender_name: prefill.full_name,
                  sender_email: prefill.email,
                  sender_phone: prefill.phone,
                  origin_country: prefill.country ?? undefined,
                  origin_city: prefill.city ?? undefined,
                  origin_address: prefill.address,
                }
              : {}
          }
        />
        <Fieldset legend="First tracking event" description="Recorded now and shown on the public tracking page.">
          <SelectField
            name="current_status"
            label="Initial status"
            defaultValue="shipment_registered"
            options={(["shipment_created", "shipment_registered", "awaiting_dispatch"] as const).map((s) => ({ value: s, label: STATUS_ADMIN_LABEL[s] }))}
          />
          <TextField name="initial_location" label="Location" placeholder="e.g. Warsaw, PL" maxLength={200} />
          <TextField name="initial_description" label="Customer-facing note" placeholder="Optional" maxLength={1000} className="sm:col-span-2" />
          {!prefill && (
            <CheckboxField
              name="link_sender_as_customer"
              label="Save the sender as a customer"
              defaultChecked
              hint="Links to an existing customer with the same email, or creates a new customer record."
              className="sm:col-span-2"
            />
          )}
        </Fieldset>
        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-slate-200 bg-slate-100/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-white">
          <SubmitButton pendingText="Creating…" className="btn-primary px-6">
            Create shipment & generate tracking number
          </SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
