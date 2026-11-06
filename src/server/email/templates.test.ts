import { describe, expect, it } from "vitest";

import {
  orderCancelledEmail,
  orderCompletedEmail,
  orderPaymentConfirmedEmail,
  orderPaymentRejectedEmail,
  orderShippedEmail,
  orderSummaryLines,
  type OrderSummaryInput,
} from "./templates";

const pkOrder: OrderSummaryInput = {
  number: "LZ-PK-000012",
  market: "PK",
  placedAt: "2026-11-05T22:30:00.000Z",
  paymentMethod: "cod",
  paymentStatus: "pending",
  contact: { phone: "+92 300 1234567" },
  amounts: {
    subtotal: 1_250_000,
    discountTotal: 250_000,
    shippingTotal: 30_000,
    taxTotal: 0,
    taxIncluded: null,
    total: 1_030_000,
  },
  shipping: {
    name: "Mazhar Ahmad",
    country: "Pakistan",
    city: "Lahore",
    address: "12 Garden Road",
    zip: "54000",
  },
  items: [
    {
      name: "Archival Cashmere Overshirt",
      size: "M",
      color: "Sand",
      quantity: 2,
      unitAmount: 500_000,
      lineTotal: 1_000_000,
    },
    {
      name: "Linen Tote",
      quantity: 1,
      unitAmount: 250_000,
      lineTotal: 250_000,
    },
  ],
};

describe("orderSummaryLines", () => {
  it("lists the items, amounts, payment and delivery address", () => {
    const text = orderSummaryLines(pkOrder).join("\n");

    expect(text).toContain("Order LZ-PK-000012, placed on 5 Nov 2026");
    expect(text).toContain(
      "- Archival Cashmere Overshirt (size M, colour Sand): 2 x",
    );
    expect(text).toContain("- Linen Tote: 1 x");
    expect(text).toMatch(/Items: .*12,500\.00/);
    expect(text).toMatch(/Discount: -.*2,500\.00/);
    expect(text).toMatch(/Delivery: .*300\.00/);
    expect(text).toMatch(/Total: .*10,300\.00/);
    expect(text).toContain("Payment: Cash on delivery, not paid yet");
    expect(text).toContain(
      "Delivery address:\nMazhar Ahmad\n12 Garden Road\nLahore 54000\nPakistan\nPhone: +92 300 1234567",
    );
  });

  it("shows free delivery and leaves out a zero discount and no tax", () => {
    const text = orderSummaryLines({
      ...pkOrder,
      amounts: { ...pkOrder.amounts, discountTotal: 0, shippingTotal: 0 },
    }).join("\n");
    expect(text).toContain("Delivery: free");
    expect(text).not.toContain("Discount");
    expect(text).not.toContain("VAT");
  });

  it("shows German VAT that is already inside the prices, in euros", () => {
    const text = orderSummaryLines({
      ...pkOrder,
      market: "DE",
      paymentMethod: "card",
      paymentStatus: "paid",
      amounts: {
        subtotal: 11_900,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 1_900,
        taxIncluded: true,
        total: 11_900,
      },
      shipping: { ...pkOrder.shipping, company: "Acme GmbH" },
    }).join("\n");
    expect(text).toMatch(/Includes VAT: .*19,00/);
    expect(text).toContain("€");
    expect(text).toContain("Payment: Card, paid");
    expect(text).toContain("Mazhar Ahmad\nAcme GmbH\n12 Garden Road");
  });

  it("names the stage of a transfer that is being checked", () => {
    const text = orderSummaryLines({
      ...pkOrder,
      paymentMethod: "easypaisa",
      paymentStatus: "awaiting_verification",
    }).join("\n");
    expect(text).toContain(
      "Payment: Easypaisa, payment proof received, being checked",
    );
  });
});

describe("order emails", () => {
  const base = {
    to: "ada@example.com",
    name: "Ada",
    orderNumber: "LZ-PK-000012",
  };

  it("put the order under the message when it is given", () => {
    const emails = [
      orderShippedEmail({ ...base, order: pkOrder }),
      orderCompletedEmail({ ...base, order: pkOrder }),
      orderCancelledEmail({ ...base, reason: "Out of stock", order: pkOrder }),
      orderPaymentConfirmedEmail({ ...base, order: pkOrder }),
      orderPaymentRejectedEmail({
        ...base,
        reason: "Wrong amount",
        order: pkOrder,
      }),
    ];
    for (const email of emails) {
      expect(email.text).toContain("-----\nOrder LZ-PK-000012, placed on");
      expect(email.text).toContain("Delivery address:");
      expect(email.text.startsWith("Hi Ada,")).toBe(true);
    }
  });

  it("stay as short messages when no order is given", () => {
    const email = orderCompletedEmail(base);
    expect(email.text).not.toContain("-----");
    expect(email.text).toContain("marked as complete");
  });
});
