import type { StockChange } from "./admin-stock-service";

export type AdjustMode = "add" | "remove" | "set";

export interface AdjustValues {
  mode: AdjustMode;
  quantity: string;
  reason: "adjustment" | "correction";
  note: string;
}

export interface AdjustProblems {
  quantity?: string;
  note?: string;
}

const MAX_UNITS = 1_000_000;

/** What the person typed as a whole number of units, or null. */
export function parseUnits(text: string): number | null {
  const cleaned = text.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value <= MAX_UNITS ? value : null;
}

/** The change the form describes: add n, remove n (a negative delta) or set to n. */
export function toStockChange(values: AdjustValues): StockChange | null {
  const quantity = parseUnits(values.quantity);
  if (quantity === null) return null;
  if (values.mode === "set") return { setTo: quantity };
  return { delta: values.mode === "remove" ? -quantity : quantity };
}

export function adjustProblems(values: AdjustValues): AdjustProblems {
  const problems: AdjustProblems = {};
  const quantity = parseUnits(values.quantity);
  if (quantity === null) problems.quantity = "Enter a whole number";
  else if (values.mode !== "set" && quantity === 0)
    problems.quantity = "Enter at least 1";
  if (values.reason === "correction" && !values.note.trim())
    problems.note = "Please say what was wrong";
  else if (values.note.trim().length > 200)
    problems.note = "Keep it under 200 characters";
  return problems;
}

/** What the shelf will hold after the change, for the line under the form. */
export function resultingOnHand(
  onHand: number,
  values: AdjustValues,
): number | null {
  const change = toStockChange(values);
  if (!change) return null;
  return change.setTo !== undefined ? change.setTo : onHand + change.delta;
}
