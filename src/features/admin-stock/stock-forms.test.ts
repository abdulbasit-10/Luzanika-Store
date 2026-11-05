import { describe, expect, it } from "vitest";

import {
  adjustProblems,
  parseUnits,
  resultingOnHand,
  toStockChange,
  type AdjustValues,
} from "./stock-forms";

const base: AdjustValues = {
  mode: "add",
  quantity: "5",
  reason: "adjustment",
  note: "",
};

describe("parseUnits", () => {
  it("accepts whole numbers only", () => {
    expect(parseUnits(" 12 ")).toBe(12);
    expect(parseUnits("1.5")).toBeNull();
    expect(parseUnits("-3")).toBeNull();
    expect(parseUnits("")).toBeNull();
    expect(parseUnits("2000000")).toBeNull();
  });
});

describe("toStockChange", () => {
  it("adds, removes and sets", () => {
    expect(toStockChange(base)).toEqual({ delta: 5 });
    expect(toStockChange({ ...base, mode: "remove" })).toEqual({ delta: -5 });
    expect(toStockChange({ ...base, mode: "set", quantity: "0" })).toEqual({
      setTo: 0,
    });
    expect(toStockChange({ ...base, quantity: "x" })).toBeNull();
  });
});

describe("adjustProblems", () => {
  it("accepts a plain addition", () => {
    expect(adjustProblems(base)).toEqual({});
  });

  it("refuses adding or removing nothing, but allows setting to 0", () => {
    expect(adjustProblems({ ...base, quantity: "0" }).quantity).toBeTruthy();
    expect(adjustProblems({ ...base, mode: "set", quantity: "0" })).toEqual({});
  });

  it("asks a correction to say what was wrong", () => {
    expect(adjustProblems({ ...base, reason: "correction" }).note).toBeTruthy();
    expect(
      adjustProblems({ ...base, reason: "correction", note: "Miscounted" }),
    ).toEqual({});
  });
});

describe("resultingOnHand", () => {
  it("shows what the shelf will hold", () => {
    expect(resultingOnHand(10, base)).toBe(15);
    expect(resultingOnHand(10, { ...base, mode: "remove" })).toBe(5);
    expect(resultingOnHand(10, { ...base, mode: "set", quantity: "3" })).toBe(
      3,
    );
    expect(resultingOnHand(10, { ...base, quantity: "" })).toBeNull();
  });
});
