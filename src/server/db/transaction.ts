import "server-only";

import type { Transaction } from "sequelize";

import { getSequelize } from "./connection";

export type Tx = Transaction;

/** Runs `work` in one database transaction: all of it happens, or none of it. */
export function withTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  return getSequelize().transaction(work);
}
