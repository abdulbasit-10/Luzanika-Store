import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { execute, selectRows } from "@/server/db/query";
import { withTransaction } from "@/server/db/transaction";
import type { AdminContext } from "@/server/services/staff-admin-service";

/** When the home page "Special offers" row ends, and its headline. Both are optional. */
export interface OfferDto {
  /** ISO 8601, or null for a row without a countdown. */
  endsAt: string | null;
  headline: string | null;
}

interface OfferRow {
  ends_at: Date | null;
  headline: string | null;
}

const toDto = (row: OfferRow | undefined): OfferDto => ({
  endsAt: row?.ends_at ? new Date(row.ends_at).toISOString() : null,
  headline: row?.headline ?? null,
});

export async function getOffer(): Promise<OfferDto> {
  const rows = await selectRows<OfferRow>(
    `SELECT ends_at, headline FROM home_offer WHERE id = 1`,
  );
  return toDto(rows[0]);
}

/** Staff set (or clear) the end time and headline of the offer row. */
export async function setOffer(
  ctx: AdminContext,
  input: { endsAt: string | null; headline: string | null },
): Promise<OfferDto> {
  await withTransaction(async (tx) => {
    const before = toDto(
      (
        await selectRows<OfferRow>(
          `SELECT ends_at, headline FROM home_offer WHERE id = 1 FOR UPDATE`,
          {},
          tx,
        )
      )[0],
    );
    await execute(
      `UPDATE home_offer SET ends_at = :endsAt, headline = :headline, updated_by = :by, updated_at = now()
       WHERE id = 1`,
      { endsAt: input.endsAt, headline: input.headline, by: ctx.actor.id },
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "home.offer",
        entityType: "home_section",
        entityId: "special-offers",
        before,
        after: { endsAt: input.endsAt, headline: input.headline },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getOffer();
}
