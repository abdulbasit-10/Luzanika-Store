import { apiGet } from "@/lib/api-client";

export interface AuditRow {
  id: string;
  at: string;
  staffId: string | null;
  staffEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  requestId: string | null;
}

export interface AuditPage {
  items: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFilters {
  staffId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  /** A day, yyyy-mm-dd. */
  from?: string;
  /** A day, yyyy-mm-dd; the whole day counts. */
  to?: string;
}

export const fetchAudit = (
  filters: AuditFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<AuditPage>("/admin/audit", {
    params: {
      ...filters,
      entityId: filters.entityId?.trim() || undefined,
      page,
      pageSize,
    },
  });
