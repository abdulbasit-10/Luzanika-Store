import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type StaffStatus = "invited" | "active" | "disabled";

interface StaffRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string | null;
  status: StaffStatus;
  is_super_admin: boolean;
  totp_secret_enc: string | null;
  totp_enabled_at: Date | null;
  totp_last_step: string | null;
  last_login_at: Date | null;
  created_at: Date;
}

export interface StaffRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** null until the person accepts their invite. */
  passwordHash: string | null;
  status: StaffStatus;
  isSuperAdmin: boolean;
  /** Encrypted authenticator secret. Present while set-up is pending or done. */
  totpSecretEnc: string | null;
  /** Set once the first code was confirmed: from then on a code is required at every sign-in. */
  totpEnabledAt: Date | null;
  totpLastStep: number | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

const COLUMNS = `id, email, first_name, last_name, password_hash, status, is_super_admin,
  totp_secret_enc, totp_enabled_at, totp_last_step, last_login_at, created_at`;

export function toStaffRecord(row: StaffRow): StaffRecord {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    passwordHash: row.password_hash,
    status: row.status,
    isSuperAdmin: row.is_super_admin,
    totpSecretEnc: row.totp_secret_enc,
    totpEnabledAt: row.totp_enabled_at,
    totpLastStep:
      row.totp_last_step === null ? null : Number(row.totp_last_step),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export const STAFF_SELECT_COLUMNS = COLUMNS;

/** Thrown when the email already belongs to another staff member. */
export class StaffEmailTakenError extends Error {
  constructor() {
    super("staff_email_taken");
    this.name = "StaffEmailTakenError";
  }
}

export interface StaffListFilter {
  search?: string;
  status?: StaffStatus;
}

export const staffRepository = {
  async findByEmail(email: string, tx?: Tx): Promise<StaffRecord | null> {
    const rows = await selectRows<StaffRow>(
      `SELECT ${COLUMNS} FROM staff WHERE email = :email`,
      { email },
      tx,
    );
    return rows[0] ? toStaffRecord(rows[0]) : null;
  },

  async findById(id: string, tx?: Tx): Promise<StaffRecord | null> {
    const rows = await selectRows<StaffRow>(
      `SELECT ${COLUMNS} FROM staff WHERE id = :id`,
      { id },
      tx,
    );
    return rows[0] ? toStaffRecord(rows[0]) : null;
  },

  /** Locks the row, so two changes to the same person cannot overlap. */
  async lockById(id: string, tx: Tx): Promise<StaffRecord | null> {
    const rows = await selectRows<StaffRow>(
      `SELECT ${COLUMNS} FROM staff WHERE id = :id FOR UPDATE`,
      { id },
      tx,
    );
    return rows[0] ? toStaffRecord(rows[0]) : null;
  },

  async list(filter: StaffListFilter = {}, tx?: Tx): Promise<StaffRecord[]> {
    const rows = await selectRows<StaffRow>(
      `SELECT ${COLUMNS} FROM staff
       WHERE (CAST(:status AS text) IS NULL OR status = :status)
         AND (CAST(:search AS text) IS NULL
              OR email ILIKE :pattern OR first_name ILIKE :pattern OR last_name ILIKE :pattern)
       ORDER BY created_at, id`,
      {
        status: filter.status ?? null,
        search: filter.search ?? null,
        pattern: `%${(filter.search ?? "").replace(/[\\%_]/g, "\\$&")}%`,
      },
      tx,
    );
    return rows.map(toStaffRecord);
  },

  /** Adds a person who has been invited and has no password yet. */
  async insertInvited(
    input: {
      email: string;
      firstName: string;
      lastName: string;
      isSuperAdmin: boolean;
      invitedBy: string | null;
    },
    tx?: Tx,
  ): Promise<StaffRecord> {
    const existing = await this.findByEmail(input.email, tx);
    if (existing) throw new StaffEmailTakenError();

    const rows = await selectRows<StaffRow>(
      `INSERT INTO staff (email, first_name, last_name, is_super_admin, invited_by)
       VALUES (:email, :firstName, :lastName, :isSuperAdmin, :invitedBy)
       RETURNING ${COLUMNS}`,
      input,
      tx,
    );
    return toStaffRecord(rows[0]);
  },

  /** Changes only the fields given. */
  async update(
    id: string,
    changes: {
      firstName?: string;
      lastName?: string;
      status?: StaffStatus;
      isSuperAdmin?: boolean;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE staff SET
         first_name = COALESCE(:firstName, first_name),
         last_name = COALESCE(:lastName, last_name),
         status = COALESCE(:status, status),
         is_super_admin = COALESCE(:isSuperAdmin, is_super_admin)
       WHERE id = :id`,
      {
        id,
        firstName: changes.firstName ?? null,
        lastName: changes.lastName ?? null,
        status: changes.status ?? null,
        isSuperAdmin: changes.isSuperAdmin ?? null,
      },
      tx,
    );
  },

  /** Sets the password and makes an invited person active. */
  async setPassword(id: string, passwordHash: string, tx?: Tx): Promise<void> {
    await execute(
      `UPDATE staff SET password_hash = :passwordHash,
         status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
       WHERE id = :id`,
      { id, passwordHash },
      tx,
    );
  },

  async recordLogin(id: string, at: Date): Promise<void> {
    await execute("UPDATE staff SET last_login_at = :at WHERE id = :id", {
      id,
      at,
    });
  },

  /** Starts (or restarts) authenticator set-up: stores the new encrypted secret and leaves it unconfirmed. */
  async setPendingTotp(id: string, secretEnc: string, tx?: Tx): Promise<void> {
    await execute(
      `UPDATE staff SET totp_secret_enc = :secretEnc, totp_enabled_at = NULL, totp_last_step = NULL
       WHERE id = :id AND totp_enabled_at IS NULL`,
      { id, secretEnc },
      tx,
    );
  },

  /** Confirms set-up: from now on a code is required at every sign-in. */
  async enableTotp(id: string, step: number, tx: Tx): Promise<void> {
    await execute(
      `UPDATE staff SET totp_enabled_at = now(), totp_last_step = :step WHERE id = :id`,
      { id, step },
      tx,
    );
  },

  /**
   * Remembers the step of a code that was just used. Returns false when that
   * step (or a later one) was already used, so two requests with the same code
   * cannot both succeed.
   */
  async claimTotpStep(id: string, step: number, tx?: Tx): Promise<boolean> {
    const affected = await execute(
      `UPDATE staff SET totp_last_step = :step
       WHERE id = :id AND (totp_last_step IS NULL OR totp_last_step < :step)`,
      { id, step },
      tx,
    );
    return affected > 0;
  },

  /** Removes the authenticator, so the person sets it up again at their next sign-in. */
  async clearTotp(id: string, tx: Tx): Promise<void> {
    await execute(
      `UPDATE staff SET totp_secret_enc = NULL, totp_enabled_at = NULL, totp_last_step = NULL
       WHERE id = :id`,
      { id },
      tx,
    );
  },

  /** Locks every active super admin and returns their ids, so "never the last one" can be checked safely. */
  async lockActiveSuperAdmins(tx: Tx): Promise<string[]> {
    const rows = await selectRows<{ id: string }>(
      `SELECT id FROM staff WHERE is_super_admin AND status = 'active' ORDER BY id FOR UPDATE`,
      {},
      tx,
    );
    return rows.map((row) => row.id);
  },

  async anySuperAdminExists(tx?: Tx): Promise<boolean> {
    const rows = await selectRows(
      "SELECT 1 FROM staff WHERE is_super_admin LIMIT 1",
      {},
      tx,
    );
    return rows.length > 0;
  },
};
