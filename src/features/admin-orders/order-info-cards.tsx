import { Mail, MapPin, Phone, ReceiptText, User } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/utils/cn";

import { orderStatusLabel } from "./orders-labels";
import type { AdminOrderDetail } from "./order-detail-service";
import { DetailCard, dateTimeFormat } from "./order-detail-ui";

/** One line of the customer card: a tinted icon, a small label and the value. */
function InfoRow({
  icon: Icon,
  tint,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tint: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          tint,
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-[#6f7b8c]">{label}</dt>
        <dd className="text-sm break-words text-foreground">{children}</dd>
      </div>
    </div>
  );
}

/** Who ordered it, how to reach them, where it goes and where the bill goes. */
export function OrderCustomerCard({ order }: { order: AdminOrderDetail }) {
  const { shipping, billing, contact } = order;
  return (
    <DetailCard title="Customer Information">
      <dl className="flex flex-col gap-[clamp(0.375rem,1dvh,0.625rem)]">
        <InfoRow icon={User} tint="bg-[#e8ecfd] text-[#5468e7]" label="Name">
          {shipping.name}
        </InfoRow>
        <InfoRow icon={Phone} tint="bg-[#e3f4e8] text-success" label="Phone">
          {contact.phone || "—"}
        </InfoRow>
        <InfoRow icon={Mail} tint="bg-[#feeff2] text-danger" label="Email">
          <a
            href={`mailto:${contact.email}`}
            className="underline-offset-2 hover:underline"
          >
            {contact.email}
          </a>
        </InfoRow>
        <InfoRow
          icon={MapPin}
          tint="bg-[#fff1dc] text-[#ff9f24]"
          label="Ship to"
        >
          {shipping.company ? `${shipping.company}, ` : ""}
          {shipping.address}, {shipping.zip} {shipping.city}, {shipping.country}
        </InfoRow>
        {billing ? (
          <InfoRow
            icon={ReceiptText}
            tint="bg-[#e8ecfd] text-[#5468e7]"
            label="Bill to"
          >
            {billing.address}, {billing.zip} {billing.city}, {billing.country}
          </InfoRow>
        ) : null}
      </dl>
    </DetailCard>
  );
}

/** Every move the order made, newest first, and who made it. */
export function OrderHistoryCard({ order }: { order: AdminOrderDetail }) {
  const entries = [...order.history].reverse();
  return (
    <DetailCard title="History">
      <ol className="flex flex-col gap-2.5">
        {entries.map((entry) => (
          <li key={`${entry.at}-${entry.to}`} className="flex gap-3 text-sm">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground"
            />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {entry.from === null
                  ? `Order placed (${orderStatusLabel(entry.to)})`
                  : entry.from === entry.to
                    ? "Order details updated"
                    : `${orderStatusLabel(entry.from)} → ${orderStatusLabel(entry.to)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {dateTimeFormat.format(new Date(entry.at))} ·{" "}
                {entry.actor ? entry.actor.name : entry.actorType}
              </p>
              {entry.note ? (
                <p className="text-xs text-foreground">“{entry.note}”</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </DetailCard>
  );
}
