import { describe, expect, it } from "vitest";

import { formatMinor, parseMajorToMinor } from "./admin-money";

describe("formatMinor", () => {
  it("writes the currency code of each market", () => {
    expect(formatMinor(850000, "PKR")).toBe("PKR 8,500");
    expect(formatMinor(7500, "EUR")).toBe("EUR 75");
  });

  it("shows cents only when there are some, or when asked", () => {
    expect(formatMinor(89590, "EUR")).toBe("EUR 895.90");
    expect(formatMinor(850000, "PKR", { alwaysCents: true })).toBe(
      "PKR 8,500.00",
    );
    expect(formatMinor(0, "EUR")).toBe("EUR 0");
  });
});

describe("parseMajorToMinor", () => {
  it("turns what a person types into paisa / cents", () => {
    expect(parseMajorToMinor("12.5")).toBe(1250);
    expect(parseMajorToMinor("1,200")).toBe(120000);
    expect(parseMajorToMinor("0.07")).toBe(7);
    expect(parseMajorToMinor("19.99")).toBe(1999);
  });

  it("refuses anything that is not an amount", () => {
    expect(parseMajorToMinor("")).toBeNull();
    expect(parseMajorToMinor("abc")).toBeNull();
    expect(parseMajorToMinor("-5")).toBeNull();
    expect(parseMajorToMinor("1.234")).toBeNull();
  });
});
