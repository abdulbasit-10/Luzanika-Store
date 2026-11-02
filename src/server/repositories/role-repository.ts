import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  /** How many staff members have this role. */
  staffCount: number;
}

interface RoleRow {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  staff_count: number;
}

const ROLE_SELECT = `SELECT r.id, r.name::text AS name, r.description, r.permissions,
    (SELECT count(*)::int FROM staff_roles sr WHERE sr.role_id = r.id) AS staff_count
  FROM roles r`;

function toRole(row: RoleRow): RoleRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: row.permissions,
    staffCount: row.staff_count,
  };
}

/** Thrown when another role already has this name. */
export class RoleNameTakenError extends Error {
  constructor() {
    super("role_name_taken");
    this.name = "RoleNameTakenError";
  }
}

export const roleRepository = {
  async list(tx?: Tx): Promise<RoleRecord[]> {
    const rows = await selectRows<RoleRow>(
      `${ROLE_SELECT} ORDER BY r.name`,
      {},
      tx,
    );
    return rows.map(toRole);
  },

  async findById(id: string, tx?: Tx): Promise<RoleRecord | null> {
    const rows = await selectRows<RoleRow>(
      `${ROLE_SELECT} WHERE r.id = :id`,
      { id },
      tx,
    );
    return rows[0] ? toRole(rows[0]) : null;
  },

  async create(
    input: { name: string; description: string; permissions: string[] },
    tx: Tx,
  ): Promise<RoleRecord> {
    const taken = await selectRows(
      "SELECT 1 FROM roles WHERE name = :name",
      { name: input.name },
      tx,
    );
    if (taken.length > 0) throw new RoleNameTakenError();

    const rows = await selectRows<{ id: string }>(
      `INSERT INTO roles (name, description, permissions)
       VALUES (:name, :description,
         ARRAY(SELECT jsonb_array_elements_text(CAST(:permissions AS jsonb))))
       RETURNING id`,
      { ...input, permissions: JSON.stringify(input.permissions) },
      tx,
    );
    return (await this.findById(rows[0].id, tx))!;
  },

  async update(
    id: string,
    changes: { name?: string; description?: string; permissions?: string[] },
    tx: Tx,
  ): Promise<void> {
    if (changes.name !== undefined) {
      const taken = await selectRows(
        "SELECT 1 FROM roles WHERE name = :name AND id <> :id",
        { name: changes.name, id },
        tx,
      );
      if (taken.length > 0) throw new RoleNameTakenError();
    }
    await execute(
      `UPDATE roles SET
         name = COALESCE(:name, name),
         description = COALESCE(:description, description),
         permissions = CASE WHEN CAST(:permissions AS text) IS NULL THEN permissions
           ELSE ARRAY(SELECT jsonb_array_elements_text(CAST(:permissions AS jsonb))) END
       WHERE id = :id`,
      {
        id,
        name: changes.name ?? null,
        description: changes.description ?? null,
        permissions:
          changes.permissions === undefined
            ? null
            : JSON.stringify(changes.permissions),
      },
      tx,
    );
  },

  async delete(id: string, tx: Tx): Promise<void> {
    await execute("DELETE FROM roles WHERE id = :id", { id }, tx);
  },

  /** Which of these role ids exist. */
  async existingIds(ids: string[], tx?: Tx): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await selectRows<{ id: string }>(
      "SELECT id FROM roles WHERE id IN (:ids)",
      { ids },
      tx,
    );
    return rows.map((row) => row.id);
  },

  /** The roles of several staff members, by staff id. */
  async rolesForStaff(
    staffIds: string[],
    tx?: Tx,
  ): Promise<Map<string, { id: string; name: string }[]>> {
    const result = new Map<string, { id: string; name: string }[]>();
    if (staffIds.length === 0) return result;
    const rows = await selectRows<{
      staff_id: string;
      id: string;
      name: string;
    }>(
      `SELECT sr.staff_id, r.id, r.name::text AS name FROM staff_roles sr
       JOIN roles r ON r.id = sr.role_id
       WHERE sr.staff_id IN (:staffIds) ORDER BY r.name`,
      { staffIds },
      tx,
    );
    for (const row of rows) {
      const list = result.get(row.staff_id) ?? [];
      list.push({ id: row.id, name: row.name });
      result.set(row.staff_id, list);
    }
    return result;
  },

  /** Every permission name the person's roles add up to (not including the super admin's "everything"). */
  async permissionsForStaff(staffId: string, tx?: Tx): Promise<string[]> {
    const rows = await selectRows<{ permission: string }>(
      `SELECT DISTINCT unnest(r.permissions) AS permission FROM staff_roles sr
       JOIN roles r ON r.id = sr.role_id WHERE sr.staff_id = :staffId`,
      { staffId },
      tx,
    );
    return rows.map((row) => row.permission);
  },

  /** Replaces the person's roles with exactly these. */
  async setStaffRoles(
    staffId: string,
    roleIds: string[],
    tx: Tx,
  ): Promise<void> {
    await execute(
      "DELETE FROM staff_roles WHERE staff_id = :staffId",
      { staffId },
      tx,
    );
    for (const roleId of roleIds) {
      await execute(
        "INSERT INTO staff_roles (staff_id, role_id) VALUES (:staffId, :roleId)",
        { staffId, roleId },
        tx,
      );
    }
  },
};
