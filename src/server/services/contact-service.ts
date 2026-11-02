import "server-only";

import { getMailEnv } from "@/server/config/mail-env";
import { getEmailSender } from "@/server/email/email-sender";
import { contactMessageEmail } from "@/server/email/templates";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import type { ContactBody } from "@/server/validation/contact-schemas";

/** Only used in development when CONTACT_TO_EMAIL is not set, so the message still shows up in the server log. */
const DEV_FALLBACK_RECIPIENT = "contact@luzanika.invalid";

/**
 * Emails a contact-form message to the shop. Nothing is stored. If the email
 * cannot be sent the visitor is told, so they can try again or write another
 * way, instead of believing a message arrived that did not. The message text
 * is never written to the log.
 */
export async function sendContactMessage(body: ContactBody): Promise<void> {
  const { contactTo } = getMailEnv();

  if (!contactTo && process.env.NODE_ENV === "production") {
    logger.error("contact message not sent: CONTACT_TO_EMAIL is not set");
    throw new ApiError("service_unavailable");
  }

  try {
    await getEmailSender().send(
      contactMessageEmail({
        to: contactTo ?? DEV_FALLBACK_RECIPIENT,
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
      }),
    );
  } catch (error) {
    logger.error("contact message email failed", {
      error: serializeError(error),
    });
    throw new ApiError("service_unavailable", {
      message:
        "We couldn't send your message right now. Please try again shortly.",
    });
  }
}
