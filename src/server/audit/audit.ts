import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export interface AuditActor {
  id: string;
  email: string;
}

export interface AuditEntry {
  /** What was done, e.g. "orders.status_change". */
  action: string;
  /** What it was done to, e.g. "order". */
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  /** Only given for sign-in events. */
  ip?: string | null;
}

// Whatever the caller passes, names that look like secrets are replaced.
const SECRET_KEY =
  /pass(word)?|hash|secret|token|recovery|totp|cookie|api[-_]?key/i;
const MAX_DEPTH = 6;
const MAX_STRING = 2000;

/** Copies a value for the audit log with anything secret removed and long text cut. */
export function redactForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => redactForAudit(item, depth + 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SECRET_KEY.test(key)
      ? "[redacted]"
      : redactForAudit(item, depth + 1);
  }
  return result;
}

/**
 * Adds one row to the audit log. Call it inside the same transaction as the
 * change it describes, so the change and its record are saved together or not at all.
 */
export async function recordAudit(
  tx: Tx | undefined,
  actor: AuditActor | null,
  entry: AuditEntry,
  requestId?: string,
): Promise<void> {
  const before =
    entry.before === undefined ? null : redactForAudit(entry.before);
  const after = entry.after === undefined ? null : redactForAudit(entry.after);

  await execute(
    `INSERT INTO audit_log (staff_id, staff_email, action, entity_type, entity_id, before, after, request_id, ip)
     VALUES (:staffId, :staffEmail, :action, :entityType, :entityId,
             CAST(:before AS jsonb), CAST(:after AS jsonb), :requestId, CAST(:ip AS inet))`,
    {
      staffId: actor?.id ?? null,
      staffEmail: actor?.email ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: before === null ? null : JSON.stringify(before),
      after: after === null ? null : JSON.stringify(after),
      requestId: requestId ?? null,
      ip: entry.ip ?? null,
    },
    tx,
  );
}

export interface AuditRow {
  id: string;
  at: Date;
  staffId: string | null;
  staffEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  requestId: string | null;
}

export interface AuditFilter {
  staffId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

/** Reads the log, newest first. */
export async function listAudit(
  filter: AuditFilter,
  limit: number,
  offset: number,
): Promise<{ items: AuditRow[]; total: number }> {
  const replacements = {
    staffId: filter.staffId ?? null,
    entityType: filter.entityType ?? null,
    entityId: filter.entityId ?? null,
    action: filter.action ?? null,
    from: filter.from ?? null,
    to: filter.to ?? null,
    limit,
    offset,
  };
  const where = `WHERE (CAST(:staffId AS uuid) IS NULL OR staff_id = CAST(:staffId AS uuid))
      AND (CAST(:entityType AS text) IS NULL OR entity_type = :entityType)
      AND (CAST(:entityId AS text) IS NULL OR entity_id = :entityId)
      AND (CAST(:action AS text) IS NULL OR action = :action)
      AND (CAST(:from AS timestamptz) IS NULL OR at >= CAST(:from AS timestamptz))
      AND (CAST(:to AS timestamptz) IS NULL OR at < CAST(:to AS timestamptz))`;

  const [rows, count] = await Promise.all([
    selectRows<{
      id: string;
      at: Date;
      staff_id: string | null;
      staff_email: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      before: unknown;
      after: unknown;
      request_id: string | null;
    }>(
      `SELECT id, at, staff_id, staff_email, action, entity_type, entity_id, before, after, request_id
       FROM audit_log ${where} ORDER BY at DESC, id DESC LIMIT :limit OFFSET :offset`,
      replacements,
    ),
    selectRows<{ n: number }>(
      `SELECT count(*)::int AS n FROM audit_log ${where}`,
      replacements,
    ),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      at: row.at,
      staffId: row.staff_id,
      staffEmail: row.staff_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      before: row.before,
      after: row.after,
      requestId: row.request_id,
    })),
    total: count[0].n,
  };
}
