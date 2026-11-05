import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { replyToContactMessage } from "@/server/services/admin-contact-service";
import { contactReplySchema } from "@/server/validation/contact-schemas";

/**
 * POST /api/v1/admin/contact/:id/reply { message } emails the answer to the
 * person who wrote and records it. If the email cannot be sent the answer is
 * 503 and nothing is saved. Replies to the email go to the shop's contact address.
 */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.contact.reply",
    permission: "contact.reply",
    rateLimit: { limit: 60, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      message: await replyToContactMessage(
        admin,
        uuidParam(params.id),
        (await readJson(contactReplySchema)).message,
      ),
    }),
);
