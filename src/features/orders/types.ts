import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import type { ProductImage } from "@/types/product";
import type { RegionCode } from "@/types/region";

export type PaymentStatus = "paid" | "pending";

export interface ConfirmedOrderItem {
  name: string;
  image?: ProductImage;
  quantity: number;
}

/**
 * What the confirmation page shows. The backend will return this shape from
 * GET /orders/:id; until then it is built when the mock order is placed.
 */
export interface ConfirmedOrder {
  /** Order code shown to the shopper, e.g. "#0123_45678". */
  code: string;
  /** ISO date-time. */
  placedAt: string;
  /** Total in the region's currency. */
  total: number;
  region: RegionCode;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  email: string;
  items: ConfirmedOrderItem[];
}
