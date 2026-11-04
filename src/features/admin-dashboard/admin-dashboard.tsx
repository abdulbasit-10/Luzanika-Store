"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Dropdown } from "@/components/ui/dropdown";
import { visibleNavGroups } from "@/features/admin-shell/admin-nav";
import { useAdminMarket } from "@/features/admin-shell/admin-market";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import type { RegionCode } from "@/types/region";
import { cn } from "@/utils/cn";
import { REGIONS } from "@/config/regions";

import {
  DEFAULT_PERIOD_ID,
  PERIOD_PRESETS,
  currentRange,
  previousRange,
  rangeLabel,
} from "./dashboard-period";
import { fetchDashboard } from "./dashboard-service";
import {
  chartPoints,
  incomeShare,
  marketsOf,
  statCards,
  type Grouping,
} from "./dashboard-stats";
import { RecentOrders } from "./recent-orders";
import { RevenueAnalytics } from "./revenue-analytics";
import { StatCards } from "./stat-cards";
import { TotalIncome } from "./total-income";

/** Pakistan / Germany switch for the chart and the income card while "All markets" is chosen. */
function MarketToggle({
  codes,
  value,
  onChange,
}: {
  codes: RegionCode[];
  value: RegionCode;
  onChange: (code: RegionCode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Market shown in the chart and income"
      className="flex overflow-hidden rounded-xl border border-muted-foreground text-sm font-semibold"
    >
      {codes.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={code === value}
          onClick={() => onChange(code)}
          className={cn(
            "px-3 py-[clamp(0.125rem,0.6dvh,0.375rem)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            code === value
              ? "bg-foreground text-white"
              : "text-foreground hover:bg-black/5",
          )}
        >
          {REGIONS[code].name}
        </button>
      ))}
    </div>
  );
}

/**
 * The first screen after signing in, laid out like the Figma "Dashboard
 * Overview", on the numbers of GET /admin/dashboard. Pakistan is in PKR and
 * Germany in EUR; the two are never added together.
 */
export function AdminDashboard() {
  const { staff, permissions } = useAdminSession();
  const { marketParam } = useAdminMarket();
  const allowed = staff.isSuperAdmin || permissions.includes("dashboard.view");
  const gap = "gap-[clamp(0.5rem,1.6dvh,1.5rem)]";

  // Someone whose role has no dashboard lands on the first screen they can use instead.
  const router = useRouter();
  const firstAllowedHref = visibleNavGroups({
    isSuperAdmin: staff.isSuperAdmin,
    permissions,
  })
    .flat()
    .find((item) => item.href !== "/admin")?.href;
  useEffect(() => {
    if (!allowed && firstAllowedHref) router.replace(firstAllowedHref);
  }, [allowed, firstAllowedHref, router]);

  const [periodId, setPeriodId] = useState(DEFAULT_PERIOD_ID);
  const [grouping, setGrouping] = useState<Grouping | null>(null);
  const [focus, setFocus] = useState<RegionCode>("PK");

  const preset =
    PERIOD_PRESETS.find((item) => item.id === periodId) ?? PERIOD_PRESETS[1];
  const range = currentRange(preset.days);
  const before = previousRange(range);

  const now = useQuery({
    queryKey: ["admin", "dashboard", marketParam, range],
    queryFn: () => fetchDashboard({ market: marketParam, ...range }),
    placeholderData: keepPreviousData,
    enabled: allowed,
    staleTime: 30_000,
  });
  const prior = useQuery({
    queryKey: ["admin", "dashboard", marketParam, before],
    queryFn: () => fetchDashboard({ market: marketParam, ...before }),
    placeholderData: keepPreviousData,
    enabled: allowed,
    staleTime: 30_000,
  });

  const data = now.data;
  const markets = marketsOf(data);
  const codes = markets.map(([code]) => code);
  const shownCode = codes.includes(focus) ? focus : codes[0];
  const shown = markets.find(([code]) => code === shownCode)?.[1];
  const groupBy: Grouping = grouping ?? (preset.days > 31 ? "week" : "day");

  return (
    <div
      className={`mx-auto flex min-h-full w-full max-w-[75rem] flex-col ${gap}`}
    >
      <AdminPageHead
        title="Dashboard"
        subtitle="Overview of your store performance."
      />
      {!allowed ? (
        <p className="text-sm text-muted-foreground">
          Your role does not include the dashboard numbers.
        </p>
      ) : now.isError && !data ? (
        <p role="alert" className="text-sm text-danger">
          We couldn&apos;t load the dashboard. Check your connection and reload
          the page.
        </p>
      ) : (
        <>
          <div className={`flex flex-col ${gap}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[clamp(1rem,2.8dvh,1.375rem)] font-bold tracking-[-0.5px] text-[#151d2b]">
                Sales Overview
              </h2>
              <Dropdown
                align="end"
                triggerLabel="Choose the period"
                triggerClassName="gap-2 rounded-xl border border-accent bg-white px-3 py-[clamp(0.2rem,0.8dvh,0.5rem)] font-button text-sm font-semibold text-muted-foreground"
                trigger={
                  <>
                    <CalendarDays aria-hidden className="size-4" />
                    {rangeLabel(range)}
                    <ChevronDown aria-hidden className="size-4" />
                  </>
                }
              >
                {PERIOD_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === periodId}
                    onClick={() => {
                      setPeriodId(item.id);
                      setGrouping(null);
                    }}
                    className={cn(
                      "block w-full px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-muted",
                      item.id === periodId && "font-semibold",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </Dropdown>
            </div>
            <StatCards cards={data ? statCards(data, prior.data) : null} />
          </div>
          <div
            className={`grid min-h-[11rem] flex-[1.2_1_0] lg:grid-cols-[minmax(0,1fr)_16rem] ${gap}`}
          >
            <RevenueAnalytics
              points={
                shown && data ? chartPoints(shown, data.period, groupBy) : null
              }
              currency={shown?.currency ?? "PKR"}
              grouping={groupBy}
              onGroupingChange={setGrouping}
              loading={now.isPending}
              marketToggle={
                codes.length > 1 ? (
                  <MarketToggle
                    codes={codes}
                    value={shownCode}
                    onChange={setFocus}
                  />
                ) : undefined
              }
            />
            <TotalIncome share={shown ? incomeShare(shown) : null} />
          </div>
          <div className="flex min-h-[9rem] flex-[1_1_0] flex-col">
            <RecentOrders orders={data?.recentOrders ?? null} />
          </div>
        </>
      )}
    </div>
  );
}
