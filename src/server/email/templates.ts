import type { EmailMessage } from "./email-sender";

/** A message from the contact form, for the shop. Replying to it answers the visitor. */
export function contactMessageEmail(input: {
  to: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}): EmailMessage {
  return {
    to: input.to,
    replyTo: input.email,
    subject: `New contact message from ${input.name}`,
    text: [
      "Someone wrote to you through the Luzanika contact form.",
      "",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || "(not given)"}`,
      "",
      "Message:",
      input.message,
    ].join("\n"),
  };
}

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

/** The invite a super admin sends to a new staff member. */
export function staffInviteEmail(input: {
  to: string;
  firstName: string;
  invitedByName: string;
  link: string;
  validForHours: number;
}): EmailMessage {
  return {
    to: input.to,
    subject: "You have been invited to the Luzanika admin",
    text: [
      `Hi ${input.firstName},`,
      "",
      `${input.invitedByName} invited you to work in the Luzanika admin.`,
      `Open this link within ${input.validForHours} hours to choose your password:`,
      input.link,
      "",
      "After that you sign in and set up an authenticator app on your phone, which is required.",
      "If you were not expecting this, you can ignore this email.",
    ].join("\n"),
  };
}

export function staffPasswordResetEmail(input: {
  to: string;
  firstName: string;
  link: string;
  validForMinutes: number;
}): EmailMessage {
  return {
    to: input.to,
    subject: "Reset your Luzanika admin password",
    text: [
      `Hi ${input.firstName},`,
      "",
      "We received a request to reset your Luzanika admin password.",
      `Open this link within ${input.validForMinutes} minutes to choose a new one:`,
      input.link,
      "",
      "If you did not ask for this, you can ignore this email. Your password stays the same.",
    ].join("\n"),
  };
}

/** Sent when staff hand an order to the carrier. */
export function orderShippedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
}): EmailMessage {
  return {
    to: input.to,
    subject: `Your Luzanika order ${input.orderNumber} is on its way`,
    text: [
      `Hi ${input.name},`,
      "",
      `Good news: your order ${input.orderNumber} has been handed to the carrier.`,
      "",
      `Carrier: ${input.carrier}`,
      `Tracking number: ${input.trackingNumber}`,
      "",
      "You can also follow the status of your order in your account under your orders.",
    ].join("\n"),
  };
}

/** Sent when staff mark an order as completed (it arrived). */
export function orderCompletedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
}): EmailMessage {
  return {
    to: input.to,
    subject: `Your Luzanika order ${input.orderNumber} is complete`,
    text: [
      `Hi ${input.name},`,
      "",
      `Your order ${input.orderNumber} is marked as complete. Thank you for shopping with Luzanika.`,
      "",
      "If something is not right, please contact us and mention your order code.",
    ].join("\n"),
  };
}

/** Sent when staff cancel an order that was never paid. */
export function orderCancelledEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  reason: string | null;
}): EmailMessage {
  return {
    to: input.to,
    subject: `Your Luzanika order ${input.orderNumber} was cancelled`,
    text: [
      `Hi ${input.name},`,
      "",
      `Your order ${input.orderNumber} was cancelled. No payment was taken for it.`,
      ...(input.reason ? ["", `Reason: ${input.reason}`] : []),
      "",
      "If you still want the items, you are welcome to place a new order.",
    ].join("\n"),
  };
}

/** Sent when staff have checked a transfer (bank, Easypaisa, JazzCash) and the money is there. */
export function orderPaymentConfirmedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
}): EmailMessage {
  return {
    to: input.to,
    subject: `We received your payment for order ${input.orderNumber}`,
    text: [
      `Hi ${input.name},`,
      "",
      `Thank you: we checked your payment and your order ${input.orderNumber} is now being prepared.`,
      "",
      "We will email you again when it is handed to the carrier.",
    ].join("\n"),
  };
}

/** Sent when staff cannot match a payment proof, so the customer can send a correct one. */
export function orderPaymentRejectedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  reason: string;
}): EmailMessage {
  return {
    to: input.to,
    subject: `We could not confirm your payment for order ${input.orderNumber}`,
    text: [
      `Hi ${input.name},`,
      "",
      `We could not confirm the payment proof you sent for order ${input.orderNumber}.`,
      "",
      `Reason: ${input.reason}`,
      "",
      "Please open your order in your account and send the transaction ID or a clear screenshot again.",
      "Your items are still being held for you for a little longer.",
    ].join("\n"),
  };
}
