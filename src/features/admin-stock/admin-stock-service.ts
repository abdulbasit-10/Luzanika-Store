import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { RegionCode } from "@/types/region";

/** One variant in one market. A variant without a record yet counts as 0. */
export interface StockRow {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: string;
  sku: string;
  color?: string;
  size?: string;
  variantActive: boolean;
  market: RegionCode;
  onHand: number;
  /** Held by orders that are waiting for payment. */
  reserved: number;
  available: number;
  lowStockThreshold: number;
  low: boolean;
  hasRecord: boolean;
}

export type MovementReason =
  "initial_import" | "adjustment" | "sale" | "return" | "correction";

export interface Movement {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  market: RegionCode;
  /** Positive: stock added. Negative: stock removed. */
  delta: number;
  reason: MovementReason;
  note: string | null;
  orderNumber: string | null;
  by: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockFilters {
  market?: RegionCode;
  search?: string;
  lowOnly?: boolean;
}

export interface MovementFilters {
  market?: RegionCode;
  reason?: MovementReason;
}

export const fetchStock = (
  filters: StockFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<Page<StockRow>>("/admin/stock", {
    params: {
      market: filters.market,
      search: filters.search?.trim() || undefined,
      lowOnly: filters.lowOnly ? "true" : undefined,
      page,
      pageSize,
    },
  });

export const fetchMovements = (
  filters: MovementFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<Page<Movement>>("/admin/stock/movements", {
    params: { ...filters, page, pageSize },
  });

export type StockChange =
  { delta: number; setTo?: undefined } | { setTo: number; delta?: undefined };

/** Add or remove units, or set the shelf to an exact number. A correction must say what was wrong. */
export const adjustStock = (
  row: Pick<StockRow, "variantId" | "market">,
  change: StockChange,
  reason: "adjustment" | "correction",
  note: string,
) =>
  apiPost<{ stock: StockRow }>("/admin/stock/adjustments", {
    variantId: row.variantId,
    market: row.market,
    ...change,
    reason,
    ...(note.trim() ? { note: note.trim() } : {}),
  });

export const setLowStockThreshold = (
  row: Pick<StockRow, "variantId" | "market">,
  lowStockThreshold: number,
) =>
  apiPatch<{ stock: StockRow }>("/admin/stock/low-stock-threshold", {
    variantId: row.variantId,
    market: row.market,
    lowStockThreshold,
  });
