import "server-only";

import { getMailEnv } from "@/server/config/mail-env";
import { getEmailSender } from "@/server/email/email-sender";
import { contactMessageEmail } from "@/server/email/templates";
import { logger, serializeError } from "@/server/logger";
import { contactRepository } from "@/server/repositories/contact-repository";
import type { ContactBody } from "@/server/validation/contact-schemas";

/** Only used in development when CONTACT_TO_EMAIL is not set, so the message still shows up in the server log. */
const DEV_FALLBACK_RECIPIENT = "contact@luzanika.invalid";

/**
 * Keeps a contact-form message so staff can read and answer it in the admin.
 * That is what counts: once it is saved the visitor is told it arrived. If
 * CONTACT_TO_EMAIL is set the shop is also told by email, but a failed email
 * never fails the form. The message text is never written to the log.
 */
export async function submitContactMessage(body: ContactBody): Promise<void> {
  await contactRepository.insert(body);

  const { contactTo } = getMailEnv();
  const to =
    contactTo ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : DEV_FALLBACK_RECIPIENT);
  if (!to) return;

  try {
    await getEmailSender().send(
      contactMessageEmail({
        to,
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message,
      }),
    );
  } catch (error) {
    logger.error("contact message notification email failed", {
      error: serializeError(error),
    });
  }
}
