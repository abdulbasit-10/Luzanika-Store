"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Dropdown } from "@/components/ui/dropdown";
import { formatMinor } from "@/features/admin-shell/admin-money";
import type { CurrencyCode } from "@/types/region";
import { cn } from "@/utils/cn";

import { niceAxis, type ChartPoint, type Grouping } from "./dashboard-stats";

const GRID_LINES = 4;

const GROUPINGS: { id: Grouping; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
];

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Bars of revenue over the period. Hover or focus a bar to read it. It stretches to the height its row gives it. */
export function RevenueAnalytics({
  points,
  currency,
  grouping,
  onGroupingChange,
  marketToggle,
  loading,
}: {
  /** Null while loading. */
  points: ChartPoint[] | null;
  currency: CurrencyCode;
  grouping: Grouping;
  onGroupingChange: (grouping: Grouping) => void;
  /** Pakistan / Germany switch, when both markets are shown. */
  marketToggle?: ReactNode;
  loading?: boolean;
}) {
  const shown = useMemo(() => points ?? [], [points]);
  const { axisMax, average, peakIndex } = useMemo(() => {
    const incomes = shown.map((point) => point.income);
    const top = Math.max(0, ...incomes);
    return {
      axisMax: niceAxis(top).max * 100,
      average: incomes.length
        ? incomes.reduce((sum, value) => sum + value, 0) / incomes.length
        : 0,
      peakIndex: incomes.indexOf(top),
    };
  }, [shown]);

  const [hovered, setHovered] = useState<number | null>(null);
  const active = shown.length
    ? Math.min(hovered ?? Math.max(peakIndex, 0), shown.length - 1)
    : 0;
  const activePoint = shown[active];
  const labels = Array.from({ length: GRID_LINES }, (_, i) => {
    const value = ((axisMax / (GRID_LINES - 1)) * (GRID_LINES - 1 - i)) / 100;
    return value === 0 ? "0" : compact.format(value);
  });
  const flip = active > shown.length - 3;
  const current = GROUPINGS.find((item) => item.id === grouping);

  return (
    <section
      aria-labelledby="revenue-heading"
      className="flex min-h-0 flex-col gap-[clamp(0.375rem,1.4dvh,1rem)] rounded-lg bg-panel p-[clamp(0.625rem,1.6dvh,1.25rem)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2
          id="revenue-heading"
          className="text-[clamp(1rem,2.6dvh,1.25rem)] font-bold text-foreground"
        >
          Revenue analytics{" "}
          <span className="text-sm font-medium text-muted-foreground">
            ({currency})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {marketToggle}
          <Dropdown
            align="end"
            triggerLabel="Group the bars"
            triggerClassName="gap-2 rounded-xl border border-muted-foreground px-3 py-[clamp(0.125rem,0.6dvh,0.375rem)] text-sm font-semibold text-foreground hover:bg-black/5"
            trigger={
              <>
                {current?.label}
                <ChevronDown aria-hidden className="size-4" />
              </>
            }
          >
            {GROUPINGS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === grouping}
                onClick={() => {
                  onGroupingChange(item.id);
                  setHovered(null);
                }}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm hover:bg-muted",
                  item.id === grouping && "font-semibold",
                )}
              >
                {item.label}
              </button>
            ))}
          </Dropdown>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* The bottom padding is the height of the date labels under the plot. */}
        <div
          aria-hidden
          className="flex flex-col justify-between pb-[1.5rem] text-right text-xs text-muted-foreground"
        >
          {labels.map((label, i) => (
            <span key={`${label}-${i}`} className="-my-2 leading-4">
              {label}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-[4rem] flex-1">
            {labels.map((label, i) => (
              <div
                key={`${label}-${i}`}
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-muted-foreground/30"
                style={{ top: `${(i / (GRID_LINES - 1)) * 100}%` }}
              />
            ))}
            {loading || !activePoint ? (
              <p
                role="status"
                className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
              >
                {loading ? "Loading…" : "No data for this period."}
              </p>
            ) : (
              <>
                <div className="relative flex h-full items-end gap-[1.2%] px-[1.5%]">
                  {shown.map((point, i) => (
                    <button
                      key={point.label}
                      type="button"
                      aria-label={`${point.label}: ${formatMinor(point.income, currency)}`}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered(null)}
                      className={cn(
                        "min-w-0 flex-1 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        i === active ? "bg-foreground" : "bg-background",
                      )}
                      style={{
                        height: `${(point.income / axisMax) * 100}%`,
                        minHeight: point.income > 0 ? 2 : 0,
                      }}
                    />
                  ))}
                </div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 flex items-center"
                  style={{ bottom: `${(average / axisMax) * 100}%` }}
                >
                  <span className="-translate-y-1/2 rounded-l bg-foreground px-1 text-xs text-white">
                    Avg
                  </span>
                  <div className="h-0 flex-1 -translate-y-1/2 border-t border-dotted border-foreground/70" />
                </div>
                <div
                  role="status"
                  className={cn(
                    "pointer-events-none absolute top-0 w-max max-w-[11rem] rounded-md border border-white bg-white p-1.5 text-xs shadow-[0_3.5px_4.8px_rgba(13,13,18,0.12)]",
                    flip && "-translate-x-full",
                  )}
                  style={{
                    left: `calc(${((flip ? active : active + 1) / shown.length) * 100}% ${flip ? "-" : "+"} 0.25rem)`,
                  }}
                >
                  <p className="text-muted-foreground">{activePoint.label}</p>
                  <p className="flex justify-between gap-3 font-medium text-foreground">
                    <span>Revenue</span>
                    <span>{formatMinor(activePoint.income, currency)}</span>
                  </p>
                </div>
              </>
            )}
          </div>
          <div
            aria-hidden
            className="mt-1.5 flex h-4 justify-between px-[1.5%] text-xs leading-4 text-muted-foreground"
          >
            <span>{shown[0]?.label.split(" – ")[0]}</span>
            <span>{shown[shown.length - 1]?.label.split(" – ").pop()}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
