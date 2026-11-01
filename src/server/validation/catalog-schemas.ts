import "server-only";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** True for something that could be a category or product slug; anything else cannot exist, so it is "not found" without a database query. */
export function isSlug(value: string): boolean {
  return value.length <= 120 && SLUG.test(value);
}
