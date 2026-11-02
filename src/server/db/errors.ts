/** What PostgreSQL says went wrong, found inside whatever Sequelize wrapped it in. */
function postgresCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current =
      (current as { parent?: unknown; original?: unknown; cause?: unknown })
        .parent ??
      (current as { original?: unknown }).original ??
      (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** The name of the constraint that was broken, e.g. "products_slug_key". */
export function constraintOf(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    const constraint = (current as { constraint?: unknown }).constraint;
    if (typeof constraint === "string") return constraint;
    current =
      (current as { parent?: unknown }).parent ??
      (current as { original?: unknown }).original ??
      (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** A value that must be unique already exists (23505). */
export function isUniqueViolation(error: unknown): boolean {
  return postgresCode(error) === "23505";
}

/** Something still points at the row (23503), for example a product in a category being deleted. */
export function isForeignKeyViolation(error: unknown): boolean {
  return postgresCode(error) === "23503";
}

/** A CHECK rule of the table was broken (23514). */
export function isCheckViolation(error: unknown): boolean {
  return postgresCode(error) === "23514";
}
