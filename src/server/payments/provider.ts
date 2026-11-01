import "server-only";

import { getPaymentEnv } from "@/server/config/payment-env";
import { ApiError } from "@/server/http/api-error";

import { simulatedProvider } from "./simulated-provider";

/** What a provider needs to know about an order to collect the money for it. */
export interface PayableOrder {
  id: string;
  number: string;
  market: "PK" | "DE";
  currency: "PKR" | "EUR";
  /** Minor units. */
  amount: number;
  email: string;
}

/** What the website needs to finish paying (for Stripe: the PaymentIntent's client secret). */
export interface PaymentStart {
  providerRef?: string;
  clientSecret?: string;
}

/**
 * One way of collecting money. The order code only talks to this interface,
 * so adding a provider (or a different one for Pakistan) does not touch it.
 * Payments are confirmed to us by the provider (a signed webhook), never by
 * the browser saying "I paid".
 */
export interface PaymentProvider {
  readonly name: "simulated" | "stripe";
  /** Called once the order is saved. Throws when the provider cannot take the payment. */
  start(order: PayableOrder): Promise<PaymentStart>;
  /** Called when an unpaid order is cancelled, so the provider stops accepting payment for it. Best effort. */
  cancel(providerRef: string): Promise<void>;
}

export function getPaymentProvider(): PaymentProvider {
  const { PAYMENT_PROVIDER } = getPaymentEnv();
  if (PAYMENT_PROVIDER === "simulated") return simulatedProvider;

  // The Stripe provider is added with the Stripe account's keys.
  throw new ApiError("service_unavailable", {
    message: "Card payments are not available yet. Please try again later.",
  });
}
