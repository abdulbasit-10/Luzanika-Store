import { parseMajorToMinor } from "@/features/admin-shell/admin-money";

import type { Price } from "./admin-products-service";

export type Problems<T> = Partial<Record<keyof T, string>>;

// ------------------------------------------------------------------- prices

export interface PriceText {
  amount: string;
  compareAt: string;
}

/** The text of a price field: "890" or "890.50" (no thousands separator, no trailing zeros). */
export function minorToText(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}

export const priceToText = (price: Price | null): PriceText => ({
  amount: minorToText(price?.amount),
  compareAt: minorToText(price?.compareAtAmount),
});

/**
 * Reads one market's two price fields. Both empty means "not sold here" (null).
 * The old price is shown struck through, so it has to be higher than the price.
 */
export function readPrice(text: PriceText): {
  price: Price | null;
  problems: Problems<PriceText>;
} {
  const amountText = text.amount.trim();
  const compareText = text.compareAt.trim();
  if (!amountText && !compareText) return { price: null, problems: {} };

  const problems: Problems<PriceText> = {};
  const amount = amountText ? parseMajorToMinor(amountText) : null;
  if (!amountText) problems.amount = "Enter the price";
  else if (amount === null) problems.amount = "Use a number like 1200 or 49.90";

  let compareAtAmount: number | null = null;
  if (compareText) {
    compareAtAmount = parseMajorToMinor(compareText);
    if (compareAtAmount === null) {
      problems.compareAt = "Use a number like 1500 or 59.90";
    } else if (amount !== null && compareAtAmount <= amount) {
      problems.compareAt = "The old price must be higher than the price";
    }
  }

  if (Object.keys(problems).length > 0 || amount === null) {
    return { price: null, problems };
  }
  return { price: { amount, compareAtAmount }, problems };
}

// ------------------------------------------------------------------ basics

export interface BasicsText {
  name: string;
  slug: string;
  tagline: string;
  badgeLabel: string;
  notes: string;
}

/** One note per line, empty lines dropped. */
export const notesFromText = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function basicsProblems(values: BasicsText): Problems<BasicsText> {
  const problems: Problems<BasicsText> = {};
  if (!values.name.trim()) problems.name = "Enter the product name";
  else if (values.name.trim().length > 160)
    problems.name = "Keep it under 160 characters";
  const slug = values.slug.trim();
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    problems.slug = "Use lowercase letters, digits and single dashes";
  }
  if (values.tagline.trim().length > 300) {
    problems.tagline = "Keep it under 300 characters";
  }
  if (values.badgeLabel.trim().length > 30) {
    problems.badgeLabel = "Keep it under 30 characters";
  }
  const notes = notesFromText(values.notes);
  if (notes.length > 10) problems.notes = "At most 10 notes";
  else if (notes.some((note) => note.length > 40))
    problems.notes = "Keep each note under 40 characters";
  else if (new Set(notes).size !== notes.length)
    problems.notes = "List each note once";
  return problems;
}

// ---------------------------------------------------------------- variants

export interface VariantText {
  sku: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  stockPK: string;
  stockDE: string;
}

const stockText = (text: string): number | null => {
  const value = text.trim();
  if (value === "") return 0;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
};

export function variantProblems(values: VariantText): Problems<VariantText> {
  const problems: Problems<VariantText> = {};
  const sku = values.sku.trim();
  if (!sku) problems.sku = "Enter the SKU";
  else if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku))
    problems.sku = "Use letters, digits, dots, dashes and underscores";
  else if (sku.length > 64) problems.sku = "Keep it under 64 characters";

  const name = values.colorName.trim();
  const hex = values.colorHex.trim();
  if (name.length > 40) problems.colorName = "Keep it under 40 characters";
  if (hex && !/^#[0-9a-fA-F]{6}$/.test(hex))
    problems.colorHex = "Use a colour like #1a2b3c";
  else if (Boolean(name) !== Boolean(hex))
    problems.colorHex = "Give both the colour name and its code, or neither";
  if (values.sizeLabel.trim().length > 20)
    problems.sizeLabel = "Keep it under 20 characters";

  for (const key of ["stockPK", "stockDE"] as const) {
    const quantity = stockText(values[key]);
    if (quantity === null) problems[key] = "Enter a whole number";
    else if (quantity > 1_000_000) problems[key] = "That is too many";
  }
  return problems;
}

/** The body of POST /variants, once the form has no problems. */
export function variantBody(values: VariantText) {
  const name = values.colorName.trim();
  const hex = values.colorHex.trim();
  return {
    sku: values.sku.trim(),
    colorName: name || null,
    colorHex: hex || null,
    sizeLabel: values.sizeLabel.trim() || null,
    active: true,
    stock: {
      PK: stockText(values.stockPK) ?? 0,
      DE: stockText(values.stockDE) ?? 0,
    },
  };
}

// ---------------------------------------------------------------- sections

export interface SectionText {
  title: string;
  body: string;
}

export function sectionProblems(
  sections: SectionText[],
): { index: number; message: string } | null {
  if (sections.length > 12)
    return { index: 12, message: "At most 12 sections" };
  for (const [index, section] of sections.entries()) {
    if (!section.title.trim() || !section.body.trim()) {
      return { index, message: "Give every section a title and a text" };
    }
    if (section.title.trim().length > 80) {
      return { index, message: "Keep a title under 80 characters" };
    }
    if (section.body.trim().length > 4000) {
      return { index, message: "Keep a text under 4,000 characters" };
    }
  }
  return null;
}
