import type { RegionCode } from "@/types/region";

import type {
  DiscountDetail,
  DiscountInput,
  DiscountProduct,
} from "./admin-discounts-service";

/** What the form holds while someone types. Dates are what a date box gives: local time, "2026-11-20T09:00". */
export interface DiscountFormValues {
  name: string;
  percent: string;
  markets: RegionCode[];
  startsAt: string;
  endsAt: string;
  active: boolean;
  products: DiscountProduct[];
}

export type DiscountProblems = Partial<
  Record<"name" | "percent" | "markets" | "endsAt" | "products", string>
>;

export const EMPTY_DISCOUNT: DiscountFormValues = {
  name: "",
  percent: "",
  markets: ["PK", "DE"],
  startsAt: "",
  endsAt: "",
  active: true,
  products: [],
};

/** How a product is named in the picker: "Archival Cashmere Overshirt · Kids". */
export function productLabel(product: {
  name: string;
  category: string | null;
}): string {
  return product.category
    ? `${product.name} · ${product.category}`
    : product.name;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** An ISO moment as the text of a date box, in the browser's own time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The text of a date box as an ISO moment, or null when it is empty. */
export function fromLocalInput(text: string): string | null {
  if (!text.trim()) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function discountToValues(discount: DiscountDetail): DiscountFormValues {
  return {
    name: discount.name,
    percent: String(discount.percent),
    markets: discount.markets,
    startsAt: toLocalInput(discount.startsAt),
    endsAt: toLocalInput(discount.endsAt),
    active: discount.active,
    products: discount.products,
  };
}

/** The checks of the form, so people hear what is wrong before the server says no. */
export function discountProblems(values: DiscountFormValues): DiscountProblems {
  const problems: DiscountProblems = {};
  if (!values.name.trim()) problems.name = "Please give the discount a name";
  else if (values.name.trim().length > 80) {
    problems.name = "Keep the name under 80 characters";
  }

  const percent = Number(values.percent);
  if (
    !values.percent.trim() ||
    !Number.isInteger(percent) ||
    percent < 1 ||
    percent > 90
  ) {
    problems.percent = "Enter a whole percent from 1 to 90";
  }

  if (values.markets.length === 0) problems.markets = "Choose a market";
  if (values.products.length === 0) {
    problems.products = "Choose at least one product";
  }

  const start = values.startsAt.trim() ? new Date(values.startsAt) : null;
  const end = values.endsAt.trim() ? new Date(values.endsAt) : null;
  if (end && Number.isNaN(end.getTime())) {
    problems.endsAt = "Enter a valid end date";
  } else if (start && end && end <= start) {
    problems.endsAt = "The end must be after the start";
  }
  return problems;
}

/** What the API takes. Call only when `discountProblems` found nothing. */
export function toDiscountInput(values: DiscountFormValues): DiscountInput {
  return {
    name: values.name.trim(),
    percent: Number(values.percent),
    markets: values.markets,
    startsAt: fromLocalInput(values.startsAt),
    endsAt: fromLocalInput(values.endsAt),
    active: values.active,
    productIds: values.products.map((product) => product.id),
  };
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "From 20 Nov 2026 to 31 Dec 2026", "Until 31 Dec 2026", "From 20 Nov 2026" or "Always". */
export function describeDates(
  startsAt: string | null,
  endsAt: string | null,
): string {
  const from = startsAt ? dayFormat.format(new Date(startsAt)) : null;
  const to = endsAt ? dayFormat.format(new Date(endsAt)) : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Always";
}
