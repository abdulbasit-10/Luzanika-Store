import { describe, expect, it } from "vitest";

import {
  bankProblems,
  contactProblems,
  feeToMinor,
  holdHoursProblem,
  pricingProblems,
  walletProblems,
} from "./settings-forms";

describe("bankProblems", () => {
  const ok = {
    bankName: "Meezan Bank",
    accountTitle: "Luzanika Pvt Ltd",
    accountNumber: "PK36 SCBL 0000 0011 2345 6702",
  };

  it("accepts a real account", () => {
    expect(bankProblems(ok)).toEqual({});
  });

  it("asks for what is missing", () => {
    expect(
      bankProblems({ bankName: " ", accountTitle: "", accountNumber: "x" }),
    ).toEqual({
      bankName: "Enter the bank name",
      accountTitle: "Enter the account title",
      accountNumber:
        "Enter the account number or IBAN (letters, digits, spaces)",
    });
  });
});

describe("walletProblems", () => {
  it("accepts a mobile number written the usual ways", () => {
    for (const number of ["0300 1234567", "+92 300 1234567", "03001234567"]) {
      expect(walletProblems({ accountTitle: "Luzanika", number })).toEqual({});
    }
  });

  it("refuses letters and short numbers", () => {
    expect(
      walletProblems({ accountTitle: "Luzanika", number: "abc" }).number,
    ).toBeDefined();
    expect(
      walletProblems({ accountTitle: "", number: "03001234567" }).accountTitle,
    ).toBeDefined();
  });
});

describe("pricingProblems", () => {
  const ok = {
    feePk: "250",
    feeDe: "5.90",
    vat: "19",
    holdMinutes: "30",
  };

  it("accepts the usual values", () => {
    expect(pricingProblems(ok)).toEqual({});
    expect(feeToMinor("5.90")).toBe(590);
    expect(feeToMinor("0")).toBe(0);
  });

  it("refuses values the server would refuse", () => {
    const problems = pricingProblems({
      feePk: "-1",
      feeDe: "abc",
      vat: "51",
      holdMinutes: "2",
    });
    expect(Object.keys(problems).sort()).toEqual(
      ["feeDe", "feePk", "holdMinutes", "vat"].sort(),
    );
  });

  it("allows a VAT rate of 7.5 but not three decimals", () => {
    expect(pricingProblems({ ...ok, vat: "7.5" })).toEqual({});
    expect(pricingProblems({ ...ok, vat: "7.555" }).vat).toBeDefined();
  });
});

describe("holdHoursProblem", () => {
  it("is whole hours from 1 to 336", () => {
    expect(holdHoursProblem("48")).toBeUndefined();
    expect(holdHoursProblem("0")).toBeDefined();
    expect(holdHoursProblem("337")).toBeDefined();
    expect(holdHoursProblem("1.5")).toBeDefined();
  });
});

describe("contactProblems", () => {
  it("needs a valid email and phone", () => {
    expect(
      contactProblems({
        email: "shop@luzanika.com",
        address: "Lahore",
        customerServiceLabel: "Customer service",
        customerServicePhone: "+92 42 1234567",
      }),
    ).toEqual({});
    const bad = contactProblems({
      email: "nope",
      address: "",
      customerServiceLabel: "",
      customerServicePhone: "x",
    });
    expect(Object.keys(bad)).toHaveLength(4);
  });
});
