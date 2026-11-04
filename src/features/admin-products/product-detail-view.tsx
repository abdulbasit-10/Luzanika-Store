"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import {
  DetailCard,
  FormError,
  primaryButton,
  secondaryButton,
} from "@/features/admin-shell/admin-ui";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/utils/cn";

import {
  deleteProduct,
  fetchProduct,
  restoreProduct,
  updateProduct,
  type Product,
  type ProductStatus,
} from "./admin-products-service";
import { ProductBasicsForm } from "./product-basics-form";
import { useProductMutation } from "./product-mutation";
import { useCatalogChoices } from "./product-new-view";
import { ProductPhotosCard } from "./product-photos-card";
import { ProductPricesCard } from "./product-prices-card";
import { ProductSectionsCard } from "./product-sections-card";
import { ProductVariantsCard } from "./product-variants-card";
import { ProductStatusChip } from "./products-ui";

const STATUS_NOTE: Record<ProductStatus, string> = {
  draft:
    "A draft is not in the shop. It needs a price and a size or colour before it can go on sale.",
  active: "This product is on sale in the markets where it has a price.",
  archived: "Archived products are kept but not shown in the shop.",
};

/** What can be done with the product's state, and the buttons for it. */
function StatusCard({
  product,
  canManage,
  canDelete,
}: {
  product: Product;
  canManage: boolean;
  canDelete: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const deleted = product.deletedAt !== null;

  const move = useProductMutation(
    product.id,
    (status: ProductStatus) => updateProduct(product.id, { status }),
    "Product updated",
  );
  const remove = useProductMutation(
    product.id,
    () => deleteProduct(product.id),
    "Product deleted. You can restore it.",
    () => setDeleting(false),
  );
  const restore = useProductMutation(
    product.id,
    () => restoreProduct(product.id),
    "Product restored as a draft",
  );

  return (
    <DetailCard title="Status">
      <div className="flex flex-wrap items-center gap-2">
        <ProductStatusChip status={product.status} deleted={deleted} />
        <p className="text-sm text-muted-foreground">
          {deleted
            ? "Deleted: hidden from the shop and cannot be changed until restored."
            : STATUS_NOTE[product.status]}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canManage && !deleted ? (
          <>
            {product.status !== "active" ? (
              <button
                type="button"
                disabled={move.isPending}
                onClick={() => move.mutate("active")}
                className={primaryButton}
              >
                Put on sale
              </button>
            ) : (
              <button
                type="button"
                disabled={move.isPending}
                onClick={() => move.mutate("draft")}
                className={secondaryButton}
              >
                Move back to draft
              </button>
            )}
            {product.status !== "archived" ? (
              <button
                type="button"
                disabled={move.isPending}
                onClick={() => move.mutate("archived")}
                className={secondaryButton}
              >
                Archive
              </button>
            ) : null}
          </>
        ) : null}
        {canDelete && !deleted ? (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="inline-flex items-center rounded-lg border border-danger bg-white px-4 py-[clamp(0.4rem,1.2dvh,0.625rem)] text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Delete
          </button>
        ) : null}
        {canDelete && deleted ? (
          <button
            type="button"
            disabled={restore.isPending}
            onClick={() => restore.mutate(undefined)}
            className={primaryButton}
          >
            Restore as draft
          </button>
        ) : null}
      </div>
      <FormError error={move.error ?? restore.error} />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => remove.mutate(undefined)}
        title={`Delete ${product.name}?`}
        description="It is hidden from the shop but kept, with its orders. You can restore it later as a draft."
        confirmLabel="Delete product"
        pendingLabel="Deleting…"
        pending={remove.isPending}
      >
        <FormError error={remove.error} />
      </ConfirmDialog>
    </DetailCard>
  );
}

/** The basics, saved with a PATCH. */
function BasicsCard({
  product,
  canEdit,
}: {
  product: Product;
  canEdit: boolean;
}) {
  const choices = useCatalogChoices(true);
  const save = useProductMutation(
    product.id,
    (basics: Parameters<typeof updateProduct>[1]) =>
      updateProduct(product.id, basics),
    "Product saved",
  );

  return (
    <DetailCard title="Product details">
      {choices.failed ? (
        <p role="alert" className="text-sm text-danger">
          We couldn&apos;t load the categories. Reload the page.
        </p>
      ) : !choices.ready ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <ProductBasicsForm
          product={product}
          categories={choices.categories.data ?? []}
          collections={choices.collections.data ?? []}
          submitLabel="Save details"
          pending={save.isPending}
          error={save.error}
          canEdit={canEdit && product.deletedAt === null}
          onSubmit={(basics) => save.mutate(basics)}
        />
      )}
    </DetailCard>
  );
}

/** One product: its status, details, prices, sizes, photos and text. */
export function AdminProductDetailView({ id }: { id: string }) {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);

  const query = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => fetchProduct(id),
    enabled: can("products.view"),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const product = query.data;
  const editable = can("products.manage") && product?.deletedAt === null;

  let body;
  if (!can("products.view")) {
    body = (
      <p className="text-sm text-muted-foreground">
        Your role does not include products.
      </p>
    );
  } else if (query.isPending) {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Loading product…
      </p>
    );
  } else if (!product) {
    const missing =
      query.error instanceof ApiError && query.error.status === 404;
    body = (
      <p role="alert" className="text-sm text-danger">
        {missing
          ? "There is no such product."
          : "We couldn't load this product. Check your connection and reload the page."}
      </p>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="truncate text-[clamp(1.25rem,3.8dvh,2rem)] leading-tight font-semibold tracking-[-0.5px] text-[#151d2b]">
              {product.name}
            </h1>
            <p className="text-[clamp(0.875rem,2.2dvh,1rem)] text-[#6f7b8c]">
              /{product.slug}
            </p>
          </div>
          {product.status === "active" && product.deletedAt === null ? (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className={cn(secondaryButton, "shrink-0")}
            >
              <ExternalLink aria-hidden className="size-4" />
              View in shop
            </Link>
          ) : null}
        </div>
        <StatusCard
          product={product}
          canManage={can("products.manage")}
          canDelete={can("products.delete")}
        />
        <BasicsCard product={product} canEdit={Boolean(editable)} />
        <ProductPricesCard product={product} canEdit={Boolean(editable)} />
        <ProductVariantsCard product={product} canEdit={Boolean(editable)} />
        <ProductPhotosCard product={product} canEdit={Boolean(editable)} />
        <ProductSectionsCard product={product} canEdit={Boolean(editable)} />
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to Products
      </Link>
      {body}
    </div>
  );
}
