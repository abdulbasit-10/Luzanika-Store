import type { EmailMessage, EmailSender } from "./email-sender";
import { cleanHeader } from "./smtp-sender";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/** The part of `fetch` the sender needs, so tests need no network. */
export type FetchLike = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/**
 * Sends emails through Resend's web API (plain HTTPS). Some hosts, such as
 * Railway on its trial and hobby plans, block outgoing mail-server (SMTP)
 * connections but allow HTTPS, so this works where SMTP does not.
 */
export function createResendSender(
  apiKey: string,
  from: string,
  fetchFn: FetchLike = fetch as FetchLike,
): EmailSender {
  return {
    async send(message: EmailMessage) {
      const response = await fetchFn(RESEND_EMAILS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: cleanHeader(from),
          to: [cleanHeader(message.to)],
          ...(message.replyTo
            ? { reply_to: cleanHeader(message.replyTo) }
            : {}),
          subject: cleanHeader(message.subject),
          // The body is plain text; nothing in it is ever treated as markup.
          text: message.text,
        }),
        // A slow answer must not hold a request open for long.
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        // Resend explains refusals in a short "message"; it never contains the key.
        let reason = "";
        try {
          const body = JSON.parse(await response.text()) as {
            message?: unknown;
          };
          if (typeof body.message === "string") {
            reason = `: ${body.message.slice(0, 200)}`;
          }
        } catch {
          // No readable explanation; the status code is enough.
        }
        throw new Error(
          `Resend refused the email (${response.status})${reason}`,
        );
      }
    },
  };
}
