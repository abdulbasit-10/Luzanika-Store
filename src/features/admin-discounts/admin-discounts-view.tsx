"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RegionFlag } from "@/components/shared/region-flag";
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
  primaryButton,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import { fetchDiscounts, type DiscountStatus } from "./admin-discounts-service";
import { describeDates } from "./discount-forms";
import { DiscountStatusChip, MARKET_NAME } from "./discounts-ui";

const PAGE_SIZE = 10;

/** Discounts: a percentage off chosen products, in chosen markets, optionally between two dates. */
export function AdminDiscountsView() {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DiscountStatus | "">("");
  const [page, setPage] = useState(1);
  const settled = useDebounced(search);

  const filters = { status: status || undefined, search: settled || undefined };
  const discounts = useQuery({
    queryKey: ["admin", "discounts", filters, page],
    queryFn: () => fetchDiscounts(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: can("discounts.view"),
    staleTime: 10_000,
  });
  const rows = discounts.data?.items ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((discounts.data?.total ?? 0) / PAGE_SIZE),
  );

  let message: string | undefined;
  if (discounts.isError && rows.length === 0)
    message =
      "We couldn't load the discounts. Check your connection and try again.";
  else if (discounts.isPending) message = "Loading discounts…";
  else if (rows.length === 0)
    message =
      !status && !settled
        ? "No discounts yet. Add one to put products on sale."
        : "No discounts match these filters.";

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <div className="flex items-end justify-between gap-4">
        <AdminPageHead
          title="Discounts"
          subtitle="Put products on sale. The shop and the cart use the discounted price."
        />
        {can("discounts.manage") ? (
          <Link href="/admin/discounts/new" className={primaryButton}>
            <Plus aria-hidden className="size-4" />
            Add Discount
          </Link>
        ) : null}
      </div>

      {can("discounts.view") ? (
        <>
          <div className={filterBarClass}>
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.1vw,0.85rem)] lg:grid-cols-12">
              <SearchBox
                label="Search by discount name"
                placeholder="Search by discount name"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                className="col-span-2 lg:col-span-9"
              />
              <label
                className={cn(
                  filterBoxClass,
                  "relative col-span-2 lg:col-span-3",
                )}
              >
                <span className="sr-only">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as DiscountStatus | "");
                    setPage(1);
                  }}
                  className="h-full w-full cursor-pointer appearance-none rounded-[9px] bg-transparent pr-9 pl-3.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <option value="">All discounts</option>
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="ended">Ended</option>
                  <option value="off">Off</option>
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
              discounts.isFetching && !discounts.isPending && "opacity-80",
            )}
          >
            <div className="min-h-0 flex-[0_1_auto] overflow-auto">
              <table className="w-full min-w-[46rem] table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[11%]" />
                  <col className="w-[17%]" />
                  <col className="w-[11%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th scope="col" className={headCell}>
                      Name
                    </th>
                    <th scope="col" className={headCell}>
                      Discount
                    </th>
                    <th scope="col" className={headCell}>
                      Markets
                    </th>
                    <th scope="col" className={headCell}>
                      Products
                    </th>
                    <th scope="col" className={headCell}>
                      Dates
                    </th>
                    <th scope="col" className={headCell}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/admin/discounts/${row.id}`)}
                      className="cursor-pointer hover:[&>td]:bg-muted/60"
                    >
                      <td className={cn(bodyCell, "font-medium")}>
                        <Link
                          href={`/admin/discounts/${row.id}`}
                          className="block truncate text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className={cn(bodyCell, "font-medium")}>
                        {row.percent}%
                      </td>
                      <td className={bodyCell}>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {row.markets.map((market) => (
                            <span
                              key={market}
                              className="inline-flex items-center gap-1.5"
                            >
                              <RegionFlag region={market} />
                              {MARKET_NAME[market]}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className={bodyCell}>{row.productCount}</td>
                      <td className={cn(bodyCell, "text-muted-foreground")}>
                        {describeDates(row.startsAt, row.endsAt)}
                      </td>
                      <td className={bodyCell}>
                        <DiscountStatusChip status={row.status} />
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
          Your role does not include discounts.
        </p>
      )}
    </div>
  );
}
