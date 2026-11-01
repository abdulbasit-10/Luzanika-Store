import "server-only";

import type { PaymentProvider } from "./provider";

/**
 * Stand-in for a real provider, for development and tests only (it is refused
 * in production, see payment-env). It collects nothing: the order stays
 * "waiting for payment" until the dev-only simulate-payment endpoint confirms it,
 * the same way a webhook would.
 */
export const simulatedProvider: PaymentProvider = {
  name: "simulated",
  async start(order) {
    return { providerRef: `sim_${order.id}` };
  },
  async cancel() {},
};
