import type { EmailMessage } from "./email-sender";

export function passwordResetEmail(input: {
  to: string;
  firstName: string;
  link: string;
  validForMinutes: number;
}): EmailMessage {
  return {
    to: input.to,
    subject: "Reset your Luzanika password",
    text: [
      `Hi ${input.firstName},`,
      "",
      "We received a request to reset your Luzanika password.",
      `Open this link within ${input.validForMinutes} minutes to choose a new one:`,
      input.link,
      "",
      "If you did not ask for this, you can ignore this email. Your password stays the same.",
    ].join("\n"),
  };
}
