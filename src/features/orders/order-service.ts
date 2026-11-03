import { withKnownErrors } from "@/features/auth/auth-service";
import type {
  PaymentMethod,
  PaymentOptions,
} from "@/features/orders/payment-methods";
import type { Order } from "@/features/orders/types";
import { apiGet, apiPost } from "@/lib/api-client";
import type { RegionCode } from "@/types/region";

export interface PlaceOrderInput {
  market: RegionCode;
  contact: { email: string; phone: string };
  shipping: {
    fullName: string;
    company?: string;
    country: string;
    city: string;
    address: string;
    zip: string;
  };
  /** "same" when the shopper billed to the shipping address. */
  billing:
    { country: string; city: string; address: string; zip: string } | "same";
  paymentMethod: PaymentMethod;
  acceptTerms: true;
  /**
   * What the shopper saw. The server only places the order if it finds exactly
   * this, so nobody pays an amount they did not see. There are no card
   * details here: they never pass through our server.
   */
  expected: {
    total: number;
    items: { variantId: string; quantity: number }[];
  };
}

export interface PlacedOrder {
  order: Order;
  payment: { provider: string; clientSecret?: string };
}

/**
 * POST /orders. `idempotencyKey` is made once per checkout attempt, so a
 * double click or a retry after a bad connection returns the same order
 * instead of making another. Rejects with AuthError("cart_changed") when the
 * cart is no longer what the shopper saw, and "out_of_stock" for stock errors.
 */
export async function placeOrder(
  input: PlaceOrderInput,
  idempotencyKey: string,
): Promise<PlacedOrder> {
  return withKnownErrors(() =>
    apiPost<PlacedOrder>("/orders", input, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  );
}

/** GET /payment-methods?market=: the ways to pay in a market, with the account details of the transfers that are set up. */
export async function fetchPaymentOptions(
  market: RegionCode,
): Promise<PaymentOptions> {
  return withKnownErrors(() =>
    apiGet<PaymentOptions>("/payment-methods", { params: { market } }),
  );
}

/**
 * POST /orders/:number/payment-proof: the shopper says they paid by bank
 * transfer, Easypaisa or JazzCash. Needs a transaction ID and/or a screenshot;
 * staff then check it. The server shrinks and cleans the picture.
 */
export async function sendPaymentProof(
  number: string,
  proof: { transactionId?: string; screenshot?: File },
): Promise<Order> {
  const form = new FormData();
  if (proof.transactionId) form.set("transactionId", proof.transactionId);
  if (proof.screenshot) form.set("screenshot", proof.screenshot);
  const { order } = await withKnownErrors(() =>
    apiPost<{ order: Order }>(
      `/orders/${encodeURIComponent(number)}/payment-proof`,
      form,
    ),
  );
  return order;
}

/** GET /orders: newest first. */
export async function fetchOrders(): Promise<Order[]> {
  const { items } = await withKnownErrors(() =>
    apiGet<{ items: Order[] }>("/orders"),
  );
  return items;
}

/** GET /orders/:number */
export async function fetchOrder(number: string): Promise<Order> {
  const { order } = await withKnownErrors(() =>
    apiGet<{ order: Order }>(`/orders/${encodeURIComponent(number)}`),
  );
  return order;
}

/** POST /orders/:number/cancel: only while the order has not been paid. */
export async function cancelOrder(number: string): Promise<Order> {
  const { order } = await withKnownErrors(() =>
    apiPost<{ order: Order }>(`/orders/${encodeURIComponent(number)}/cancel`),
  );
  return order;
}

/** POST /orders/:number/simulate-payment: development only (answers 404 anywhere else). */
export async function simulatePayment(
  number: string,
  outcome: "success" | "failure",
): Promise<Order> {
  const { order } = await withKnownErrors(() =>
    apiPost<{ order: Order }>(
      `/orders/${encodeURIComponent(number)}/simulate-payment`,
      { outcome },
    ),
  );
  return order;
}
