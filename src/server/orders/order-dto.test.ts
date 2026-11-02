import { describe, expect, it } from "vitest";

import type {
  OrderItemRow,
  OrderRow,
} from "@/server/repositories/order-repository";

import { toOrderDto } from "./order-dto";

function order(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: "o1",
    number: "LZ-PK-000001",
    market: "PK",
    currency: "PKR",
    customer_id: "c1",
    email: "ada@example.com",
    phone: "+92 300 1234567",
    status: "waiting_payment",
    payment_status: "pending",
    payment_method: "card",
    payment_provider: "stripe",
    stock_state: "reserved",
    reservation_expires_at: new Date("2026-11-01T12:30:00Z"),
    subtotal: "267000",
    discount_total: "0",
    shipping_total: "0",
    tax_total: "0",
    tax_included: null,
    total: "267000",
    ship_name: "Ada Lovelace",
    ship_company: null,
    ship_country: "Pakistan",
    ship_city: "Lahore",
    ship_address: "MM Alam Road 5",
    ship_zip: "54000",
    bill_country: null,
    bill_city: null,
    bill_address: null,
    bill_zip: null,
    placed_at: new Date("2026-11-01T12:00:00Z"),
    paid_at: null,
    cancelled_at: null,
    cancel_reason: null,
    ...overrides,
  };
}

function item(overrides: Partial<OrderItemRow> = {}): OrderItemRow {
  return {
    order_id: "o1",
    product_id: "p1",
    variant_id: "v1",
    product_slug: "dress",
    name: "Dress",
    sku: "DRESS-GREEN-S",
    color: "Green",
    size: "S",
    image_src: "/a.jpg",
    image_alt: "A dress",
    image_position: "50% 0%",
    quantity: 3,
    unit_amount: "89000",
    line_total: "267000",
    ...overrides,
  };
}

describe("toOrderDto", () => {
  it("turns database text numbers into numbers and dates into ISO strings", () => {
    const dto = toOrderDto(order(), [item()]);

    expect(dto).toMatchObject({
      number: "LZ-PK-000001",
      subtotal: 267000,
      total: 267000,
      placedAt: "2026-11-01T12:00:00.000Z",
      paidAt: null,
      reservationExpiresAt: "2026-11-01T12:30:00.000Z",
      billing: null,
      shipping: { name: "Ada Lovelace", city: "Lahore" },
    });
    expect(dto.items).toEqual([
      {
        slug: "dress",
        name: "Dress",
        image: { src: "/a.jpg", alt: "A dress", position: "50% 0%" },
        color: "Green",
        size: "S",
        quantity: 3,
        unitAmount: 89000,
        lineTotal: 267000,
      },
    ]);
  });

  it("only shows a payment deadline while the order is waiting for payment", () => {
    for (const status of ["processing", "cancelled", "completed"] as const) {
      expect(toOrderDto(order({ status }), []).reservationExpiresAt).toBeNull();
    }
  });

  it("only includes the items of its own order", () => {
    const dto = toOrderDto(order(), [
      item(),
      item({ order_id: "other", name: "Not mine" }),
    ]);

    expect(dto.items.map((entry) => entry.name)).toEqual(["Dress"]);
  });

  it("includes a billing address only when all of it is there", () => {
    expect(
      toOrderDto(
        order({
          bill_country: "Germany",
          bill_city: "Berlin",
          bill_address: "Unter den Linden 1",
          bill_zip: "10117",
        }),
        [],
      ).billing,
    ).toEqual({
      country: "Germany",
      city: "Berlin",
      address: "Unter den Linden 1",
      zip: "10117",
    });
  });

  it("leaves out what an item does not have", () => {
    const dto = toOrderDto(order(), [
      item({ color: null, size: null, image_src: null }),
    ]);

    expect(dto.items[0].color).toBeUndefined();
    expect(dto.items[0].size).toBeUndefined();
    expect(dto.items[0].image).toBeUndefined();
  });
});
