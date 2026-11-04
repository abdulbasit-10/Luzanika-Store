import { describe, expect, it } from "vitest";

import { auditActionLabel, auditEntityLabel, shortId } from "./audit-labels";

describe("audit labels", () => {
  it("names known actions and keeps unknown ones as written", () => {
    expect(auditActionLabel("orders.refund")).toBe("Refund recorded");
    expect(auditActionLabel("something.new")).toBe("something.new");
  });

  it("names known entity types", () => {
    expect(auditEntityLabel("home_section")).toBe("Home page");
    expect(auditEntityLabel("widget")).toBe("widget");
  });
});

describe("shortId", () => {
  it("shortens a UUID but keeps an order number whole", () => {
    expect(shortId("bb1daa56-62fa-40cc-931b-f3f22a63f15f")).toBe("bb1daa56…");
    expect(shortId("LZ-PK-000001")).toBe("LZ-PK-000001");
    expect(shortId(null)).toBe("");
  });
});
