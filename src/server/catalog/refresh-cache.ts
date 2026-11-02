import "server-only";

import { revalidateTag } from "next/cache";

import { logger, serializeError } from "@/server/logger";

/**
 * Makes the shop pages (categories, product pages, home) show a catalogue or
 * stock change at once instead of up to a minute later. Call it after the
 * change is saved. It must never fail the request: the data is already saved,
 * and the pages catch up on their own within a minute anyway. (Outside a
 * running Next.js server, for example in tests, there is no cache to refresh.)
 */
export function refreshCatalogCache(): void {
  try {
    revalidateTag("catalog", { expire: 0 });
  } catch (error) {
    logger.debug("catalogue cache was not refreshed", {
      error: serializeError(error),
    });
  }
}
