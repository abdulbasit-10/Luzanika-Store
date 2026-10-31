import "server-only";

import { logger } from "@/server/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** Development only: shows the email in the server log so links can be followed by hand. */
const consoleSender: EmailSender = {
  async send(message) {
    console.log(
      `\n[dev email] To: ${message.to}\n[dev email] Subject: ${message.subject}\n${message.text}\n`,
    );
  },
};

/** Production without a provider: the email cannot be sent, so fail loudly instead of pretending it was. */
const missingProviderSender: EmailSender = {
  async send(message) {
    logger.error("email not sent: no email provider is configured", {
      subject: message.subject,
    });
    throw new Error("No email provider is configured.");
  },
};

let override: EmailSender | undefined;

/** Replace the sender, for tests only. Pass undefined to restore the default. */
export function setEmailSender(sender: EmailSender | undefined): void {
  override = sender;
}

/** The sender in use. Wire a real provider (SMTP, Resend, ...) here before launch. */
export function getEmailSender(): EmailSender {
  if (override) return override;
  return process.env.NODE_ENV === "production"
    ? missingProviderSender
    : consoleSender;
}
