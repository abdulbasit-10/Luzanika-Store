import { cn } from "@/utils/cn";
import { formatMinor } from "@/features/admin-shell/admin-money";
import type { RegionCode } from "@/types/region";

import type { Price, ProductStatus } from "./admin-products-service";

const CHIP: Record<ProductStatus | "deleted", string> = {
  active: "border-[#279f51]/10 bg-[#279f51]/10 text-success",
  draft: "border-[#ff9f24]/10 bg-[#ff9f24]/10 text-[#ff9f24]",
  archived: "border-border bg-muted text-muted-foreground",
  deleted: "border-danger/10 bg-[#feeff2] text-danger",
};

const LABEL: Record<ProductStatus | "deleted", string> = {
  active: "On sale",
  draft: "Draft",
  archived: "Archived",
  deleted: "Deleted",
};

/** The small coloured status of a product; a deleted product shows "Deleted" whatever its status. */
export function ProductStatusChip({
  status,
  deleted,
}: {
  status: ProductStatus;
  deleted?: boolean;
}) {
  const key = deleted ? "deleted" : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-[0.2px] whitespace-nowrap",
        CHIP[key],
      )}
    >
      {LABEL[key]}
    </span>
  );
}

export const CURRENCY_OF: Record<RegionCode, "PKR" | "EUR"> = {
  PK: "PKR",
  DE: "EUR",
};

/** "PKR 890", with the old price struck through when there is one. */
export function PriceText({
  price,
  market,
}: {
  price: Price | null;
  market: RegionCode;
}) {
  if (!price) {
    return <span className="text-muted-foreground">Not sold</span>;
  }
  return (
    <span>
      {formatMinor(price.amount, CURRENCY_OF[market])}
      {price.compareAtAmount ? (
        <span className="ml-1.5 text-xs text-muted-foreground line-through">
          {formatMinor(price.compareAtAmount, CURRENCY_OF[market])}
        </span>
      ) : null}
    </span>
  );
}
