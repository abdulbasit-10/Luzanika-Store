/**
 * Accepts only paths on this site ("/account"), so a crafted ?next= link
 * cannot send a visitor to another website after they log in.
 */
export function getSafeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

/** Adds the return path to a link between the login and sign-up pages. */
export function withNextPath(href: string, next: string | null) {
  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
}
