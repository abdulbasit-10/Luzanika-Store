export interface PeriodPreset {
  id: string;
  label: string;
  days: number;
}

/** The API allows at most 366 days. */
export const PERIOD_PRESETS: PeriodPreset[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
];

export const DEFAULT_PERIOD_ID = "30d";

const DAY_MS = 86_400_000;

/** yyyy-mm-dd of a moment, in UTC (the dashboard counts UTC days). */
export function utcDay(moment: Date): string {
  return moment.toISOString().slice(0, 10);
}

const addDays = (day: string, delta: number) =>
  utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS));

export interface DayRange {
  from: string;
  to: string;
}

/** The `days` days up to and including `today`. */
export function currentRange(days: number, today: Date = new Date()): DayRange {
  const to = utcDay(today);
  return { from: addDays(to, -(days - 1)), to };
}

/** The same number of days right before `range`, to compare with. */
export function previousRange(range: DayRange): DayRange {
  const days =
    Math.round(
      (Date.parse(`${range.to}T00:00:00Z`) -
        Date.parse(`${range.from}T00:00:00Z`)) /
        DAY_MS,
    ) + 1;
  const to = addDays(range.from, -1);
  return { from: addDays(to, -(days - 1)), to };
}

const shortDay = (day: string, withYear: boolean) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

/** "Oct 5 – Nov 3, 2026". */
export function rangeLabel({ from, to }: DayRange): string {
  return `${shortDay(from, false)} – ${shortDay(to, true)}`;
}

/** Every day from `from` for `days` days, as yyyy-mm-dd. */
export function daysFrom(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

export { shortDay };
