"use client";

import { CalendarDays, ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";

import { Dropdown } from "@/components/ui/dropdown";
import { REGION_LIST } from "@/config/regions";
import type { AdminMarket } from "@/features/admin-shell/admin-market";
import { cn } from "@/utils/cn";

import type {
  AdminOrderFilterStatus,
  AdminPaymentStatus,
} from "./admin-orders-service";
import { ORDER_FILTER_OPTIONS, PAYMENT_STATUS_OPTIONS } from "./orders-labels";

/** The cream box every filter sits in. */
const boxClass =
  "flex h-[clamp(2.25rem,5.6dvh,2.7rem)] items-center rounded-[9px] bg-panel text-sm";

function FilterSelect({
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
    <label className={cn(boxClass, "relative", className)}>
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

export interface OrderFilterValues {
  search: string;
  market: AdminMarket;
  status: AdminOrderFilterStatus | "";
  paymentStatus: AdminPaymentStatus | "";
  from: string;
  to: string;
}

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function dateRangeLabel(from: string, to: string): string {
  if (!from && !to) return "Date Range";
  return `${from ? shortDay(from) : "…"} – ${to ? shortDay(to) : "…"}`;
}

const dateInputClass =
  "h-9 w-full rounded-md border border-border bg-white px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

/** The white bordered box under the page title: search, market, status, payment and dates. */
export function OrdersFilters({
  values,
  onChange,
}: {
  values: OrderFilterValues;
  onChange: (patch: Partial<OrderFilterValues>) => void;
}) {
  const hasRange = Boolean(values.from || values.to);

  return (
    <div className="rounded-[11px] border border-muted-foreground bg-white p-[clamp(0.5rem,1.6dvh,1.2rem)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.1vw,0.85rem)] lg:grid-cols-12">
        <label
          className={cn(
            boxClass,
            "relative col-span-2 lg:col-span-3 2xl:col-span-4",
          )}
        >
          <span className="sr-only">Search by order ID or customer</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={values.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search by Order ID or Customer"
            className="h-full w-full rounded-[9px] bg-transparent pr-4 pl-12 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
        </label>
        <FilterSelect
          label="Market"
          value={values.market}
          onChange={(value) => onChange({ market: value as AdminMarket })}
          className="lg:col-span-2"
        >
          <option value="all">All Markets</option>
          {REGION_LIST.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Order status"
          value={values.status}
          onChange={(value) =>
            onChange({ status: value as OrderFilterValues["status"] })
          }
          className="lg:col-span-2"
        >
          <option value="">All Statuses</option>
          {ORDER_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Payment status"
          value={values.paymentStatus}
          onChange={(value) =>
            onChange({
              paymentStatus: value as OrderFilterValues["paymentStatus"],
            })
          }
          className="lg:col-span-2"
        >
          <option value="">All Payments</option>
          {PAYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
        <div className="col-span-2 lg:col-span-3 2xl:col-span-2">
          <Dropdown
            align="end"
            triggerLabel="Date range"
            triggerClassName={cn(
              boxClass,
              "w-full justify-between px-3.5",
              hasRange ? "text-foreground" : "text-muted-foreground",
            )}
            panelClassName="w-64 p-3"
            trigger={
              <>
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarDays aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">
                    {dateRangeLabel(values.from, values.to)}
                  </span>
                </span>
                <ChevronDown aria-hidden className="size-4 shrink-0" />
              </>
            }
          >
            {/* A click inside must not close the panel: the Dropdown closes on any click. */}
            <div
              onClick={(event) => event.stopPropagation()}
              className="flex flex-col gap-2.5"
            >
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                From
                <input
                  type="date"
                  value={values.from}
                  max={values.to || undefined}
                  onChange={(event) => onChange({ from: event.target.value })}
                  className={dateInputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                To
                <input
                  type="date"
                  value={values.to}
                  min={values.from || undefined}
                  onChange={(event) => onChange({ to: event.target.value })}
                  className={dateInputClass}
                />
              </label>
              {hasRange ? (
                <button
                  type="button"
                  onClick={() => onChange({ from: "", to: "" })}
                  className="self-start text-sm font-medium text-accent underline-offset-2 hover:underline"
                >
                  Reset dates
                </button>
              ) : null}
            </div>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
