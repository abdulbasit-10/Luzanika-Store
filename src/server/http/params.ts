import { z } from "zod";

import { ApiError } from "./api-error";

/**
 * An id from the URL. A malformed one is "not found", exactly like an id that
 * does not exist, so ids cannot be probed.
 */
export function uuidParam(raw: string): string {
  const parsed = z.uuid().safeParse(raw);
  if (!parsed.success) throw new ApiError("not_found");
  return parsed.data;
}
