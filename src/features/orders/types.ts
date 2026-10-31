import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import type { ProductImage } from "@/types/product";
import type { RegionCode } from "@/types/region";

export type PaymentStatus = "paid" | "pending";

/** Where an order is in its life, as shown in the order history. */
export type OrderStatus =
  "waiting_payment" | "processing" | "in_delivery" | "completed";

export interface ConfirmedOrderItem {
  name: string;
  image?: ProductImage;
  quantity: number;
  /** The variant that was bought, e.g. "Army" and "XL". */
  color?: string;
  size?: string;
}

/**
 * What the confirmation page and the order history show. The backend will
 * return this shape from GET /orders/:id and GET /orders; until then it is
 * built when the mock order is placed.
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
  /** Set by the backend as the order moves along. Orders placed before it existed have none; see getOrderStatus. */
  status?: OrderStatus;
  email: string;
  items: ConfirmedOrderItem[];
}
