import { describe, expect, it } from "vitest";

import type { AdminOrderListItem } from "./admin-orders-service";
import { ordersToCsv } from "./orders-csv";

const order = (over: Partial<AdminOrderListItem> = {}): AdminOrderListItem => ({
  number: "LZ-1024",
  market: "PK",
  currency: "PKR",
  status: "processing",
  paymentStatus: "pending",
  total: 850000,
  refundedTotal: 0,
  itemCount: 2,
  customerEmail: "ali@example.com",
  recipientName: "Ali Khan",
  customerId: null,
  placedAt: "2026-11-02T10:00:00.000Z",
  paidAt: null,
  ...over,
});

describe("ordersToCsv", () => {
  it("writes a header and one line per order with the amount in major units", () => {
    const lines = ordersToCsv([order()]).split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      "Order,Placed,Customer,Email,Market,Currency,Total,Status,Payment,Items",
    );
    expect(lines[1]).toBe(
      "LZ-1024,2026-11-02T10:00:00.000Z,Ali Khan,ali@example.com,Pakistan,PKR,8500.00,Processing,Pending,2",
    );
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = ordersToCsv([order({ recipientName: 'Khan, "Ali"\nJr' })]);
    expect(csv).toContain('"Khan, ""Ali""\nJr"');
  });

  it("defuses spreadsheet formulas typed as a name", () => {
    const csv = ordersToCsv([
      order({ recipientName: "=HYPERLINK(1)", customerEmail: "+1@x.com" }),
    ]);
    expect(csv).toContain(",'=HYPERLINK(1),'+1@x.com,");
  });

  it("is just the header for no orders", () => {
    expect(ordersToCsv([]).split("\r\n")).toHaveLength(1);
  });
});
