"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RegionFlag } from "@/components/shared/region-flag";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { REGION_LIST } from "@/config/regions";
import {
  DetailCard,
  Field,
  FormError,
  fieldError,
  inputClass,
  primaryButton,
  secondaryButton,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import { cn } from "@/utils/cn";

import {
  createDiscount,
  deleteDiscount,
  searchDiscountProducts,
  updateDiscount,
  type DiscountDetail,
  type DiscountProduct,
} from "./admin-discounts-service";
import {
  EMPTY_DISCOUNT,
  discountProblems,
  discountToValues,
  productLabel,
  toDiscountInput,
  type DiscountFormValues,
} from "./discount-forms";

/** Search the products and tick the ones the discount covers. */
function ProductPicker({
  chosen,
  onChange,
  error,
  disabled,
}: {
  chosen: DiscountProduct[];
  onChange: (products: DiscountProduct[]) => void;
  error?: string;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const settled = useDebounced(search);
  const results = useQuery({
    queryKey: ["admin", "discounts", "product-options", settled],
    queryFn: () => searchDiscountProducts(settled),
    enabled: !disabled,
    staleTime: 30_000,
  });
  const chosenIds = new Set(chosen.map((product) => product.id));
  const options = (results.data ?? []).filter(
    (product) => !chosenIds.has(product.id),
  );

  return (
    <div className="flex flex-col gap-3">
      <Field id="discount-product-search" label="Add products" error={error}>
        <input
          id="discount-product-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, link or SKU"
          disabled={disabled}
          className={inputClass}
        />
      </Field>
      {!disabled ? (
        <ul
          aria-label="Products found"
          className="max-h-48 overflow-auto rounded-lg border border-border bg-white"
        >
          {results.isPending ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Loading products…
            </li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {results.isError
                ? "We couldn't load the products."
                : "No more products match."}
            </li>
          ) : (
            options.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5 text-sm last:border-b-0"
              >
                <span className="min-w-0 truncate">
                  {product.name}
                  {product.category ? (
                    <span className="text-muted-foreground">
                      {" · "}
                      {product.category}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => onChange([...chosen, product])}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Plus aria-hidden className="size-3.5" />
                  Add
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      <div>
        <p className="text-sm font-medium text-foreground">
          Products on sale ({chosen.length})
        </p>
        {chosen.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No products chosen yet.
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {chosen.map((product) => (
              <li
                key={product.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white py-1 pr-1.5 pl-3 text-sm"
              >
                <span className="truncate" title={product.slug}>
                  {productLabel(product)}
                </span>
                {!disabled ? (
                  <button
                    type="button"
                    aria-label={`Remove ${productLabel(product)}`}
                    onClick={() =>
                      onChange(chosen.filter((item) => item.id !== product.id))
                    }
                    className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DeleteDialog({
  discount,
  onClose,
}: {
  discount: DiscountDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteDiscount(discount.id),
    onSuccess: async () => {
      toast.success("Discount deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin", "discounts"] });
      router.push("/admin/discounts");
    },
  });
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => remove.mutate()}
      title={`Delete “${discount.name}”?`}
      description="The products go back to their normal price at once. Orders already placed keep the price they were sold at. This cannot be undone."
      confirmLabel="Delete discount"
      pendingLabel="Deleting…"
      pending={remove.isPending}
    >
      <FormError error={remove.error} />
    </ConfirmDialog>
  );
}

/** Make a discount, or change one. */
export function DiscountForm({
  discount,
  canManage,
}: {
  /** Leave out to make a new discount. */
  discount?: DiscountDetail;
  canManage: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<DiscountFormValues>(
    discount ? discountToValues(discount) : EMPTY_DISCOUNT,
  );
  const [shown, setShown] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const problems = discountProblems(values);

  const save = useMutation({
    mutationFn: () => {
      const input = toDiscountInput(values);
      return discount
        ? updateDiscount(discount.id, input)
        : createDiscount(input);
    },
    onSuccess: async (saved) => {
      toast.success(discount ? "Discount saved" : "Discount created");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "discounts"] }),
        // Prices on the shop changed; staff product pages may show them.
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
      ]);
      if (!discount) router.replace(`/admin/discounts/${saved.id}`);
    },
  });

  const patch = (change: Partial<DiscountFormValues>) =>
    setValues((current) => ({ ...current, ...change }));
  const serverError = (field: string) => fieldError(save.error, field);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShown(true);
        if (Object.keys(problems).length === 0) save.mutate();
      }}
      className="flex flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]"
    >
      <DetailCard title="Discount">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <Field
            id="discount-name"
            label="Name"
            error={shown ? (problems.name ?? serverError("name")) : undefined}
          >
            <input
              id="discount-name"
              value={values.name}
              onChange={(event) => patch({ name: event.target.value })}
              maxLength={80}
              placeholder="e.g. Winter sale"
              disabled={!canManage}
              aria-invalid={shown && Boolean(problems.name)}
              aria-describedby="discount-name-error"
              className={inputClass}
            />
          </Field>
          <Field
            id="discount-percent"
            label="Percent off"
            error={
              shown ? (problems.percent ?? serverError("percent")) : undefined
            }
          >
            <input
              id="discount-percent"
              inputMode="numeric"
              value={values.percent}
              onChange={(event) => patch({ percent: event.target.value })}
              placeholder="1 to 90"
              disabled={!canManage}
              aria-invalid={shown && Boolean(problems.percent)}
              aria-describedby="discount-percent-error"
              className={inputClass}
            />
          </Field>
        </div>

        <fieldset className="mt-3" disabled={!canManage}>
          <legend className="text-sm font-medium text-foreground">
            Markets
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-2">
            {REGION_LIST.map((region) => (
              <Checkbox
                key={region.code}
                checked={values.markets.includes(region.code)}
                onChange={(event) =>
                  patch({
                    markets: event.target.checked
                      ? [...values.markets, region.code]
                      : values.markets.filter((code) => code !== region.code),
                  })
                }
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <RegionFlag region={region.code} />
                    {region.name}
                  </span>
                }
              />
            ))}
          </div>
          {shown && problems.markets ? (
            <p role="alert" className="mt-1 text-xs text-danger">
              {problems.markets}
            </p>
          ) : null}
        </fieldset>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field
            id="discount-start"
            label="Starts (optional)"
            hint="Leave empty to start at once."
          >
            <input
              id="discount-start"
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) => patch({ startsAt: event.target.value })}
              disabled={!canManage}
              className={inputClass}
            />
          </Field>
          <Field
            id="discount-end"
            label="Ends (optional)"
            hint="Leave empty to run until you switch it off."
            error={
              shown ? (problems.endsAt ?? serverError("endsAt")) : undefined
            }
          >
            <input
              id="discount-end"
              type="datetime-local"
              value={values.endsAt}
              onChange={(event) => patch({ endsAt: event.target.value })}
              disabled={!canManage}
              aria-invalid={shown && Boolean(problems.endsAt)}
              aria-describedby="discount-end-error"
              className={inputClass}
            />
          </Field>
        </div>

        <Checkbox
          className="mt-3"
          checked={values.active}
          onChange={(event) => patch({ active: event.target.checked })}
          disabled={!canManage}
          label="Switched on (untick to pause it without deleting)"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          If a product is in two discounts, the bigger one applies. They are
          never added together. The discount replaces the old price shown on a
          product while it runs.
        </p>
      </DetailCard>

      <DetailCard title="Products">
        <ProductPicker
          chosen={values.products}
          onChange={(products) => patch({ products })}
          error={
            shown ? (problems.products ?? serverError("productIds")) : undefined
          }
          disabled={!canManage}
        />
      </DetailCard>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3">
          <FormError error={save.error} />
          <button
            type="submit"
            disabled={save.isPending}
            className={primaryButton}
          >
            {save.isPending
              ? "Saving…"
              : discount
                ? "Save changes"
                : "Create discount"}
          </button>
          {discount ? (
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className={cn(secondaryButton, "border-danger text-danger")}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can see this discount but not change it.
        </p>
      )}
      {deleting && discount ? (
        <DeleteDialog discount={discount} onClose={() => setDeleting(false)} />
      ) : null}
    </form>
  );
}
