"use client";

import { useQuery } from "@tanstack/react-query";

import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";

import { fetchAdminSettings } from "./admin-settings-service";
import { PaymentAccountsCard } from "./payment-accounts-card";
import { ContactCard, ShippingTaxCard } from "./pricing-contact-cards";

/** Shop settings: where customers pay, shipping fees, VAT and contact details. */
export function AdminSettingsView() {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);
  const canView = can("settings.view");
  const canEdit = can("settings.manage");

  const query = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchAdminSettings,
    enabled: canView,
  });
  const settings = query.data;

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      <AdminPageHead
        title="Settings"
        subtitle="Where customers pay, shipping fees, VAT and your contact details."
      />
      {!canView ? (
        <p className="text-sm text-muted-foreground">
          Your role does not include the settings.
        </p>
      ) : !settings ? (
        <p
          role={query.isError ? "alert" : "status"}
          className={
            query.isError
              ? "text-sm text-danger"
              : "text-sm text-muted-foreground"
          }
        >
          {query.isError
            ? "We couldn't load the settings. Check your connection and reload the page."
            : "Loading settings…"}
        </p>
      ) : (
        <div className="grid items-start gap-[clamp(0.5rem,1.6dvh,1.25rem)] lg:grid-cols-2">
          {/* The key remounts a card with the saved values after each save. */}
          <PaymentAccountsCard
            key={`pay-${settings.updatedAt}`}
            settings={settings}
            canEdit={canEdit}
          />
          <div className="flex flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
            <ShippingTaxCard
              key={`ship-${settings.updatedAt}`}
              settings={settings}
              canEdit={canEdit}
            />
            <ContactCard
              key={`contact-${settings.updatedAt}`}
              settings={settings}
              canEdit={canEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
