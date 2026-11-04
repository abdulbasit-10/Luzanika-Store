"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useNow } from "@/hooks/use-now";
import {
  DetailCard,
  Field,
  FormError,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/features/admin-shell/admin-ui";

import { fetchOffer, saveOffer, type Offer } from "./admin-catalog-service";
import { useCatalogChange } from "./catalog-ui";
import {
  biggestDiscount,
  fromLocalInput,
  headlineProblem,
  offerState,
  toLocalInput,
  type OfferPrice,
} from "./offer-forms";

const MARKETS = [
  { code: "PK", name: "Pakistan" },
  { code: "DE", name: "Germany" },
] as const;

function OfferForm({
  offer,
  prices,
}: {
  offer: Offer;
  /** Prices of the products now in the offers row, per market. */
  prices: Record<"PK" | "DE", (OfferPrice | null)[]>;
}) {
  const now = useNow();
  const [headline, setHeadline] = useState(offer.headline ?? "");
  const [endsAt, setEndsAt] = useState(toLocalInput(offer.endsAt));
  const [shown, setShown] = useState(false);
  const problem = headlineProblem(headline);
  const parsed = fromLocalInput(endsAt);
  const brokenDate = endsAt !== "" && parsed === null;

  const save = useCatalogChange(
    (next: Offer) => saveOffer(next),
    "Offer timing saved",
  );
  const state = offerState(offer.endsAt, now ?? 0);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const stateText =
    now === null
      ? ""
      : state === "none"
        ? "No end time: the row shows without a countdown."
        : state === "running"
          ? `Counting down to ${new Date(offer.endsAt as string).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}. The row hides itself then.`
          : "The end time has passed, so the row is hidden in the shop. Set a new time to show it again.";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShown(true);
        if (problem || brokenDate) return;
        save.mutate({ endsAt: parsed, headline: headline.trim() || null });
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="offer-headline"
          label="Headline (optional)"
          hint="Shown instead of “Special Offers”."
          error={shown ? problem : undefined}
        >
          <input
            id="offer-headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            maxLength={80}
            placeholder="Special Offers"
            aria-invalid={shown && Boolean(problem)}
            aria-describedby="offer-headline-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="offer-ends"
          label="Ends at (optional)"
          hint={`Your time zone: ${zone}.`}
          error={
            shown && brokenDate ? "Enter a valid date and time" : undefined
          }
        >
          <input
            id="offer-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            aria-invalid={shown && brokenDate}
            aria-describedby="offer-ends-error"
            className={inputClass}
          />
        </Field>
      </div>

      {stateText ? (
        <p className="text-sm text-muted-foreground">{stateText}</p>
      ) : null}

      <div className="rounded-lg border border-border bg-white p-3 text-sm">
        <p className="font-medium text-foreground">
          What shoppers see in the title
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
          {MARKETS.map((market) => {
            const percent = biggestDiscount(prices[market.code]);
            return (
              <li key={market.code}>
                {market.name}: {headline.trim() || "Special Offers"}
                {percent !== null ? ` - up to ${percent}% off` : ""}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          The percentage is worked out from the real price and old price of the
          products below, so it is always true. To offer a discount, set a lower
          price and the old price on the product.
        </p>
      </div>

      <FormError error={save.error} />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className={primaryButton}
        >
          {save.isPending ? "Saving…" : "Save timing"}
        </button>
        {offer.endsAt ? (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => {
              setEndsAt("");
              save.mutate({ endsAt: null, headline: headline.trim() || null });
            }}
            className={secondaryButton}
          >
            Remove countdown
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** The end time and headline of the home page "Special offers" row. */
export function OfferCard({
  prices,
}: {
  prices: Record<"PK" | "DE", (OfferPrice | null)[]>;
}) {
  const offer = useQuery({
    queryKey: ["admin", "home", "offer"],
    queryFn: fetchOffer,
    staleTime: 10_000,
  });

  return (
    <DetailCard title="Special offers: timing and headline">
      {offer.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      ) : offer.isError ? (
        <p role="alert" className="text-sm text-danger">
          We couldn&apos;t load the offer settings. Reload the page.
        </p>
      ) : (
        <OfferForm
          // A saved change starts the form again from what the server kept.
          key={`${offer.data.endsAt}|${offer.data.headline}`}
          offer={offer.data}
          prices={prices}
        />
      )}
    </DetailCard>
  );
}
