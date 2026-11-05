import { cn } from "@/utils/cn";

import type { CustomerStatus } from "./admin-customers-service";

const CHIP: Record<CustomerStatus, string> = {
  active: "border-[#279f51]/10 bg-[#279f51]/10 text-success",
  blocked: "border-danger/10 bg-[#feeff2] text-danger",
  anonymised: "border-border bg-muted text-muted-foreground",
};

const LABEL: Record<CustomerStatus, string> = {
  active: "Active",
  blocked: "Blocked",
  anonymised: "Account deleted",
};

export function CustomerStatusChip({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-[0.2px] whitespace-nowrap",
        CHIP[status],
      )}
    >
      {LABEL[status]}
    </span>
  );
}

/** "Ayesha Khan", or the email when the name is empty (a deleted account has none). */
export function customerName(customer: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  return `${customer.firstName} ${customer.lastName}`.trim() || customer.email;
}

const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatDay = (iso: string | null): string =>
  iso ? day.format(new Date(iso)) : "—";
