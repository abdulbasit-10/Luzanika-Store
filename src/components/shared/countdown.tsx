"use client";

import { useNow } from "@/hooks/use-now";
import { cn } from "@/utils/cn";

interface CountdownProps {
  /** Offer end time as epoch ms. Null renders a placeholder (e.g. while loading). */
  endsAt: number | null;
  className?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}: ${pad(minutes)}: ${pad(seconds)}`;
}

export function Countdown({ endsAt, className }: CountdownProps) {
  const now = useNow();
  const ready = now !== null && endsAt !== null;
  const text = ready ? formatRemaining(endsAt - now) : "--: --: --";

  return (
    <p
      role="timer"
      aria-label={ready ? `Offer ends in ${text}` : "Offer timer"}
      className={cn(
        "font-sans text-xl font-medium text-timer tabular-nums lg:text-2xl",
        className,
      )}
    >
      {text}
    </p>
  );
}
