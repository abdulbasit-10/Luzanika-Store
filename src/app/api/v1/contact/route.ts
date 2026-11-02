import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { fingerprint } from "@/server/security/tokens";
import { sendContactMessage } from "@/server/services/contact-service";
import { contactSchema } from "@/server/validation/contact-schemas";

/**
 * POST /api/v1/contact: emails the message to the shop. Open to visitors who
 * are not signed in, so it is limited tightly (per visitor, and per email
 * address from anywhere) to stop it being used to flood the shop's inbox.
 */
export const POST = route(
  { name: "contact.send", rateLimit: { limit: 3, windowSec: 60 * 60 } },
  async ({ json, rateLimit }) => {
    const body = await json(contactSchema);

    rateLimit({
      name: "contact.send.email",
      key: fingerprint(body.email),
      limit: 3,
      windowSec: 60 * 60,
    });

    await sendContactMessage(body);
    return noContent();
  },
);
