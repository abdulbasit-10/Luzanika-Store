import { describe, expect, it } from "vitest";

import { isInFuture, isRealIsoDate } from "./iso-date";

describe("isRealIsoDate", () => {
  it("accepts real dates, including leap days", () => {
    for (const value of [
      "2000-06-06",
      "1900-01-01",
      "2024-02-29",
      "1999-12-31",
    ]) {
      expect(isRealIsoDate(value), value).toBe(true);
    }
  });

  it("refuses dates that do not exist", () => {
    for (const value of [
      "2000-02-30",
      "2023-02-29",
      "2000-13-01",
      "2000-00-10",
      "2000-04-31",
      "2000-01-00",
    ]) {
      expect(isRealIsoDate(value), value).toBe(false);
    }
  });

  it("refuses wrong formats and years before 1900", () => {
    for (const value of [
      "",
      "2000/06/06",
      "06-06-2000",
      "2000-6-6",
      "20000-01-01",
      "1899-12-31",
      " 2000-06-06",
      "2000-06-06T00:00:00Z",
    ]) {
      expect(isRealIsoDate(value), value).toBe(false);
    }
  });
});

describe("isInFuture", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("treats today and yesterday as not in the future", () => {
    expect(isInFuture("2026-06-15", now)).toBe(false);
    expect(isInFuture("2026-06-14", now)).toBe(false);
    expect(isInFuture("1990-01-01", now)).toBe(false);
  });

  it("allows one day of slack for timezones ahead of UTC, but no more", () => {
    expect(isInFuture("2026-06-16", now)).toBe(false);
    expect(isInFuture("2026-06-17", now)).toBe(true);
    expect(isInFuture("2030-01-01", now)).toBe(true);
  });
});
