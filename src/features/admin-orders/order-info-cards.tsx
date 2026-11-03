import { orderStatusLabel } from "./orders-labels";
import type { AdminOrderDetail } from "./order-detail-service";
import { DetailCard, Fact, dateTimeFormat } from "./order-detail-ui";

/** Who ordered it, where it goes and where the bill goes. */
export function OrderCustomerCard({ order }: { order: AdminOrderDetail }) {
  const { shipping, billing, contact } = order;
  return (
    <DetailCard title="Customer & delivery">
      <dl className="grid grid-cols-2 gap-3">
        <Fact label="Name">{shipping.name}</Fact>
        <Fact label="Phone">{contact.phone || "—"}</Fact>
        <div className="col-span-2">
          <Fact label="Email">
            <a
              href={`mailto:${contact.email}`}
              className="underline-offset-2 hover:underline"
            >
              {contact.email}
            </a>
          </Fact>
        </div>
        <div className="col-span-2">
          <Fact label="Ship to">
            {shipping.company ? `${shipping.company}, ` : ""}
            {shipping.address}, {shipping.zip} {shipping.city},{" "}
            {shipping.country}
          </Fact>
        </div>
        {billing ? (
          <div className="col-span-2">
            <Fact label="Bill to">
              {billing.address}, {billing.zip} {billing.city}, {billing.country}
            </Fact>
          </div>
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
