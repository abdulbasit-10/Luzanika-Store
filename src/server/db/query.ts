import "server-only";

import { QueryTypes } from "sequelize";

import { getSequelize } from "@/server/db/connection";
import type { Tx } from "@/server/db/transaction";

/** Runs a read with bound `:name` values, inside the caller's transaction when there is one. */
export function selectRows<T extends object>(
  sql: string,
  replacements: Record<string, unknown> = {},
  tx?: Tx,
): Promise<T[]> {
  return getSequelize().query<T>(sql, {
    type: QueryTypes.SELECT,
    replacements,
    transaction: tx,
  });
}

/** Runs a change with bound `:name` values and returns how many rows it touched. */
export async function execute(
  sql: string,
  replacements: Record<string, unknown> = {},
  tx?: Tx,
): Promise<number> {
  const [, affected] = (await getSequelize().query(sql, {
    replacements,
    transaction: tx,
  })) as [unknown, { rowCount?: number } | number | undefined];
  if (typeof affected === "number") return affected;
  return affected?.rowCount ?? 0;
}
