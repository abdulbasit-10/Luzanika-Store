const MIN_YEAR = 1900;

/** True for a real calendar date written as YYYY-MM-DD (so 2000-02-30 is refused). */
export function isRealIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  if (year < MIN_YEAR) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** True when the YYYY-MM-DD date is later than today (UTC). Tomorrow in any timezone counts as the future. */
export function isInFuture(value: string, now: Date = new Date()): boolean {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // One day of slack so someone in a timezone ahead of UTC can still enter their own "today".
  return (
    new Date(`${value}T00:00:00Z`).getTime() > today.getTime() + 86_400_000
  );
}
