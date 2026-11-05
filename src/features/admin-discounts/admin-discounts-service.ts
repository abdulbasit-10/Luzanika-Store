import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { RegionCode } from "@/types/region";

export type DiscountStatus = "active" | "scheduled" | "ended" | "off";

export interface Discount {
  id: string;
  name: string;
  percent: number;
  markets: RegionCode[];
  /** ISO 8601, or null for "already started". */
  startsAt: string | null;
  /** ISO 8601, or null for "until switched off". */
  endsAt: string | null;
  /** The manual switch. */
  active: boolean;
  status: DiscountStatus;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountProduct {
  id: string;
  name: string;
  slug: string;
  /** "Kids", "Men"…: tells apart two products with the same name. */
  category: string | null;
}

export interface DiscountDetail extends Discount {
  products: DiscountProduct[];
}

export interface DiscountPage {
  items: Discount[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DiscountFilters {
  status?: DiscountStatus;
  search?: string;
}

/** What the form sends. */
export interface DiscountInput {
  name: string;
  percent: number;
  markets: RegionCode[];
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  productIds: string[];
}

export const fetchDiscounts = (
  filters: DiscountFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<DiscountPage>("/admin/discounts", {
    params: {
      status: filters.status,
      search: filters.search?.trim() || undefined,
      page,
      pageSize,
    },
  });

export const fetchDiscount = async (id: string) =>
  (
    await apiGet<{ discount: DiscountDetail }>(
      `/admin/discounts/${encodeURIComponent(id)}`,
    )
  ).discount;

export const createDiscount = async (input: DiscountInput) =>
  (await apiPost<{ discount: DiscountDetail }>("/admin/discounts", input))
    .discount;

export const updateDiscount = async (id: string, input: DiscountInput) =>
  (
    await apiPatch<{ discount: DiscountDetail }>(
      `/admin/discounts/${encodeURIComponent(id)}`,
      input,
    )
  ).discount;

export const deleteDiscount = (id: string) =>
  apiDelete(`/admin/discounts/${encodeURIComponent(id)}`);

/** Up to 20 products to pick from, by name, slug or SKU. */
export const searchDiscountProducts = async (search: string) =>
  (
    await apiGet<{ items: DiscountProduct[] }>("/admin/discounts/products", {
      params: { search: search.trim() || undefined },
    })
  ).items;
