"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { RegionFlag } from "@/components/shared/region-flag";
import { REGION_LIST } from "@/config/regions";
import { OrdersPagination } from "@/features/admin-orders/orders-table";
import { useAdminMarket } from "@/features/admin-shell/admin-market";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { AdminPageHead } from "@/features/admin-shell/admin-shell";
import {
  SearchBox,
  TableMessage,
  bodyCell,
  filterBarClass,
  filterBoxClass,
  headCell,
  primaryButton,
  tableCardClass,
  useDebounced,
} from "@/features/admin-shell/admin-ui";
import type { RegionCode } from "@/types/region";
import { cn } from "@/utils/cn";

import {
  fetchCategories,
  fetchProducts,
  type DeletedFilter,
  type ProductFilters,
  type ProductStatus,
} from "./admin-products-service";
import { PriceText, ProductStatusChip } from "./products-ui";

const PAGE_SIZE = 10;

function FilterSelect({
  label,
  value,
  onChange,
  className,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn(filterBoxClass, "relative", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full cursor-pointer appearance-none rounded-[9px] bg-transparent pr-9 pl-3.5 text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
      />
    </label>
  );
}

/** The Products screen: filters, the table and the page buttons. */
export function AdminProductsView() {
  const { staff, permissions } = useAdminSession();
  const { market } = useAdminMarket();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [deleted, setDeleted] = useState<DeletedFilter>("exclude");
  const [page, setPage] = useState(1);
  const settledSearch = useDebounced(search);

  const filters: ProductFilters = {
    search: settledSearch || undefined,
    status: status || undefined,
    categoryId: categoryId || undefined,
    deleted,
  };

  const products = useQuery({
    queryKey: ["admin", "products", filters, page],
    queryFn: () => fetchProducts(filters, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: can("products.view"),
    staleTime: 15_000,
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategories,
    enabled: can("products.view"),
    staleTime: 60_000,
  });

  const rows = products.data?.items ?? [];
  const total = products.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownMarkets: RegionCode[] =
    market === "all" ? REGION_LIST.map((region) => region.code) : [market];

  function change(apply: () => void) {
    apply();
    setPage(1);
  }

  let message: string | undefined;
  if (products.isError && rows.length === 0) {
    message =
      "We couldn't load the products. Check your connection and try again.";
  } else if (products.isPending) {
    message = "Loading products…";
  } else if (rows.length === 0) {
    message = "No products match these filters.";
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[75rem] flex-col gap-[clamp(0.5rem,1.8dvh,1.6rem)]">
      <div className="flex items-end justify-between gap-4">
        <AdminPageHead
          title="Products"
          subtitle="Prices, sizes, photos and stock of everything you sell."
        />
        {can("products.manage") ? (
          <Link href="/admin/products/new" className={primaryButton}>
            <Plus aria-hidden className="size-4" />
            Add Product
          </Link>
        ) : null}
      </div>

      {can("products.view") ? (
        <>
          <div className={filterBarClass}>
            <div className="grid grid-cols-2 gap-[clamp(0.5rem,1.1vw,0.85rem)] lg:grid-cols-12">
              <SearchBox
                label="Search by name, slug or SKU"
                placeholder="Search by name, slug or SKU"
                value={search}
                onChange={(value) => change(() => setSearch(value))}
                className="col-span-2 lg:col-span-5"
              />
              <FilterSelect
                label="Status"
                value={status}
                onChange={(value) =>
                  change(() => setStatus(value as ProductStatus | ""))
                }
                className="lg:col-span-2"
              >
                <option value="">All Statuses</option>
                <option value="active">On sale</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </FilterSelect>
              <FilterSelect
                label="Category"
                value={categoryId}
                onChange={(value) => change(() => setCategoryId(value))}
                className="lg:col-span-3"
              >
                <option value="">All Categories</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Deleted products"
                value={deleted}
                onChange={(value) =>
                  change(() => setDeleted(value as DeletedFilter))
                }
                className="lg:col-span-2"
              >
                <option value="exclude">Hide deleted</option>
                <option value="include">Show deleted</option>
                <option value="only">Only deleted</option>
              </FilterSelect>
            </div>
          </div>

          <div
            className={cn(
              tableCardClass,
              products.isFetching && !products.isPending && "opacity-80",
            )}
          >
            <div className="min-h-0 flex-[0_1_auto] overflow-auto">
              <table className="w-full min-w-[48rem] table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th scope="col" className={headCell}>
                      Product
                    </th>
                    <th scope="col" className={headCell}>
                      Category
                    </th>
                    <th scope="col" className={headCell}>
                      Price
                    </th>
                    <th scope="col" className={headCell}>
                      In stock
                    </th>
                    <th scope="col" className={headCell}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((product) => (
                    <tr key={product.id}>
                      <td className={bodyCell}>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="flex items-center gap-3 font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {product.image ? (
                            <Image
                              src={product.image.src}
                              alt=""
                              width={36}
                              height={36}
                              unoptimized
                              className="size-9 shrink-0 rounded-md bg-white object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="size-9 shrink-0 rounded-md bg-background"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate">
                              {product.name}
                            </span>
                            <span className="block truncate text-xs font-normal text-muted-foreground">
                              {product.variantCount}{" "}
                              {product.variantCount === 1
                                ? "variant"
                                : "variants"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className={cn(bodyCell, "text-foreground")}>
                        <span className="block truncate">
                          {product.category?.label ?? "—"}
                          {product.subcategoryLabel
                            ? ` · ${product.subcategoryLabel}`
                            : ""}
                        </span>
                      </td>
                      <td className={cn(bodyCell, "text-foreground")}>
                        <span className="flex flex-col gap-0.5">
                          {shownMarkets.map((code) => (
                            <span
                              key={code}
                              className="flex items-center gap-1.5"
                            >
                              <RegionFlag region={code} />
                              <PriceText
                                price={product.prices[code]}
                                market={code}
                              />
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className={cn(bodyCell, "text-foreground")}>
                        <span className="flex flex-col gap-0.5">
                          {shownMarkets.map((code) => (
                            <span key={code}>
                              {market === "all" ? `${code} ` : ""}
                              <span
                                className={
                                  product.available[code] === 0
                                    ? "text-danger"
                                    : undefined
                                }
                              >
                                {product.available[code]}
                              </span>
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className={bodyCell}>
                        <ProductStatusChip
                          status={product.status}
                          deleted={product.deletedAt !== null}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {message ? <TableMessage>{message}</TableMessage> : null}
            </div>
            <OrdersPagination
              page={Math.min(page, totalPages)}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role does not include products.
        </p>
      )}
    </div>
  );
}
