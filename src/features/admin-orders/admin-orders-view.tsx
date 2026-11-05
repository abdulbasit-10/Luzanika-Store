"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { toast } from "@/components/ui/toaster";
import { useAdminMarket } from "@/features/admin-shell/admin-market";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import { cn } from "@/utils/cn";

import {
  fetchAdminOrders,
  fetchAllAdminOrders,
  type AdminOrderFilters,
} from "./admin-orders-service";
import { OrdersFilters, type OrderFilterValues } from "./orders-filters";
import { ordersToCsv } from "./orders-csv";
import { OrdersPagination, OrdersTable } from "./orders-table";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;

/** Gives back `value` only after it has stopped changing for a moment. */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function downloadCsv(text: string) {
  const url = URL.createObjectURL(
    new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** The Orders screen: filters, the table and the page buttons, filling the visible height. */
export function AdminOrdersView() {
  const { staff, permissions } = useAdminSession();
  const { market, setMarket } = useAdminMarket();
  const allowed = staff.isSuperAdmin || permissions.includes("orders.view");

  const [filters, setFilters] = useState({
    search: "",
    status: "" as OrderFilterValues["status"],
    paymentStatus: "" as OrderFilterValues["paymentStatus"],
    from: "",
    to: "",
  });
  // The page belongs to the market it was chosen under, so a change of market (also from the header) starts at page 1.
  const [pageState, setPageState] = useState({ market, page: 1 });
  const page = pageState.market === market ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ market, page: next });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const search = useDebounced(filters.search, SEARCH_DELAY_MS);

  const apiFilters: AdminOrderFilters = {
    market: market === "all" ? undefined : market,
    status: filters.status || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    search: search || undefined,
  };

  const orders = useQuery({
    queryKey: ["admin", "orders", apiFilters, page],
    queryFn: () => fetchAdminOrders(apiFilters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: allowed,
    staleTime: 15_000,
  });

  const rows = orders.data?.items ?? [];
  const total = orders.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function change(patch: Partial<OrderFilterValues>) {
    const { market: nextMarket, ...own } = patch;
    if (nextMarket !== undefined) setMarket(nextMarket);
    if (Object.keys(own).length > 0) setFilters((c) => ({ ...c, ...own }));
    setPage(1);
    setSelected(new Set());
  }

  function toggle(number: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(number)) next.add(number);
      return next;
    });
  }

  function toggleAll() {
    const everyone =
      rows.length > 0 && rows.every((o) => selected.has(o.number));
    setSelected(everyone ? new Set() : new Set(rows.map((o) => o.number)));
  }

  /** The ticked orders of this page, or else every order the filters match. */
  async function exportOrders() {
    setExporting(true);
    try {
      const chosen =
        selected.size > 0
          ? rows.filter((order) => selected.has(order.number))
          : await fetchAllAdminOrders(apiFilters);
      downloadCsv(ordersToCsv(chosen));
    } catch {
      toast.error("We couldn't export the orders. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  let message: string | undefined;
  if (orders.isError && rows.length === 0) {
    message =
      "We couldn't load the orders. Check your connection and try again.";
  } else if (orders.isPending) {
    message = "Loading orders…";
  } else if (rows.length === 0) {
    message = "No orders match these filters.";
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <div className="flex items-end justify-between gap-4">
        <AdminPageHead
          title="Orders"
          subtitle="Manage and track customer orders across your markets."
        />
        {allowed ? (
          <button
            type="button"
            onClick={exportOrders}
            disabled={exporting}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-foreground px-4 py-[clamp(0.4rem,1.2dvh,0.625rem)] text-sm font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <Download aria-hidden className="size-4" />
            {exporting
              ? "Exporting…"
              : selected.size > 0
                ? `Export ${selected.size} selected`
                : "Export Orders"}
          </button>
        ) : null}
      </div>

      {allowed ? (
        <>
          <OrdersFilters values={{ ...filters, market }} onChange={change} />
          <div
            className={cn(
              "flex min-h-[12rem] flex-[0_1_auto] flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_8px_-5px_rgba(0,0,0,0.15),0_0_0_1px_#e5e5e5]",
              orders.isFetching && !orders.isPending && "opacity-80",
            )}
          >
            <OrdersTable
              orders={rows}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              message={message}
            />
            <OrdersPagination
              page={Math.min(page, totalPages)}
              totalPages={totalPages}
              onPageChange={(next) => {
                setPage(next);
                setSelected(new Set());
              }}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role does not include orders.
        </p>
      )}
    </div>
  );
}
