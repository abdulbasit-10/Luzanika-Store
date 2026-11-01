import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { simulatePayment } from "@/server/services/order-service";
import { simulatePaymentSchema } from "@/server/validation/order-schemas";

/**
 * POST /api/v1/orders/:number/simulate-payment: development only. Plays the
 * payment provider's webhook so the flow can be tried without a payment
 * account. Answers 404 whenever the simulated provider is not in use, and the
 * simulated provider cannot be turned on in production.
 */
export const POST = customerRoute<{ number: string }>(
  {
    name: "orders.simulatePayment",
    rateLimit: { limit: 30, windowSec: 10 * 60 },
  },
  async ({ json: readJson, customer, params }) => {
    const { outcome } = await readJson(simulatePaymentSchema);
    return json({
      order: await simulatePayment(customer.id, params.number, outcome),
    });
  },
);
