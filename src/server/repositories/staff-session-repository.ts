import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

import {
  STAFF_SELECT_COLUMNS,
  toStaffRecord,
  type StaffRecord,
} from "./staff-repository";

export interface StaffSessionRecord {
  id: string;
  staffId: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  /** Empty while the session is still waiting for the authenticator code. */
  mfaVerifiedAt: Date | null;
  revokedAt: Date | null;
}

interface SessionJoinRow {
  session_id: string;
  session_created_at: Date;
  session_last_used_at: Date;
  session_expires_at: Date;
  session_mfa_verified_at: Date | null;
  session_revoked_at: Date | null;
}

export const staffSessionRepository = {
  async create(input: {
    staffId: string;
    tokenHash: string;
    ip: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<StaffSessionRecord> {
    const rows = await selectRows<{
      id: string;
      created_at: Date;
      last_used_at: Date;
    }>(
      `INSERT INTO staff_sessions (staff_id, token_hash, ip, user_agent, expires_at)
       VALUES (:staffId, :tokenHash, CAST(:ip AS inet), :userAgent, :expiresAt)
       RETURNING id, created_at, last_used_at`,
      {
        ...input,
        ip: input.ip,
        userAgent: input.userAgent?.slice(0, 512) ?? null,
      },
    );
    return {
      id: rows[0].id,
      staffId: input.staffId,
      createdAt: rows[0].created_at,
      lastUsedAt: rows[0].last_used_at,
      expiresAt: input.expiresAt,
      mfaVerifiedAt: null,
      revokedAt: null,
    };
  },

  /**
   * The session for this token hash together with its staff member, whatever
   * state both are in. The service decides whether it is still valid.
   */
  async findByTokenHash(
    tokenHash: string,
  ): Promise<{ session: StaffSessionRecord; staff: StaffRecord } | null> {
    const rows = await selectRows<
      SessionJoinRow & Parameters<typeof toStaffRecord>[0]
    >(
      `SELECT s.id AS session_id, s.created_at AS session_created_at,
              s.last_used_at AS session_last_used_at, s.expires_at AS session_expires_at,
              s.mfa_verified_at AS session_mfa_verified_at, s.revoked_at AS session_revoked_at,
              ${STAFF_SELECT_COLUMNS.split(",")
                .map((column) => `st.${column.trim()}`)
                .join(", ")}
       FROM staff_sessions s JOIN staff st ON st.id = s.staff_id
       WHERE s.token_hash = :tokenHash`,
      { tokenHash },
    );
    const row = rows[0];
    if (!row) return null;
    return {
      session: {
        id: row.session_id,
        staffId: row.id,
        createdAt: row.session_created_at,
        lastUsedAt: row.session_last_used_at,
        expiresAt: row.session_expires_at,
        mfaVerifiedAt: row.session_mfa_verified_at,
        revokedAt: row.session_revoked_at,
      },
      staff: toStaffRecord(row),
    };
  },

  async touch(id: string, lastUsedAt: Date, expiresAt: Date): Promise<void> {
    await execute(
      "UPDATE staff_sessions SET last_used_at = :lastUsedAt, expires_at = :expiresAt WHERE id = :id",
      { id, lastUsedAt, expiresAt },
    );
  },

  /** The authenticator code was accepted: the session becomes a real one, with a fresh expiry. */
  async markVerified(
    id: string,
    at: Date,
    expiresAt: Date,
    tx?: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE staff_sessions SET mfa_verified_at = :at, last_used_at = :at, expires_at = :expiresAt
       WHERE id = :id AND revoked_at IS NULL`,
      { id, at, expiresAt },
      tx,
    );
  },

  async revokeByTokenHash(tokenHash: string, at: Date): Promise<void> {
    await execute(
      "UPDATE staff_sessions SET revoked_at = :at WHERE token_hash = :tokenHash AND revoked_at IS NULL",
      { tokenHash, at },
    );
  },

  /** Signs the person out everywhere, optionally keeping the browser they are using now. */
  async revokeAllForStaff(
    staffId: string,
    at: Date,
    exceptSessionId?: string,
    tx?: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE staff_sessions SET revoked_at = :at
       WHERE staff_id = :staffId AND revoked_at IS NULL
         AND (CAST(:except AS uuid) IS NULL OR id <> CAST(:except AS uuid))`,
      { staffId, at, except: exceptSessionId ?? null },
      tx,
    );
  },
};
