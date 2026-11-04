"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui/toaster";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import { DetailCard } from "@/features/admin-shell/admin-ui";

import {
  createProduct,
  fetchCategories,
  fetchCollections,
} from "./admin-products-service";
import { ProductBasicsForm } from "./product-basics-form";

/** Categories and collections for the pickers of the product forms. */
export function useCatalogChoices(enabled: boolean) {
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
    enabled,
    staleTime: 60_000,
  });
  const collections = useQuery({
    queryKey: ["admin", "collections"],
    queryFn: fetchCollections,
    enabled,
    staleTime: 60_000,
  });
  return {
    categories,
    collections,
    ready: categories.isSuccess && collections.isSuccess,
    failed: categories.isError || collections.isError,
  };
}

/** Add Product: the basics first. Prices, sizes and photos are added on the page that opens next. */
export function AdminProductNewView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { staff, permissions } = useAdminSession();
  const allowed = staff.isSuperAdmin || permissions.includes("products.manage");
  const choices = useCatalogChoices(allowed);

  const create = useMutation({
    mutationFn: createProduct,
    onSuccess: async (product) => {
      toast.success("Product created. Now add its price, sizes and photos.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      router.push(`/admin/products/${product.id}`);
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.6dvh,1.25rem)]">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to Products
      </Link>
      <AdminPageHead
        title="Add Product"
        subtitle="Start with the basics. It stays a draft until you put it on sale."
      />
      {!allowed ? (
        <p className="text-sm text-muted-foreground">
          Your role does not allow adding products.
        </p>
      ) : choices.failed ? (
        <p role="alert" className="text-sm text-danger">
          We couldn&apos;t load the categories. Reload the page.
        </p>
      ) : !choices.ready ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      ) : (
        <DetailCard title="Product details">
          <ProductBasicsForm
            categories={choices.categories.data ?? []}
            collections={choices.collections.data ?? []}
            submitLabel="Create product"
            pending={create.isPending}
            error={create.error}
            onSubmit={(basics) => create.mutate(basics)}
          />
        </DetailCard>
      )}
    </div>
  );
}
