import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import type { PaymentStatus } from "@/features/orders/types";

export interface OrderAddress {
  country: string;
  city: string;
  address: string;
  zip: string;
}

/*
 * What the backend will receive when an order is placed. It deliberately has no
 * card fields: card details are never sent to our server. Real payments go
 * through the payment provider's secure card fields, and the backend only gets
 * a token from the provider.
 */
export interface PlaceOrderInput {
  contact: { email: string; phone: string };
  shipping: OrderAddress & { company?: string };
  /** "same" when the shopper billed to the shipping address. */
  billing: OrderAddress | "same";
  paymentMethod: PaymentMethod;
  items: {
    productId: string;
    quantity: number;
    size?: string;
    color?: string;
  }[];
}

export interface PlacedOrder {
  /** Order code shown to the shopper, e.g. "#0123_45678". */
  code: string;
  /** ISO date-time. */
  placedAt: string;
  paymentStatus: PaymentStatus;
}

/**
 * Mock of POST /orders until the backend exists. It has the shape of the real
 * call (async, takes the order details), so only this function changes when
 * the API is wired up. The mock always reports the payment as paid.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  void input;
  await new Promise((resolve) => setTimeout(resolve, 900));
  const part = (digits: number) =>
    String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, "0");
  return {
    code: `#${part(4)}_${part(5)}`,
    placedAt: new Date().toISOString(),
    paymentStatus: "paid",
  };
}
