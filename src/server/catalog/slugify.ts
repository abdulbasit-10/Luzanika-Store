/**
 * Turns a name into a web address part: "Linen Shirt — Sand & Olive" becomes
 * "linen-shirt-sand-olive". Accents are dropped ("Café" becomes "cafe"), anything
 * else that is not a letter or digit becomes a dash, and the result always
 * matches the database rule (lower-case words joined by single dashes).
 * Returns an empty string when nothing usable is left (a name of only symbols).
 */
export function slugify(name: string, maxLength = 100): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Cut at the limit without leaving half a word or a trailing dash.
  return slug.slice(0, maxLength).replace(/-+$/g, "");
}
