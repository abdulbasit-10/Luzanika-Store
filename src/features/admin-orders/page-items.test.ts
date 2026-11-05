import { describe, expect, it } from "vitest";

import { pageItems } from "./page-items";

describe("pageItems", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows the first pages, a gap and the last page, as in the design", () => {
    expect(pageItems(2, 15)).toEqual([1, 2, 3, "…", 15]);
  });

  it("keeps the current page and its neighbours in the middle", () => {
    expect(pageItems(8, 15)).toEqual([1, "…", 7, 8, 9, "…", 15]);
  });

  it("shows the last pages near the end", () => {
    expect(pageItems(15, 15)).toEqual([1, "…", 14, 15]);
  });
});
