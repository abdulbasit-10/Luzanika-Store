import { clearSessionCookie } from "@/server/auth/session-cookie";
import { customerRoute } from "@/server/auth/customer-route";
import { toUserDto } from "@/server/dto/user";
import { json, noContent } from "@/server/http/responses";
import {
  deleteAccount,
  isEmailChange,
  updateProfile,
} from "@/server/services/account-service";
import {
  deleteAccountSchema,
  updateProfileSchema,
} from "@/server/validation/account-schemas";

/** GET /api/v1/account: the signed-in customer's profile. */
export const GET = customerRoute({ name: "account.get" }, ({ customer }) =>
  json({ user: toUserDto(customer) }),
);

/** PATCH /api/v1/account: changes the fields that are sent. A new email needs the current password. */
export const PATCH = customerRoute(
  { name: "account.update", rateLimit: { limit: 30, windowSec: 10 * 60 } },
  async ({ json: readJson, customer, sessionId, rateLimit }) => {
    const body = await readJson(updateProfileSchema);

    // Only password guesses are limited tightly: a normal save never reaches this.
    if (isEmailChange(customer, body)) {
      rateLimit({
        name: "account.email-change",
        key: customer.id,
        limit: 5,
        windowSec: 15 * 60,
      });
    }

    const updated = await updateProfile({ customer, sessionId, body });
    return json({ user: toUserDto(updated) });
  },
);

/** DELETE /api/v1/account: deletes the account after the password is confirmed. */
export const DELETE = customerRoute(
  { name: "account.delete" },
  async ({ json: readJson, customer, rateLimit }) => {
    const { password } = await readJson(deleteAccountSchema);

    rateLimit({
      name: "account.delete",
      key: customer.id,
      limit: 5,
      windowSec: 15 * 60,
    });

    await deleteAccount({ customer, password });

    const response = noContent();
    clearSessionCookie(response);
    return response;
  },
);
