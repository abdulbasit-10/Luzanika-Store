import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

import type { AdminOrderListItem } from "./admin-orders-service";
import {
  ORDER_STATUS_TONE,
  orderStatusLabel,
  type StatusTone,
} from "./orders-labels";

const CHIP_STYLE: Record<StatusTone, string> = {
  pending: "border-[#ff9f24]/10 bg-[#ff9f24]/10 text-[#ff9f24]",
  success: "border-[#279f51]/10 bg-[#279f51]/10 text-success",
  failed: "border-danger/10 bg-[#feeff2] text-danger",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function StatusChip({
  status,
  deleted,
  children,
}: {
  status: AdminOrderListItem["status"];
  /** A deleted order reads "Deleted", whatever its stored status. */
  deleted?: boolean;
  /** Something after the words, such as the dropdown arrow. */
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium tracking-[0.2px] whitespace-nowrap",
        CHIP_STYLE[deleted ? "neutral" : ORDER_STATUS_TONE[status]],
      )}
    >
      {deleted ? "Deleted" : orderStatusLabel(status)}
      {children}
    </span>
  );
}
