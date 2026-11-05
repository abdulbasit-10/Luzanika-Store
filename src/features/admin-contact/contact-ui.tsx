import { cn } from "@/utils/cn";

import type { ContactStatus } from "./admin-contact-service";

const STATUS_LABEL: Record<ContactStatus, string> = {
  new: "New",
  replied: "Replied",
};

const STATUS_STYLE: Record<ContactStatus, string> = {
  new: "border-[#ff9f24]/10 bg-[#ff9f24]/10 text-[#ff9f24]",
  replied: "border-[#279f51]/10 bg-[#279f51]/10 text-success",
};

export function ContactStatusChip({ status }: { status: ContactStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
