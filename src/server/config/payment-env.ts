import "server-only";

import { z } from "zod";

const paymentEnvSchema = z.object({
  /**
   * Who collects the money. "stripe" is the real one; "simulated" lets the
   * whole order flow be tried without a payment account and is refused in
   * production, so a live shop can never hand out free orders.
   */
  PAYMENT_PROVIDER: z.enum(["simulated", "stripe"]).default("simulated"),
});

export type PaymentEnv = z.infer<typeof paymentEnvSchema>;

let cached: PaymentEnv | undefined;

export function getPaymentEnv(): PaymentEnv {
  if (cached) return cached;

  const result = paymentEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error('Invalid PAYMENT_PROVIDER (use "stripe" or "simulated")');
  }
  if (
    process.env.NODE_ENV === "production" &&
    result.data.PAYMENT_PROVIDER === "simulated"
  ) {
    throw new Error(
      'PAYMENT_PROVIDER="simulated" is not allowed in production. Use "stripe".',
    );
  }

  cached = result.data;
  return cached;
}
