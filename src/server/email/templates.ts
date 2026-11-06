import { formatRegionalPrice } from "@/utils/format-currency";

import type { EmailMessage } from "./email-sender";

/** What the order emails need to know about an order to list it. Amounts are in minor units (cents, paisa). */
export interface OrderSummaryInput {
  number: string;
  market: "PK" | "DE";
  placedAt: string;
  paymentMethod: string;
  paymentStatus: string;
  contact: { phone: string };
  amounts: {
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    taxIncluded: boolean | null;
    total: number;
  };
  shipping: {
    name: string;
    company?: string;
    country: string;
    city: string;
    address: string;
    zip: string;
  };
  items: {
    name: string;
    color?: string;
    size?: string;
    quantity: number;
    unitAmount: number;
    lineTotal: number;
  }[];
}

const METHOD_NAMES: Record<string, string> = {
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  card: "Card",
};

const PAYMENT_STATUS_NAMES: Record<string, string> = {
  pending: "not paid yet",
  awaiting_verification: "payment proof received, being checked",
  paid: "paid",
  failed: "payment not confirmed",
  refunded: "refunded",
  partially_refunded: "partly refunded",
};

/**
 * The order as plain lines for an email: what was ordered, the amounts, how it
 * is paid and where it goes. Plain text only, like every email we send.
 */
export function orderSummaryLines(order: OrderSummaryInput): string[] {
  const money = (amount: number) => formatRegionalPrice(amount, order.market);
  const { amounts, shipping } = order;

  const placed = new Date(order.placedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const items = order.items.map((item) => {
    const options = [
      item.size ? `size ${item.size}` : null,
      item.color ? `colour ${item.color}` : null,
    ].filter(Boolean);
    const name = options.length
      ? `${item.name} (${options.join(", ")})`
      : item.name;
    return `- ${name}: ${item.quantity} x ${money(item.unitAmount)} = ${money(item.lineTotal)}`;
  });

  const amountLines = [
    `Items: ${money(amounts.subtotal)}`,
    ...(amounts.discountTotal > 0
      ? [`Discount: -${money(amounts.discountTotal)}`]
      : []),
    `Delivery: ${amounts.shippingTotal > 0 ? money(amounts.shippingTotal) : "free"}`,
    ...(amounts.taxTotal > 0
      ? [
          amounts.taxIncluded
            ? `Includes VAT: ${money(amounts.taxTotal)}`
            : `VAT: ${money(amounts.taxTotal)}`,
        ]
      : []),
    `Total: ${money(amounts.total)}`,
  ];

  const method = METHOD_NAMES[order.paymentMethod] ?? order.paymentMethod;
  const status =
    PAYMENT_STATUS_NAMES[order.paymentStatus] ?? order.paymentStatus;

  return [
    `Order ${order.number}, placed on ${placed}`,
    "",
    ...items,
    "",
    ...amountLines,
    "",
    `Payment: ${method}, ${status}`,
    "",
    "Delivery address:",
    shipping.name,
    ...(shipping.company ? [shipping.company] : []),
    shipping.address,
    `${shipping.city} ${shipping.zip}`.trim(),
    shipping.country,
    ...(order.contact.phone ? [`Phone: ${order.contact.phone}`] : []),
  ];
}

/** The message of an order email with the order listed under it, set apart by a line. The list is left out when no order is given. */
function withSummary(
  body: string[],
  order: OrderSummaryInput | undefined,
): string {
  return (
    order ? [...body, "", "-----", ...orderSummaryLines(order)] : body
  ).join("\n");
}

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

/**
 * A staff member's answer to a contact-form message, for the visitor. The
 * visitor's own message is quoted underneath. Replies to it go to the shop's
 * contact address.
 */
export function contactReplyEmail(input: {
  to: string;
  name: string;
  reply: string;
  originalMessage: string;
  replyTo: string;
}): EmailMessage {
  const quoted = input.originalMessage
    .split(/\r?\n/)
    .map((line) => `> ${line}`);
  return {
    to: input.to,
    replyTo: input.replyTo,
    subject: "Re: your message to Luzanika",
    text: [
      `Hi ${input.name},`,
      "",
      input.reply,
      "",
      "Kind regards,",
      "The Luzanika team",
      "",
      "-----",
      "Your message:",
      ...quoted,
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

/** Sent when staff hand an order over for delivery. */
export function orderShippedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  order?: OrderSummaryInput;
}): EmailMessage {
  return {
    to: input.to,
    subject: `Your Luzanika order ${input.orderNumber} is on its way`,
    text: withSummary(
      [
        `Hi ${input.name},`,
        "",
        `Good news: your order ${input.orderNumber} is on its way.`,
        "",
        "You can also follow the status of your order in your account under your orders.",
      ],
      input.order,
    ),
  };
}

/** Sent when staff mark an order as completed (it arrived). */
export function orderCompletedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  order?: OrderSummaryInput;
}): EmailMessage {
  return {
    to: input.to,
    subject: `Your Luzanika order ${input.orderNumber} is complete`,
    text: withSummary(
      [
        `Hi ${input.name},`,
        "",
        `Your order ${input.orderNumber} is marked as complete. Thank you for shopping with Luzanika.`,
        "",
        "If something is not right, please contact us and mention your order code.",
      ],
      input.order,
    ),
  };
}

/** Sent when staff cancel an order that was never paid. */
export function orderCancelledEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  reason: string | null;
  order?: OrderSummaryInput;
}): EmailMessage {
  return {
    to: input.to,
    subject: `Your Luzanika order ${input.orderNumber} was cancelled`,
    text: withSummary(
      [
        `Hi ${input.name},`,
        "",
        `Your order ${input.orderNumber} was cancelled. No payment was taken for it.`,
        ...(input.reason ? ["", `Reason: ${input.reason}`] : []),
        "",
        "If you still want the items, you are welcome to place a new order.",
      ],
      input.order,
    ),
  };
}

/** Sent when staff have checked a transfer (bank, Easypaisa, JazzCash) and the money is there. */
export function orderPaymentConfirmedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  order?: OrderSummaryInput;
}): EmailMessage {
  return {
    to: input.to,
    subject: `We received your payment for order ${input.orderNumber}`,
    text: withSummary(
      [
        `Hi ${input.name},`,
        "",
        `Thank you: we checked your payment and your order ${input.orderNumber} is now being prepared.`,
        "",
        "We will email you again when it is on its way.",
      ],
      input.order,
    ),
  };
}

/** Sent when staff cannot match a payment proof, so the customer can send a correct one. */
export function orderPaymentRejectedEmail(input: {
  to: string;
  name: string;
  orderNumber: string;
  reason: string;
  order?: OrderSummaryInput;
}): EmailMessage {
  return {
    to: input.to,
    subject: `We could not confirm your payment for order ${input.orderNumber}`,
    text: withSummary(
      [
        `Hi ${input.name},`,
        "",
        `We could not confirm the payment proof you sent for order ${input.orderNumber}.`,
        "",
        `Reason: ${input.reason}`,
        "",
        "Please open your order in your account and send the transaction ID or a clear screenshot again.",
        "Your items are still being held for you for a little longer.",
      ],
      input.order,
    ),
  };
}
