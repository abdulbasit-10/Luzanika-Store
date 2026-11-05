"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";

import { dateTimeFormat } from "@/features/admin-orders/order-detail-ui";
import { OrdersPagination } from "@/features/admin-orders/orders-table";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import {
  TableMessage,
  bodyCell,
  filterBarClass,
  filterBoxClass,
  headCell,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { fetchStaff } from "@/features/admin-staff/admin-staff-service";
import { cn } from "@/utils/cn";

import {
  fetchAudit,
  type AuditFilters,
  type AuditRow,
} from "./admin-audit-service";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_LABELS,
  auditActionLabel,
  auditEntityLabel,
  shortId,
} from "./audit-labels";

const PAGE_SIZE = 10;

function Select({
  label,
  value,
  onChange,
  className,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn(filterBoxClass, "relative", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full cursor-pointer appearance-none rounded-[9px] bg-transparent pr-9 pl-3.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
      />
    </label>
  );
}

const dateClass =
  "h-[clamp(2.25rem,5.6dvh,2.7rem)] w-full rounded-[9px] bg-panel px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

function Json({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
        {title}
      </p>
      <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-white p-2 text-xs break-words whitespace-pre-wrap text-foreground">
        {value === null || value === undefined
          ? "—"
          : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function AuditRowView({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  const hasDetails = row.before != null || row.after != null;
  return (
    <Fragment>
      <tr>
        <td className={cn(bodyCell, "text-xs text-foreground")}>
          {dateTimeFormat.format(new Date(row.at))}
        </td>
        <td className={cn(bodyCell, "text-foreground")}>
          <span className="block truncate" title={row.staffEmail ?? undefined}>
            {row.staffEmail ?? "System"}
          </span>
        </td>
        <td className={cn(bodyCell, "font-medium text-foreground")}>
          <span className="block truncate" title={row.action}>
            {auditActionLabel(row.action)}
          </span>
        </td>
        <td className={cn(bodyCell, "text-foreground")}>
          <span className="block truncate" title={row.entityId ?? undefined}>
            {auditEntityLabel(row.entityType)}
            {row.entityId ? ` · ${shortId(row.entityId)}` : ""}
          </span>
        </td>
        <td className={bodyCell}>
          {hasDetails ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
              className="text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {open ? "Hide" : "Details"}
            </button>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={5} className="border-b border-border bg-panel px-4 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Json title="Before" value={row.before} />
              <Json title="After" value={row.after} />
            </div>
            {row.requestId ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Request {row.requestId}
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

/** The audit log: every change staff made, newest first. Super admins only. */
export function AdminAuditView() {
  const { staff } = useAdminSession();
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [staffId, setStaffId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const settledFrom = useDebounced(from, 200);
  const settledTo = useDebounced(to, 200);

  const filters: AuditFilters = {
    entityType: entityType || undefined,
    action: action || undefined,
    staffId: staffId || undefined,
    from: settledFrom || undefined,
    to: settledTo || undefined,
  };
  const people = useQuery({
    queryKey: ["admin", "staff", "all"],
    queryFn: () => fetchStaff({}),
    enabled: staff.isSuperAdmin,
    staleTime: 60_000,
  });
  const audit = useQuery({
    queryKey: ["admin", "audit", filters, page],
    queryFn: () => fetchAudit(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: staff.isSuperAdmin,
    staleTime: 10_000,
  });
  const rows = audit.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((audit.data?.total ?? 0) / PAGE_SIZE),
  );

  const change = (apply: () => void) => {
    apply();
    setPage(1);
  };

  let message: string | undefined;
  if (audit.isError && rows.length === 0)
    message = "We couldn't load the log. Check your connection and try again.";
  else if (audit.isPending) message = "Loading the log…";
  else if (rows.length === 0)
    message = "Nothing in the log matches these filters.";

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <AdminPageHead
        title="Audit log"
        subtitle="Every change staff made, newest first. Entries cannot be edited or deleted."
      />
      {staff.isSuperAdmin ? (
        <>
          <div className={filterBarClass}>
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.1vw,0.85rem)] lg:grid-cols-12">
              <Select
                label="Area"
                value={entityType}
                onChange={(value) => change(() => setEntityType(value))}
                className="lg:col-span-2"
              >
                <option value="">All areas</option>
                {Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                label="What happened"
                value={action}
                onChange={(value) => change(() => setAction(value))}
                className="lg:col-span-3"
              >
                <option value="">Any change</option>
                {AUDIT_ACTIONS.map((value) => (
                  <option key={value} value={value}>
                    {auditActionLabel(value)}
                  </option>
                ))}
              </Select>
              <Select
                label="Who"
                value={staffId}
                onChange={(value) => change(() => setStaffId(value))}
                className="lg:col-span-3"
              >
                <option value="">Everyone</option>
                {(people.data ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {`${person.firstName} ${person.lastName}`.trim() ||
                      person.email}
                  </option>
                ))}
              </Select>
              <label className="lg:col-span-2">
                <span className="sr-only">From day</span>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) =>
                    change(() => setFrom(event.target.value))
                  }
                  className={dateClass}
                />
              </label>
              <label className="lg:col-span-2">
                <span className="sr-only">To day</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => change(() => setTo(event.target.value))}
                  className={dateClass}
                />
              </label>
            </div>
          </div>
          <div
            className={cn(
              tableCardClass,
              audit.isFetching && !audit.isPending && "opacity-80",
            )}
          >
            <div className="min-h-0 flex-[0_1_auto] overflow-auto">
              <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[24%]" />
                  <col className="w-[24%]" />
                  <col className="w-[24%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th scope="col" className={headCell}>
                      When
                    </th>
                    <th scope="col" className={headCell}>
                      Who
                    </th>
                    <th scope="col" className={headCell}>
                      What
                    </th>
                    <th scope="col" className={headCell}>
                      On
                    </th>
                    <th scope="col" className={headCell}>
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <AuditRowView key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
              {message ? <TableMessage>{message}</TableMessage> : null}
            </div>
            <OrdersPagination
              page={Math.min(page, totalPages)}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only a super admin can read the audit log.
        </p>
      )}
    </div>
  );
}
