"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import {
  DetailCard,
  Field,
  FormError,
  fieldError,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/features/admin-shell/admin-ui";

import {
  addVariant,
  updateVariant,
  type Product,
  type Variant,
} from "./admin-products-service";
import {
  variantBody,
  variantProblems,
  type VariantText,
} from "./product-forms";
import { useProductMutation } from "./product-mutation";

const EMPTY: VariantText = {
  sku: "",
  colorName: "",
  colorHex: "",
  sizeLabel: "",
  stockPK: "",
  stockDE: "",
};

function AddVariantForm({
  product,
  onDone,
}: {
  product: Product;
  onDone: () => void;
}) {
  const [values, setValues] = useState<VariantText>(EMPTY);
  const [shown, setShown] = useState(false);
  const problems = variantProblems(values);
  const add = useProductMutation(
    product.id,
    () => addVariant(product.id, variantBody(values)),
    "Variant added",
    () => {
      setValues(EMPTY);
      setShown(false);
      onDone();
    },
  );
  const set = (patch: Partial<VariantText>) =>
    setValues((current) => ({ ...current, ...patch }));
  const err = (key: keyof VariantText) =>
    shown ? problems[key] : fieldError(add.error, key);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShown(true);
        if (Object.keys(problems).length === 0) add.mutate(undefined);
      }}
      className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-white p-3"
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Field id="v-sku" label="SKU" error={err("sku")}>
          <input
            id="v-sku"
            value={values.sku}
            onChange={(e) => set({ sku: e.target.value })}
            maxLength={64}
            aria-invalid={Boolean(err("sku"))}
            aria-describedby="v-sku-error"
            className={inputClass}
          />
        </Field>
        <Field id="v-size" label="Size (optional)" error={err("sizeLabel")}>
          <input
            id="v-size"
            value={values.sizeLabel}
            onChange={(e) => set({ sizeLabel: e.target.value })}
            placeholder="M, 42, One size"
            maxLength={20}
            aria-describedby="v-size-error"
            className={inputClass}
          />
        </Field>
        <Field id="v-colour" label="Colour name" error={err("colorName")}>
          <input
            id="v-colour"
            value={values.colorName}
            onChange={(e) => set({ colorName: e.target.value })}
            placeholder="Black"
            maxLength={40}
            aria-describedby="v-colour-error"
            className={inputClass}
          />
        </Field>
        <Field id="v-hex" label="Colour code" error={err("colorHex")}>
          <div className="flex items-center gap-2">
            <input
              id="v-hex"
              value={values.colorHex}
              onChange={(e) => set({ colorHex: e.target.value })}
              placeholder="#000000"
              maxLength={7}
              aria-invalid={Boolean(err("colorHex"))}
              aria-describedby="v-hex-error"
              className={inputClass}
            />
            <input
              type="color"
              aria-label="Pick a colour"
              value={
                /^#[0-9a-fA-F]{6}$/.test(values.colorHex)
                  ? values.colorHex
                  : "#000000"
              }
              onChange={(e) => set({ colorHex: e.target.value })}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-white p-1"
            />
          </div>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field
          id="v-stock-pk"
          label="Starting stock, Pakistan"
          error={err("stockPK")}
        >
          <input
            id="v-stock-pk"
            inputMode="numeric"
            value={values.stockPK}
            onChange={(e) => set({ stockPK: e.target.value })}
            placeholder="0"
            aria-describedby="v-stock-pk-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="v-stock-de"
          label="Starting stock, Germany"
          error={err("stockDE")}
        >
          <input
            id="v-stock-de"
            inputMode="numeric"
            value={values.stockDE}
            onChange={(e) => set({ stockDE: e.target.value })}
            placeholder="0"
            aria-describedby="v-stock-de-error"
            className={inputClass}
          />
        </Field>
      </div>
      <FormError error={add.error} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={add.isPending}
          className={primaryButton}
        >
          {add.isPending ? "Adding…" : "Add variant"}
        </button>
        <button type="button" onClick={onDone} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function VariantRow({
  product,
  variant,
  canEdit,
}: {
  product: Product;
  variant: Variant;
  canEdit: boolean;
}) {
  const toggle = useProductMutation(
    product.id,
    (active: boolean) => updateVariant(variant.id, { active }),
    "Variant updated",
  );

  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3 font-medium text-foreground">{variant.sku}</td>
      <td className="py-2 pr-3">
        {variant.color ? (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: variant.color.hex }}
            />
            {variant.color.name}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="py-2 pr-3">{variant.size ?? "—"}</td>
      <td className="py-2 pr-3">
        {variant.stock.PK.available}
        {variant.stock.PK.reserved > 0 ? (
          <span className="text-xs text-muted-foreground">
            {" "}
            ({variant.stock.PK.reserved} held)
          </span>
        ) : null}
      </td>
      <td className="py-2 pr-3">
        {variant.stock.DE.available}
        {variant.stock.DE.reserved > 0 ? (
          <span className="text-xs text-muted-foreground">
            {" "}
            ({variant.stock.DE.reserved} held)
          </span>
        ) : null}
      </td>
      <td className="py-2 text-right">
        <Switch
          checked={variant.active}
          disabled={!canEdit || toggle.isPending}
          onCheckedChange={(active) => toggle.mutate(active)}
          aria-label={`${variant.sku} is on sale`}
        />
        {toggle.error ? <FormError error={toggle.error} /> : null}
      </td>
    </tr>
  );
}

/** Sizes and colours. A variant is switched off, never removed, so old orders keep their record. */
export function ProductVariantsCard({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <DetailCard
      title={`Sizes and colours (${product.variants.length})`}
      action={
        canEdit && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={secondaryButton}
          >
            <Plus aria-hidden className="size-4" />
            Add variant
          </button>
        ) : null
      }
    >
      {product.variants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variants yet. A product needs at least one before it can go on
          sale.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="pb-1 font-medium">
                  SKU
                </th>
                <th scope="col" className="pb-1 font-medium">
                  Colour
                </th>
                <th scope="col" className="pb-1 font-medium">
                  Size
                </th>
                <th scope="col" className="pb-1 font-medium">
                  In stock PK
                </th>
                <th scope="col" className="pb-1 font-medium">
                  In stock DE
                </th>
                <th scope="col" className="pb-1 text-right font-medium">
                  On sale
                </th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <VariantRow
                  key={variant.id}
                  product={product}
                  variant={variant}
                  canEdit={canEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        To change how many are in stock, use{" "}
        <Link
          href="/admin/stock"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Inventory
        </Link>
        .
      </p>
      {adding ? (
        <AddVariantForm product={product} onDone={() => setAdding(false)} />
      ) : null}
    </DetailCard>
  );
}
