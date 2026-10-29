"use client";

import { Countdown } from "@/components/shared/countdown";
import { useNow } from "@/hooks/use-now";

function endOfLocalDay(now: number) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return end.getTime();
}

/**
 * Temporary stand-in until the backend provides an offer end time: counts down
 * to the end of the visitor's day. Replace with `<Countdown endsAt={offer.endsAt} />`.
 */
export function MockOfferCountdown() {
  const now = useNow();
  return <Countdown endsAt={now === null ? null : endOfLocalDay(now)} />;
}
