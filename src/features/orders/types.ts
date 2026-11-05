import type { PaymentMethod } from "@/features/orders/payment-methods";
import type { ProductImage } from "@/types/product";
import type { CurrencyCode, RegionCode } from "@/types/region";

/** Where an order is in its life. Set by the server, never by the browser. */
export type OrderStatus =
  | "waiting_payment"
  | "processing"
  | "in_delivery"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "awaiting_verification"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

/** The newest payment proof of a transfer order and what staff made of it. */
export interface PaymentProof {
  status: "pending" | "approved" | "rejected";
  /** Why staff rejected it, so the shopper can fix it. */
  rejectionReason: string | null;
  submittedAt: string;
}

export interface OrderItem {
  slug: string;
  name: string;
  image?: ProductImage;
  /** The variant that was bought, e.g. "Army" and "XL". */
  color?: string;
  size?: string;
  quantity: number;
  /** Minor units, as they were when the order was placed. */
  unitAmount: number;
  lineTotal: number;
}

export interface OrderAddress {
  country: string;
  city: string;
  address: string;
  zip: string;
}

/** An order exactly as the server holds it. Amounts are minor units (cents/paisa). */
export interface Order {
  /** Shown to the shopper and used in URLs, e.g. "LZ-PK-000123". */
  number: string;
  market: RegionCode;
  currency: CurrencyCode;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  /** "simulated" only in development, "manual" for cash and transfers; null when no payment was started. */
  paymentProvider: string | null;
  /** For a transfer: the newest proof sent. Null until one is sent. */
  paymentProof: PaymentProof | null;
  /** ISO 8601. */
  placedAt: string;
  paidAt: string | null;
  /** While unpaid: when the held stock is given back. */
  reservationExpiresAt: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  /** With `taxIncluded`, the part of `total` that is tax. */
  taxTotal: number;
  /** null: no tax worked out. true: the tax is already inside the prices. false: added on top. */
  taxIncluded: boolean | null;
  total: number;
  email: string;
  phone: string;
  shipping: OrderAddress & { name: string; company?: string };
  billing: OrderAddress | null;
  items: OrderItem[];
}
