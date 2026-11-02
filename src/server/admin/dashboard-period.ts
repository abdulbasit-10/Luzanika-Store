const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;

/** Midnight (UTC) at the start of the day the moment falls on. */
function startOfDay(moment: Date): Date {
  return new Date(
    Date.UTC(
      moment.getUTCFullYear(),
      moment.getUTCMonth(),
      moment.getUTCDate(),
    ),
  );
}

/**
 * The period the dashboard covers. With nothing chosen it is the last 30 days
 * up to and including today (UTC days). A chosen start without an end runs to
 * the end of today; an end without a start covers 30 days before it. The end
 * is exclusive.
 */
export function resolvePeriod(
  choice: { from?: Date; to?: Date },
  now: Date,
): { from: Date; to: Date } {
  const endOfToday = new Date(startOfDay(now).getTime() + DAY_MS);
  const to = choice.to ?? endOfToday;
  const from =
    choice.from ?? new Date(startOfDay(to).getTime() - DEFAULT_DAYS * DAY_MS);
  return { from, to };
}

/** Every UTC day (YYYY-MM-DD) the period touches, oldest first. */
export function daysOf(period: { from: Date; to: Date }): string[] {
  const days: string[] = [];
  for (
    let day = startOfDay(period.from).getTime();
    day < period.to.getTime();
    day += DAY_MS
  ) {
    days.push(new Date(day).toISOString().slice(0, 10));
  }
  return days;
}
