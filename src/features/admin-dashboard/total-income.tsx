import { Info } from "lucide-react";

import { formatMinor } from "@/features/admin-shell/admin-money";

import type { IncomeShare } from "./dashboard-stats";

const SIZE = 172;
const CENTER = SIZE / 2;
const RING_RADIUS = 84;
/** Where the arc begins: the lower left (135° on the circle, y pointing down). */
const START_ANGLE = 135;

const point = (angle: number) => ({
  x: CENTER + RING_RADIUS * Math.cos((angle * Math.PI) / 180),
  y: CENTER + RING_RADIUS * Math.sin((angle * Math.PI) / 180),
});

/** The dark arc runs from the lower left along the bottom, anticlockwise. */
function arcPath(percent: number): string {
  const start = point(START_ANGLE);
  const end = point(START_ANGLE - (Math.min(percent, 99.9) / 100) * 360);
  const large = percent > 50 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RING_RADIUS} ${RING_RADIUS} 0 ${large} 0 ${end.x} ${end.y}`;
}

/**
 * The round "Total Income" gauge: how much of what customers paid is kept
 * after refunds, with both amounts in the market's own currency under it.
 */
export function TotalIncome({ share }: { share: IncomeShare | null }) {
  const percent = share?.percent ?? 0;
  const start = point(START_ANGLE);

  return (
    <section
      aria-labelledby="income-heading"
      className="flex min-h-0 flex-col gap-[clamp(0.25rem,1.2dvh,0.75rem)] rounded-2xl bg-panel p-[clamp(0.625rem,1.6dvh,1.25rem)] shadow-[0_4px_16px_rgba(51,38,174,0.04)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h2
          id="income-heading"
          className="text-[clamp(1rem,2.6dvh,1.25rem)] font-medium text-[#1c2a53]"
        >
          Total Income
        </h2>
        <Info
          aria-label="The share of the money customers paid that is kept after refunds"
          role="img"
          className="size-5 text-muted-foreground"
          strokeWidth={1.5}
        />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${percent} percent kept`}
          className="aspect-square h-full max-h-[10.75rem] min-h-[5rem] overflow-visible"
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS}
            fill="white"
            fillOpacity={0.55}
            stroke="white"
            strokeWidth={2}
          />
          {percent > 0 ? (
            <>
              <path
                d={arcPath(percent)}
                fill="none"
                stroke="var(--foreground)"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle
                cx={start.x}
                cy={start.y}
                r={6}
                fill="var(--foreground)"
              />
            </>
          ) : null}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={60}
            fill="white"
            style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.08))" }}
          />
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground text-2xl font-semibold"
          >
            {share ? `${percent}%` : "…"}
          </text>
        </svg>
      </div>
      <dl className="flex flex-col gap-1 text-sm font-medium">
        <div className="flex items-center justify-between gap-2 text-foreground">
          <dt>Paid</dt>
          <dd>{share ? formatMinor(share.paid, share.currency) : "…"}</dd>
        </div>
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <dt>Refunded</dt>
          <dd>{share ? formatMinor(share.refunded, share.currency) : "…"}</dd>
        </div>
      </dl>
    </section>
  );
}
