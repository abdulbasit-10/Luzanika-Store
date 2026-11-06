import "server-only";

import nodemailer from "nodemailer";

import { getMailEnv } from "@/server/config/mail-env";
import { logger } from "@/server/logger";

import { createResendSender } from "./resend-sender";
import { createSmtpSender } from "./smtp-sender";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Where a reply goes, e.g. the visitor who wrote through the contact form. */
  replyTo?: string;
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

/** Production without a mail server: the email cannot be sent, so fail loudly instead of pretending it was. */
const missingProviderSender: EmailSender = {
  async send(message) {
    logger.error("email not sent: no mail server is configured", {
      subject: message.subject,
    });
    throw new Error("No mail server is configured.");
  },
};

let override: EmailSender | undefined;
let smtpSender: EmailSender | undefined;
let resendSender: EmailSender | undefined;

/** Replace the sender, for tests only. Pass undefined to restore the default. */
export function setEmailSender(sender: EmailSender | undefined): void {
  override = sender;
}

/** Builds the sender for the configured mail server once, then reuses its connection pool. */
function getSmtpSender(): EmailSender | null {
  if (smtpSender) return smtpSender;

  const { smtp, from } = getMailEnv();
  if (!smtp || !from) return null;

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    ...(smtp.auth
      ? { auth: { user: smtp.auth.user, pass: smtp.auth.password } }
      : {}),
    // A slow mail server must not hold a request open for long.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  smtpSender = createSmtpSender(transport, from);
  return smtpSender;
}

/** Builds the sender for Resend's web API once. */
function getResendSender(): EmailSender | null {
  if (resendSender) return resendSender;

  const { resendApiKey, from } = getMailEnv();
  if (!resendApiKey || !from) return null;

  resendSender = createResendSender(resendApiKey, from);
  return resendSender;
}

/**
 * The sender in use, in this order: a test override, Resend's web API
 * (RESEND_API_KEY), the configured mail server (SMTP_HOST), the log in
 * development, and in production without either a sender that fails loudly.
 */
export function getEmailSender(): EmailSender {
  if (override) return override;
  const resend = getResendSender();
  if (resend) return resend;
  const smtp = getSmtpSender();
  if (smtp) return smtp;
  return process.env.NODE_ENV === "production"
    ? missingProviderSender
    : consoleSender;
}
