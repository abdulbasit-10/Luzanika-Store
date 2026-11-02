import { describe, expect, it } from "vitest";

import { daysOf, resolvePeriod } from "./dashboard-period";

const at = (value: string) => new Date(value);

describe("resolvePeriod", () => {
  it("defaults to the last 30 days up to the end of today", () => {
    const period = resolvePeriod({}, at("2026-11-02T10:30:00Z"));
    expect(period.to.toISOString()).toBe("2026-11-03T00:00:00.000Z");
    expect(period.from.toISOString()).toBe("2026-10-04T00:00:00.000Z");
    expect(daysOf(period)).toHaveLength(30);
  });

  it("keeps what was chosen", () => {
    const period = resolvePeriod(
      { from: at("2026-10-01T00:00:00Z"), to: at("2026-10-08T00:00:00Z") },
      at("2026-11-02T10:30:00Z"),
    );
    expect(period.from.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-10-08T00:00:00.000Z");
  });

  it("runs a chosen start to the end of today, and a chosen end 30 days back", () => {
    const now = at("2026-11-02T10:30:00Z");
    expect(
      resolvePeriod({ from: at("2026-11-01T00:00:00Z") }, now).to.toISOString(),
    ).toBe("2026-11-03T00:00:00.000Z");
    expect(
      resolvePeriod({ to: at("2026-10-31T00:00:00Z") }, now).from.toISOString(),
    ).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("daysOf", () => {
  it("lists each UTC day once, oldest first, end excluded", () => {
    expect(
      daysOf({
        from: at("2026-10-30T00:00:00Z"),
        to: at("2026-11-02T00:00:00Z"),
      }),
    ).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("includes a day that is only partly in the period", () => {
    expect(
      daysOf({
        from: at("2026-10-30T15:00:00Z"),
        to: at("2026-11-01T09:00:00Z"),
      }),
    ).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
});
