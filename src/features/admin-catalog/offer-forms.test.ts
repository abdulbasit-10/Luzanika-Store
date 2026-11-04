import { describe, expect, it } from "vitest";

import {
  biggestDiscount,
  fromLocalInput,
  headlineProblem,
  offerState,
  toLocalInput,
} from "./offer-forms";

describe("biggestDiscount", () => {
  it("works out the percent from the real old and new price", () => {
    expect(
      biggestDiscount([
        { amount: 60000, compareAtAmount: 100000 },
        { amount: 90000, compareAtAmount: 100000 },
      ]),
    ).toBe(40);
  });

  it("ignores prices without an old price or with a lower one", () => {
    expect(
      biggestDiscount([
        { amount: 100, compareAtAmount: null },
        { amount: 100, compareAtAmount: 100 },
        { amount: 100, compareAtAmount: 50 },
        null,
        undefined,
      ]),
    ).toBeNull();
  });
});

describe("local time boxes", () => {
  it("round-trips a time through the datetime-local value", () => {
    const iso = new Date(2026, 11, 24, 18, 30).toISOString();
    expect(toLocalInput(iso)).toBe("2026-12-24T18:30");
    expect(fromLocalInput("2026-12-24T18:30")).toBe(iso);
  });

  it("treats empty and broken values as no time", () => {
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput("nonsense")).toBe("");
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("not a date")).toBeNull();
  });
});

describe("offerState", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  it("says whether the row is counting down, over, or has no end", () => {
    expect(offerState(null, now)).toBe("none");
    expect(offerState("2026-11-05T00:00:00Z", now)).toBe("running");
    expect(offerState("2026-11-04T11:59:59Z", now)).toBe("ended");
  });
});

describe("headlineProblem", () => {
  it("allows up to 80 characters", () => {
    expect(headlineProblem("Winter sale")).toBeUndefined();
    expect(headlineProblem("h".repeat(81))).toBeTruthy();
  });
});
