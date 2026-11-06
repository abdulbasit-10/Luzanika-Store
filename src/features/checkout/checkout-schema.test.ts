import { describe, expect, it } from "vitest";

import { PHONE_PATTERN, fullPhoneNumber } from "./checkout-schema";

describe("fullPhoneNumber", () => {
  it("puts the chosen country code in front and drops the local leading zero", () => {
    expect(fullPhoneNumber("0300 4589211", "+92")).toBe("+92 300 4589211");
    expect(fullPhoneNumber("3419000933", "+92")).toBe("+92 3419000933");
    expect(fullPhoneNumber("  01520 9823411 ", "+49")).toBe("+49 1520 9823411");
  });

  it("keeps a number that was typed with its own country code", () => {
    expect(fullPhoneNumber("+44 20 7946 0958", "+92")).toBe("+44 20 7946 0958");
    expect(fullPhoneNumber("0044 20 7946 0958", "+92")).toBe(
      "+44 20 7946 0958",
    );
  });

  it("gives a result the server's phone rule accepts", () => {
    for (const [phone, code] of [
      ["0300 4589211", "+92"],
      ["3419000933", "+92"],
      ["01520 9823411", "+49"],
    ] as const) {
      expect(PHONE_PATTERN.test(fullPhoneNumber(phone, code))).toBe(true);
    }
  });
});

describe("PHONE_PATTERN", () => {
  it("accepts ordinary numbers and refuses letters or too few digits", () => {
    expect(PHONE_PATTERN.test("0300 4589211")).toBe(true);
    expect(PHONE_PATTERN.test("+92 (300) 458-9211")).toBe(true);
    expect(PHONE_PATTERN.test("12345")).toBe(false);
    expect(PHONE_PATTERN.test("phone number")).toBe(false);
  });
});
