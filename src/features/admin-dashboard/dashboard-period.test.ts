import { describe, expect, it } from "vitest";

import {
  currentRange,
  daysFrom,
  previousRange,
  rangeLabel,
} from "./dashboard-period";

describe("currentRange", () => {
  it("counts the days up to and including today", () => {
    expect(currentRange(7, new Date("2026-11-03T15:00:00Z"))).toEqual({
      from: "2026-10-28",
      to: "2026-11-03",
    });
  });

  it("works across a year end", () => {
    expect(currentRange(30, new Date("2027-01-10T00:00:00Z"))).toEqual({
      from: "2026-12-12",
      to: "2027-01-10",
    });
  });
});

describe("previousRange", () => {
  it("is the same number of days right before", () => {
    expect(previousRange({ from: "2026-10-28", to: "2026-11-03" })).toEqual({
      from: "2026-10-21",
      to: "2026-10-27",
    });
  });
});

describe("rangeLabel and daysFrom", () => {
  it("writes the range in words", () => {
    expect(rangeLabel({ from: "2026-10-05", to: "2026-11-03" })).toBe(
      "Oct 5 – Nov 3, 2026",
    );
  });

  it("lists each day", () => {
    expect(daysFrom("2026-02-27", 3)).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
  });
});
