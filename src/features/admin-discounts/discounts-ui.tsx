import { cn } from "@/utils/cn";

import type { DiscountStatus } from "./admin-discounts-service";

const LABEL: Record<DiscountStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  ended: "Ended",
  off: "Off",
};

const STYLE: Record<DiscountStatus, string> = {
  active: "border-[#279f51]/10 bg-[#279f51]/10 text-success",
  scheduled: "border-[#ff9f24]/10 bg-[#ff9f24]/10 text-[#ff9f24]",
  ended: "border-border bg-muted text-muted-foreground",
  off: "border-danger/10 bg-[#feeff2] text-danger",
};

export function DiscountStatusChip({ status }: { status: DiscountStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLE[status],
      )}
    >
      {LABEL[status]}
    </span>
  );
}

export const MARKET_NAME = { PK: "Pakistan", DE: "Germany" } as const;
