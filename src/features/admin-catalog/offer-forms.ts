export interface OfferPrice {
  amount: number;
  compareAtAmount: number | null;
}

/** The biggest saving, in whole percent, among prices that carry an old price. Null when none do. */
export function biggestDiscount(
  prices: readonly (OfferPrice | null | undefined)[],
): number | null {
  let best = 0;
  for (const price of prices) {
    if (
      price &&
      price.compareAtAmount &&
      price.compareAtAmount > price.amount
    ) {
      best = Math.max(
        best,
        Math.round(
          ((price.compareAtAmount - price.amount) / price.compareAtAmount) *
            100,
        ),
      );
    }
  }
  return best > 0 ? best : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** An ISO time as the value of a `datetime-local` box, in the browser's own time zone. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** What a `datetime-local` box holds as an ISO time (read in the browser's time zone), or null when empty or invalid. */
export function fromLocalInput(text: string): string | null {
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export type OfferState = "none" | "running" | "ended";

/** Whether the row has no countdown, is counting down, or is over. */
export function offerState(endsAt: string | null, now: number): OfferState {
  if (!endsAt) return "none";
  return new Date(endsAt).getTime() > now ? "running" : "ended";
}

export function headlineProblem(headline: string): string | undefined {
  return headline.trim().length > 80
    ? "Keep it under 80 characters"
    : undefined;
}
