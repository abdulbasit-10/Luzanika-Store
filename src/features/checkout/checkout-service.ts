import type { PaymentMethod } from "@/features/checkout/checkout-schema";

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
  orderNumber: string;
}

/**
 * Mock of POST /orders until the backend exists. It has the shape of the real
 * call (async, takes the order details), so only this function changes when
 * the API is wired up.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  void input;
  await new Promise((resolve) => setTimeout(resolve, 900));
  const digits = Math.floor(100000 + Math.random() * 900000);
  return { orderNumber: `LZ-${digits}` };
}
