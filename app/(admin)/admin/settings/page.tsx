import { BusinessSettingsForm } from "@/components/admin/business-settings-form";

export default function AdminSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure the tax rate, service charge, and senior/PWD discount rate used across the
        Sales module — Order Placement (tax/service charge) and Payment Confirmation (discount).
      </p>

      <div className="mt-6">
        <BusinessSettingsForm />
      </div>
    </main>
  );
}
