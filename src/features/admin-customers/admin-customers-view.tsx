"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { OrdersPagination } from "@/features/admin-orders/orders-table";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import {
  SearchBox,
  TableMessage,
  bodyCell,
  filterBarClass,
  filterBoxClass,
  headCell,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import { fetchCustomers, type CustomerStatus } from "./admin-customers-service";
import { CustomerStatusChip, customerName, formatDay } from "./customers-ui";

const PAGE_SIZE = 10;

/** The Customers screen: who has an account, how much they ordered, and who is blocked. */
export function AdminCustomersView() {
  const { staff, permissions } = useAdminSession();
  const allowed = staff.isSuperAdmin || permissions.includes("customers.view");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [page, setPage] = useState(1);
  const settled = useDebounced(search);

  const filters = { search: settled || undefined, status: status || undefined };
  const customers = useQuery({
    queryKey: ["admin", "customers", filters, page],
    queryFn: () => fetchCustomers(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: allowed,
    staleTime: 15_000,
  });
  const rows = customers.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((customers.data?.total ?? 0) / PAGE_SIZE),
  );

  let message: string | undefined;
  if (customers.isError && rows.length === 0)
    message =
      "We couldn't load the customers. Check your connection and try again.";
  else if (customers.isPending) message = "Loading customers…";
  else if (rows.length === 0) message = "No customers match these filters.";

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <AdminPageHead
        title="Customers"
        subtitle="People with an account, their orders and who is blocked."
      />
      {allowed ? (
        <>
          <div className={filterBarClass}>
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.1vw,0.85rem)] lg:grid-cols-12">
              <SearchBox
                label="Search by name, email or phone"
                placeholder="Search by name, email or phone"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                className="col-span-2 lg:col-span-8"
              />
              <label
                className={cn(
                  filterBoxClass,
                  "relative col-span-2 lg:col-span-4",
                )}
              >
                <span className="sr-only">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as CustomerStatus | "");
                    setPage(1);
                  }}
                  className="h-full w-full cursor-pointer appearance-none rounded-[9px] bg-transparent pr-9 pl-3.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="anonymised">Account deleted</option>
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
                />
              </label>
            </div>
          </div>
          <div
            className={cn(
              tableCardClass,
              customers.isFetching && !customers.isPending && "opacity-80",
            )}
          >
            <div className="min-h-0 flex-[0_1_auto] overflow-auto">
              <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th scope="col" className={headCell}>
                      Customer
                    </th>
                    <th scope="col" className={headCell}>
                      Phone
                    </th>
                    <th scope="col" className={headCell}>
                      Orders
                    </th>
                    <th scope="col" className={headCell}>
                      Last order
                    </th>
                    <th scope="col" className={headCell}>
                      Joined
                    </th>
                    <th scope="col" className={headCell}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((customer) => (
                    <tr key={customer.id}>
                      <td className={bodyCell}>
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="block min-w-0 font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <span className="block truncate">
                            {customerName(customer)}
                          </span>
                          <span className="block truncate text-xs font-normal text-muted-foreground">
                            {customer.email}
                          </span>
                        </Link>
                      </td>
                      <td className={cn(bodyCell, "text-foreground")}>
                        <span className="block truncate">
                          {customer.phone ?? "—"}
                        </span>
                      </td>
                      <td className={cn(bodyCell, "text-foreground")}>
                        {customer.orderCount}
                      </td>
                      <td className={cn(bodyCell, "text-foreground")}>
                        {formatDay(customer.lastOrderAt)}
                      </td>
                      <td className={cn(bodyCell, "text-foreground")}>
                        {formatDay(customer.createdAt)}
                      </td>
                      <td className={bodyCell}>
                        <CustomerStatusChip status={customer.status} />
                      </td>
                    </tr>
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
          Your role does not include customers.
        </p>
      )}
    </div>
  );
}
