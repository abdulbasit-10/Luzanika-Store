import Image from "next/image";

import type { OrderItem } from "@/features/orders/types";

const MAX_SHOWN = 5;

/** Product photos of the order, each with its quantity in a small badge. */
export function OrderItemThumbnails({ items }: { items: OrderItem[] }) {
  const shown = items.slice(0, MAX_SHOWN);
  const hidden = items.length - shown.length;

  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-3">
      {shown.map(({ name, image, quantity }, index) => (
        <li key={`${name}-${index}`} className="relative">
          <span className="relative block size-14 overflow-hidden bg-muted">
            {image ? (
              <Image
                src={image.src}
                alt=""
                fill
                sizes="64px"
                style={{ objectPosition: image.position }}
                className="object-cover"
              />
            ) : null}
          </span>
          <span
            aria-hidden
            className="absolute -top-2 -right-2 flex size-[22px] items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
          >
            {quantity}
          </span>
          <span className="sr-only">
            {name}, quantity {quantity}
          </span>
        </li>
      ))}
      {hidden > 0 ? (
        <li className="flex size-14 items-center justify-center text-sm text-muted-foreground">
          +{hidden} more
        </li>
      ) : null}
    </ul>
  );
}
