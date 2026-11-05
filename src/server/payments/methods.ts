import type { Market } from "@/server/repositories/order-repository";

export const PAYMENT_METHODS = [
  "card",
  "cod",
  "bank_transfer",
  "easypaisa",
  "jazzcash",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Paid outside the shop: the customer sends money and then proves it. */
export const TRANSFER_METHODS = [
  "bank_transfer",
  "easypaisa",
  "jazzcash",
] as const;
export type TransferMethod = (typeof TRANSFER_METHODS)[number];

export const isTransferMethod = (method: string): method is TransferMethod =>
  (TRANSFER_METHODS as readonly string[]).includes(method);

/** Every method that does not go through a payment provider: no gateway is involved. */
export const isOfflineMethod = (method: string): boolean => method !== "card";

/** What a shopper of a market is offered. Cards stay the only way for Germany until another is chosen. */
export function methodsForMarket(market: Market): PaymentMethod[] {
  return market === "PK"
    ? ["cod", "bank_transfer", "easypaisa", "jazzcash"]
    : ["card"];
}

/** Cash on delivery and the transfers are for Pakistan only. */
export function allowedInMarket(
  method: PaymentMethod,
  market: Market,
): boolean {
  return method === "card" || market === "PK";
}
