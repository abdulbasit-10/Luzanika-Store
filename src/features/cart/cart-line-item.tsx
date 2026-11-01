"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { toast } from "@/components/ui/toaster";
import { isBuyable, type CartLine } from "@/features/cart/cart-service";
import { getUnitPrice } from "@/features/cart/cart-totals";
import { useCart } from "@/features/cart/use-cart";
import type { RegionCode } from "@/types/region";
import { formatRegionalPrice } from "@/utils/format-currency";

/** What to tell the shopper when the line is not simply "in stock, as asked". */
function describeProblem(line: CartLine) {
  switch (line.status) {
    case "adjusted":
      return `Only ${line.available} available. We lowered the quantity from ${line.requestedQuantity}.`;
    case "out_of_stock":
      return "Out of stock right now. It stays in your cart, but is not included in the total.";
    case "unavailable":
      return "No longer available. Please remove it from your cart.";
    default:
      return null;
  }
}

/** The line under the name: scent notes, or the chosen size (and color when it is not the only one). */
function describeLine(line: CartLine) {
  if (line.notes?.length) return line.notes.join(" · ");
  return [line.size && `Size: ${line.size}`, line.color]
    .filter(Boolean)
    .join(" · ");
}

export function CartLineItem({
  line,
  region,
}: {
  line: CartLine;
  region: RegionCode;
}) {
  const { setQuantity, toggleSelected, removeItem, addItem } = useCart();

  const href = `/products/${line.slug}`;
  const unitPrice = getUnitPrice(line);
  const description = describeLine(line);
  const problem = describeProblem(line);
  const buyable = isBuyable(line);

  function remove() {
    removeItem(line.variantId);
    toast(`${line.name} removed from your cart`, {
      action: {
        label: "Undo",
        onClick: () => {
          void addItem({
            variantId: line.variantId,
            quantity: Math.max(1, line.requestedQuantity),
            name: line.name,
          });
        },
      },
    });
  }

  return (
    <li className="grid grid-cols-[18px_64px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 border-t border-black/[0.06] py-3.5 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[18px_72px_minmax(0,1fr)_auto] lg:gap-x-[18px]">
      <Checkbox
        aria-label={`Select ${line.name}`}
        checked={line.selected}
        disabled={!buyable}
        onChange={() => toggleSelected(line.variantId, !line.selected)}
        className="items-center"
      />

      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="block size-16 rounded-lg bg-white p-1.5 lg:size-[72px]"
      >
        <span className="relative block size-full overflow-hidden rounded bg-muted">
          {line.image ? (
            <Image
              src={line.image.src}
              alt=""
              fill
              sizes="72px"
              style={{ objectPosition: line.image.position }}
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden className="size-5" />
            </span>
          )}
        </span>
      </Link>

      <div className="min-w-0">
        <h3 className="font-heading text-base leading-6 font-semibold text-balance lg:text-lg">
          <Link href={href} className="hover:underline">
            {line.name}
          </Link>
        </h3>
        {description ? (
          <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
            {description}
          </p>
        ) : null}
        {buyable && unitPrice !== undefined ? (
          <p className="mt-1 text-base leading-6 font-bold lg:text-[17px]">
            {formatRegionalPrice(unitPrice * line.quantity, region)}
          </p>
        ) : null}
        {problem ? (
          <p
            role="status"
            className="mt-1 text-[13px] leading-[18px] font-medium text-red-700"
          >
            {problem}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 col-start-2 flex items-center gap-2.5 lg:col-span-1 lg:col-start-auto">
        {buyable ? (
          <QuantityStepper
            variant="outlined"
            value={line.quantity}
            max={line.available}
            onChange={(quantity) => setQuantity(line.variantId, quantity)}
            className="w-[104px]"
          />
        ) : null}
        <button
          type="button"
          aria-label={`Remove ${line.name} from cart`}
          onClick={remove}
          className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-foreground transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </li>
  );
}
