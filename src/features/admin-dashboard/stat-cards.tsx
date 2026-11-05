import {
  DollarSign,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Undo2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/utils/cn";

import type { StatCardData, Tone } from "./dashboard-stats";

/** Soft background, solid fill and text colour of each accent in the Figma. */
const TONES: Record<Tone, { soft: string; solid: string; text: string }> = {
  orange: {
    soft: "bg-[#ff9f24]/10",
    solid: "bg-[#ff9f24]",
    text: "text-[#ff9f24]",
  },
  blue: {
    soft: "bg-[#5978ec]/10",
    solid: "bg-[#5978ec]",
    text: "text-[#5978ec]",
  },
  red: { soft: "bg-danger/10", solid: "bg-danger", text: "text-danger" },
  green: {
    soft: "bg-[#279f51]/10",
    solid: "bg-[#279f51]",
    text: "text-[#279f51]",
  },
};

const ICONS: Record<StatCardData["id"], LucideIcon> = {
  sales: ShoppingCart,
  customers: UserPlus,
  refunds: Undo2,
  revenue: DollarSign,
};

const PLACEHOLDERS: Pick<StatCardData, "id" | "label" | "tone">[] = [
  { id: "sales", label: "Total Sales", tone: "orange" },
  { id: "customers", label: "New Customer", tone: "blue" },
  { id: "refunds", label: "Refunds", tone: "red" },
  { id: "revenue", label: "Total Revenue", tone: "green" },
];

function StatCard({ card }: { card: StatCardData }) {
  const tone = TONES[card.tone];
  const Icon = ICONS[card.id];
  const Trend = card.change?.up ? TrendingUp : TrendingDown;
  const stacked = card.lines.length > 1;

  return (
    <article className="flex min-w-0 flex-col justify-between gap-[clamp(0.375rem,1.2dvh,0.75rem)] rounded-lg bg-panel p-[clamp(0.625rem,1.6dvh,1rem)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-[clamp(0rem,0.4dvh,0.375rem)]">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p
            className={cn(
              "font-medium text-foreground",
              stacked
                ? "text-[clamp(0.875rem,2.2dvh,1.125rem)] leading-snug"
                : "text-[clamp(1.125rem,3dvh,1.5rem)] leading-tight",
            )}
          >
            {card.lines.map((line) => (
              <span key={line} className="block truncate">
                {line}
              </span>
            ))}
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg p-[clamp(0.375rem,1dvh,0.625rem)]",
            tone.soft,
            tone.text,
          )}
        >
          <Icon aria-hidden className="size-5" strokeWidth={1.75} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label={`${card.label}, this period against the last`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(card.progress * 100)}
          className={cn("h-[7px] overflow-hidden rounded-full", tone.soft)}
        >
          <div
            className={cn("h-full rounded-full", tone.solid)}
            style={{ width: `${card.progress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[0.625rem] leading-none">
          <p className="truncate font-medium text-foreground">{card.footer}</p>
          {card.change ? (
            <p
              className={cn(
                "flex shrink-0 items-center gap-0.5 font-medium",
                tone.text,
              )}
            >
              <Trend aria-hidden className="size-3.5" />
              {card.change.text}
              <span className="sr-only">
                {card.change.up ? " more" : " less"} than the period before
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PlaceholderCard({
  label,
  tone,
}: Pick<StatCardData, "label" | "tone">) {
  return (
    <article
      aria-busy
      className="flex flex-col justify-between gap-3 rounded-lg bg-panel p-[clamp(0.625rem,1.6dvh,1rem)]"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-[clamp(1.125rem,3dvh,1.5rem)] leading-tight font-medium text-muted-foreground">
        …
      </p>
      <div className={cn("h-[7px] rounded-full", TONES[tone].soft)} />
    </article>
  );
}

/** The four numbers at the top of the dashboard. Pass null while they load. */
export function StatCards({ cards }: { cards: StatCardData[] | null }) {
  return (
    <div className="grid grid-cols-2 gap-[clamp(0.625rem,1.8vw,1.75rem)] xl:grid-cols-4">
      {cards
        ? cards.map((card) => <StatCard key={card.id} card={card} />)
        : PLACEHOLDERS.map((item) => (
            <PlaceholderCard key={item.id} {...item} />
          ))}
    </div>
  );
}
