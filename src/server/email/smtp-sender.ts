import type { EmailMessage, EmailSender } from "./email-sender";

/** The one call of a mail transport that the sender needs (nodemailer's `sendMail`). */
export interface MailTransport {
  sendMail(message: {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
}

/**
 * A value that goes into an email header (subject, addresses). Line breaks
 * are the way an attacker adds extra headers (more recipients, hidden copies),
 * so they never get through, whatever the caller passes.
 */
export function cleanHeader(value: string): string {
  return value
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/\p{Cc}/gu, "")
    .trim();
}

/** Sends emails through a mail server. The transport is passed in, so tests need no server. */
export function createSmtpSender(
  transport: MailTransport,
  from: string,
): EmailSender {
  return {
    async send(message: EmailMessage) {
      await transport.sendMail({
        from: cleanHeader(from),
        to: cleanHeader(message.to),
        ...(message.replyTo ? { replyTo: cleanHeader(message.replyTo) } : {}),
        subject: cleanHeader(message.subject),
        // The body is plain text; nothing in it is ever treated as markup.
        text: message.text,
      });
    },
  };
}
