import { describe, expect, it } from "vitest";

import {
  PHONE_PATTERN,
  checkoutSchema,
  fullPhoneNumber,
  phoneProblem,
} from "./checkout-schema";

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

describe("phoneProblem", () => {
  it("accepts a Pakistani mobile number in the usual ways of writing it", () => {
    for (const phone of [
      "0300 4589211",
      "03004589211",
      "300 4589211",
      "3419000933",
      "0341-9000933",
      "(0341) 9000933",
    ]) {
      expect(phoneProblem(phone, "+92"), phone).toBeNull();
    }
  });

  it("refuses numbers that are not Pakistani mobiles, with a helpful message", () => {
    for (const phone of [
      "8383873837",
      "0838 3873837",
      "0300 458921",
      "0300 45892111",
      "0200 4589211",
      "1234567890",
    ]) {
      expect(phoneProblem(phone, "+92"), phone).toBe(
        "Enter a Pakistani mobile number, like 0300 4589211",
      );
    }
  });

  it("checks German numbers more loosely and leaves foreign numbers alone", () => {
    expect(phoneProblem("01520 9823411", "+49")).toBeNull();
    expect(phoneProblem("0123", "+49")).toBe("Enter a valid phone number");
    expect(phoneProblem("+44 20 7946 0958", "+92")).toBeNull();
    expect(phoneProblem("0044 20 7946 0958", "+49")).toBeNull();
  });
});

describe("checkout form phone rule", () => {
  const base = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phoneCode: "+92",
    phone: "0300 4589211",
    company: "",
    country: "Pakistan",
    city: "Lahore",
    address: "12 Garden Road",
    zip: "54000",
    paymentMethod: "cod",
    sameBilling: true,
    billingCountry: "",
    billingCity: "",
    billingAddress: "",
    billingZip: "",
    acceptTerms: true,
  };
  const phoneIssues = (phone: string, phoneCode = "+92") => {
    const result = checkoutSchema.safeParse({ ...base, phone, phoneCode });
    return result.success
      ? []
      : result.error.issues
          .filter((issue) => issue.path[0] === "phone")
          .map((issue) => issue.message);
  };

  it("takes a good number", () => {
    expect(phoneIssues("0300 4589211")).toEqual([]);
  });

  it("gives exactly one message for a number that fails the country rule", () => {
    expect(phoneIssues("8383873837")).toEqual([
      "Enter a Pakistani mobile number, like 0300 4589211",
    ]);
  });

  it("gives only the general message for something that is not a number at all", () => {
    expect(phoneIssues("call me")).toEqual(["Enter a valid phone number"]);
  });
});
