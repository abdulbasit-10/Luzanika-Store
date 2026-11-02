import "server-only";

import { z } from "zod";

/** Text from the environment as a number; an empty or missing value becomes `fallback`. */
function numberFromText(fallback: number) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value === undefined || value === "" ? fallback : Number(value),
    );
}

/** Text from the environment; an empty value counts as not set. */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

/** "shop@example.com" or "Luzanika <shop@example.com>". Never contains a line break. */
const sender = optionalText.pipe(
  z
    .string()
    .max(254)
    .regex(
      /^[^\r\n<>]*(<[^\r\n<>@\s]+@[^\r\n<>@\s]+>|[^\r\n<>@\s]+@[^\r\n<>@\s]+)$/,
    )
    .optional(),
);

const mailEnvSchema = z.object({
  /** The mail server. Without it no email can be sent (development prints emails to the log instead). */
  SMTP_HOST: optionalText,
  SMTP_PORT: numberFromText(587).pipe(z.number().int().min(1).max(65535)),
  /** "true" for a connection that is encrypted from the start (usually port 465); "false" for STARTTLS (usually 587). */
  SMTP_SECURE: optionalText.pipe(z.enum(["true", "false"]).optional()),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  /** Who the emails come from. Required once SMTP_HOST is set. */
  MAIL_FROM: sender,
  /** Where contact-form messages are delivered. */
  CONTACT_TO_EMAIL: optionalText.pipe(z.email().optional()),
});

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  /** Both set, or both missing (a server that needs no login). */
  auth: { user: string; password: string } | null;
}

export interface MailEnv {
  /** null when no mail server is configured. */
  smtp: SmtpSettings | null;
  /** Sender address, or null when not set. */
  from: string | null;
  /** Receiving address of the contact form, or null when not set. */
  contactTo: string | null;
}

let cached: MailEnv | undefined;

/**
 * Email settings, checked once on first use. The error names the bad
 * variables but never prints their values (they include the SMTP password).
 */
export function getMailEnv(): MailEnv {
  if (cached) return cached;

  const result = mailEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid mail environment variables: ${names}`);
  }

  const env = result.data;
  if (env.SMTP_HOST && !env.MAIL_FROM) {
    throw new Error("Invalid mail environment variables: MAIL_FROM");
  }
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
    throw new Error(
      "Invalid mail environment variables: SMTP_USER, SMTP_PASSWORD (set both or neither)",
    );
  }

  cached = {
    smtp: env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE
            ? env.SMTP_SECURE === "true"
            : env.SMTP_PORT === 465,
          auth:
            env.SMTP_USER && env.SMTP_PASSWORD
              ? { user: env.SMTP_USER, password: env.SMTP_PASSWORD }
              : null,
        }
      : null,
    from: env.MAIL_FROM ?? null,
    contactTo: env.CONTACT_TO_EMAIL ?? null,
  };
  return cached;
}
