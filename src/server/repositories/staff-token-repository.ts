import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type StaffTokenType = "invite" | "reset_password";

export interface StaffTokenRecord {
  id: string;
  staffId: string;
  type: StaffTokenType;
  expiresAt: Date;
}

export const staffTokenRepository = {
  /** Stores a new link and cancels the person's older unused links of the same kind, so only the newest email works. */
  async replace(
    input: {
      staffId: string;
      type: StaffTokenType;
      tokenHash: string;
      expiresAt: Date;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      "DELETE FROM staff_tokens WHERE staff_id = :staffId AND type = :type AND used_at IS NULL",
      input,
      tx,
    );
    await execute(
      `INSERT INTO staff_tokens (staff_id, type, token_hash, expires_at)
       VALUES (:staffId, :type, :tokenHash, :expiresAt)`,
      input,
      tx,
    );
  },

  /** Finds an unused, unexpired link and locks it, so two requests with the same link cannot both succeed. */
  async findUsableForUpdate(
    tokenHash: string,
    type: StaffTokenType,
    now: Date,
    tx: Tx,
  ): Promise<StaffTokenRecord | null> {
    const rows = await selectRows<{
      id: string;
      staff_id: string;
      type: StaffTokenType;
      expires_at: Date;
    }>(
      `SELECT id, staff_id, type, expires_at FROM staff_tokens
       WHERE token_hash = :tokenHash AND type = :type AND used_at IS NULL AND expires_at > :now
       FOR UPDATE`,
      { tokenHash, type, now },
      tx,
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          staffId: row.staff_id,
          type: row.type,
          expiresAt: row.expires_at,
        }
      : null;
  },

  async markUsed(id: string, at: Date, tx: Tx): Promise<void> {
    await execute(
      "UPDATE staff_tokens SET used_at = :at WHERE id = :id",
      {
        id,
        at,
      },
      tx,
    );
  },

  /** Cancels every unused link of a kind (for example after the password changed another way). */
  async cancelUnused(
    staffId: string,
    type: StaffTokenType,
    tx: Tx,
  ): Promise<void> {
    await execute(
      "DELETE FROM staff_tokens WHERE staff_id = :staffId AND type = :type AND used_at IS NULL",
      { staffId, type },
      tx,
    );
  },
};

export const staffRecoveryCodeRepository = {
  /** Replaces all of the person's recovery codes with a new set. */
  async replaceAll(staffId: string, hashes: string[], tx: Tx): Promise<void> {
    await execute(
      "DELETE FROM staff_recovery_codes WHERE staff_id = :staffId",
      { staffId },
      tx,
    );
    for (const codeHash of hashes) {
      await execute(
        "INSERT INTO staff_recovery_codes (staff_id, code_hash) VALUES (:staffId, :codeHash)",
        { staffId, codeHash },
        tx,
      );
    }
  },

  /** Uses a code once. Returns false when it does not exist or was already used. */
  async consume(staffId: string, codeHash: string, tx?: Tx): Promise<boolean> {
    const affected = await execute(
      `UPDATE staff_recovery_codes SET used_at = now()
       WHERE staff_id = :staffId AND code_hash = :codeHash AND used_at IS NULL`,
      { staffId, codeHash },
      tx,
    );
    return affected > 0;
  },

  async countUnused(staffId: string, tx?: Tx): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      "SELECT count(*)::int AS n FROM staff_recovery_codes WHERE staff_id = :staffId AND used_at IS NULL",
      { staffId },
      tx,
    );
    return rows[0].n;
  },

  async deleteAll(staffId: string, tx: Tx): Promise<void> {
    await execute(
      "DELETE FROM staff_recovery_codes WHERE staff_id = :staffId",
      { staffId },
      tx,
    );
  },
};
