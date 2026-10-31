import { customerRoute } from "@/server/auth/customer-route";
import { noContent } from "@/server/http/responses";
import { changePassword } from "@/server/services/auth-service";
import { changePasswordSchema } from "@/server/validation/auth-schemas";

/** POST /api/v1/auth/change-password: needs the current password; signs out all other devices. */
export const POST = customerRoute(
  { name: "auth.change-password" },
  async ({ json, customer, sessionId, rateLimit }) => {
    const body = await json(changePasswordSchema);

    rateLimit({
      name: "auth.change-password.account",
      key: customer.id,
      limit: 5,
      windowSec: 15 * 60,
    });

    await changePassword({
      customerId: customer.id,
      sessionId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    return noContent();
  },
);
