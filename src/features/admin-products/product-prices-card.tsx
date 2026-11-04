"use client";

import { useState } from "react";

import { RegionFlag } from "@/components/shared/region-flag";
import { REGION_LIST } from "@/config/regions";
import {
  DetailCard,
  Field,
  FormError,
  inputClass,
  primaryButton,
} from "@/features/admin-shell/admin-ui";
import type { RegionCode } from "@/types/region";

import { setPrices, type Product } from "./admin-products-service";
import { priceToText, readPrice, type PriceText } from "./product-forms";
import { useProductMutation } from "./product-mutation";
import { CURRENCY_OF } from "./products-ui";

/** The price in each market. A market with both boxes empty is not sold there. */
export function ProductPricesCard({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const [text, setText] = useState<Record<RegionCode, PriceText>>({
    PK: priceToText(product.prices.PK),
    DE: priceToText(product.prices.DE),
  });
  const [shown, setShown] = useState(false);

  const read = {
    PK: readPrice(text.PK),
    DE: readPrice(text.DE),
  };
  const hasProblems = REGION_LIST.some(
    (region) => Object.keys(read[region.code].problems).length > 0,
  );

  const save = useProductMutation(
    product.id,
    () =>
      setPrices(product.id, {
        PK: read.PK.price,
        DE: read.DE.price,
      }),
    "Prices saved",
  );

  function update(code: RegionCode, patch: Partial<PriceText>) {
    setText((current) => ({
      ...current,
      [code]: { ...current[code], ...patch },
    }));
  }

  return (
    <DetailCard title="Prices">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setShown(true);
          if (!hasProblems) save.mutate(undefined);
        }}
        className="flex flex-col gap-3"
      >
        {REGION_LIST.map((region) => {
          const code = region.code;
          const problems = read[code].problems;
          return (
            <div key={code} className="grid gap-3 sm:grid-cols-2">
              <Field
                id={`price-${code}`}
                label={`Price in ${region.name} (${CURRENCY_OF[code]})`}
                error={shown ? problems.amount : undefined}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                    <RegionFlag region={code} />
                  </span>
                  <input
                    id={`price-${code}`}
                    inputMode="decimal"
                    value={text[code].amount}
                    onChange={(e) => update(code, { amount: e.target.value })}
                    placeholder="Not sold here"
                    disabled={!canEdit}
                    aria-invalid={shown && Boolean(problems.amount)}
                    aria-describedby={`price-${code}-error`}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>
              <Field
                id={`compare-${code}`}
                label="Old price, shown struck through (optional)"
                error={shown ? problems.compareAt : undefined}
              >
                <input
                  id={`compare-${code}`}
                  inputMode="decimal"
                  value={text[code].compareAt}
                  onChange={(e) => update(code, { compareAt: e.target.value })}
                  disabled={!canEdit}
                  aria-invalid={shown && Boolean(problems.compareAt)}
                  aria-describedby={`compare-${code}-error`}
                  className={inputClass}
                />
              </Field>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">
          Type the price as you would say it, for example 1200 or 49.90.
          Pakistan is in rupees, Germany in euros; they are never converted.
        </p>
        <FormError error={save.error} />
        {canEdit ? (
          <div>
            <button
              type="submit"
              disabled={save.isPending}
              className={primaryButton}
            >
              {save.isPending ? "Saving…" : "Save prices"}
            </button>
          </div>
        ) : null}
      </form>
    </DetailCard>
  );
}
