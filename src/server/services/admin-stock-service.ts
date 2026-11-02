import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { withTransaction } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import {
  adminStockRepository,
  type MovementFilter,
  type MovementRow,
  type StockFilter,
  type StockRow,
} from "@/server/repositories/admin-stock-repository";
import type { Market } from "@/server/repositories/order-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";

export interface StockRowDto {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: string;
  sku: string;
  color?: string;
  size?: string;
  variantActive: boolean;
  market: Market;
  onHand: number;
  /** Held by orders that are waiting for payment. */
  reserved: number;
  /** What can be sold right now: on hand minus reserved. */
  available: number;
  lowStockThreshold: number;
  /** True when what can be sold is at or below the threshold. */
  low: boolean;
  /** False when this variant has no stock record in this market yet (it counts as 0). */
  hasRecord: boolean;
}

export interface MovementDto {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  market: Market;
  /** Positive: stock added. Negative: stock removed. */
  delta: number;
  reason: string;
  note: string | null;
  orderNumber: string | null;
  by: { id: string; name: string; email: string } | null;
  createdAt: string;
}

function toStockDto(row: StockRow): StockRowDto {
  const available = row.on_hand - row.reserved;
  return {
    variantId: row.variant_id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    productStatus: row.product_status,
    sku: row.sku,
    ...(row.color_name ? { color: row.color_name } : {}),
    ...(row.size_label ? { size: row.size_label } : {}),
    variantActive: row.variant_active,
    market: row.market,
    onHand: row.on_hand,
    reserved: row.reserved,
    available,
    lowStockThreshold: row.low_stock_threshold,
    low: available <= row.low_stock_threshold,
    hasRecord: row.has_record,
  };
}

function toMovementDto(row: MovementRow): MovementDto {
  return {
    id: row.id,
    variantId: row.variant_id,
    sku: row.sku,
    productName: row.product_name,
    market: row.market,
    delta: row.delta,
    reason: row.reason,
    note: row.note,
    orderNumber: row.order_number,
    by:
      row.staff_id && row.staff_name && row.staff_email
        ? { id: row.staff_id, name: row.staff_name, email: row.staff_email }
        : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listStock(
  filter: StockFilter,
  page: number,
  pageSize: number,
) {
  const { rows, total } = await adminStockRepository.list(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  return { items: rows.map(toStockDto), total, page, pageSize };
}

export async function listMovements(
  filter: MovementFilter,
  page: number,
  pageSize: number,
) {
  const { rows, total } = await adminStockRepository.listMovements(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  return { items: rows.map(toMovementDto), total, page, pageSize };
}

const stockNotFound = () =>
  new ApiError("not_found", {
    message: "This product variant does not exist.",
  });

export interface StockAdjustment {
  variantId: string;
  market: Market;
  /** Add (positive) or remove (negative) this many units. */
  delta?: number;
  /** Or: the shelf now holds exactly this many. */
  setTo?: number;
  reason: "adjustment" | "correction";
  note: string | null;
}

/**
 * Changes how many units are on the shelf, with a reason, and writes the stock
 * ledger row naming the person. It never takes stock below what unpaid orders
 * are holding. The stock row is locked, so a change and a sale at the same
 * moment cannot overwrite each other.
 */
export async function adjustStock(
  ctx: AdminContext,
  input: StockAdjustment,
): Promise<StockRowDto> {
  const row = await withTransaction(async (tx) => {
    if (!(await adminStockRepository.variantExists(input.variantId, tx))) {
      throw stockNotFound();
    }
    const before = await adminStockRepository.lockRecord(
      input.variantId,
      input.market,
      tx,
    );

    const target =
      input.setTo !== undefined ? input.setTo : before.on_hand + input.delta!;
    const delta = target - before.on_hand;

    if (delta === 0) {
      throw new ApiError("validation_failed", {
        message: "That is already the stock level.",
        fields: {
          [input.setTo !== undefined ? "setTo" : "delta"]:
            "That is already the stock level",
        },
      });
    }
    if (target < 0) {
      throw new ApiError("validation_failed", {
        message: `Only ${before.on_hand} are on the shelf, so that many cannot be removed.`,
        fields: { delta: `Only ${before.on_hand} are on the shelf` },
      });
    }
    if (target < before.reserved) {
      throw new ApiError("conflict", {
        message: `${before.reserved} are held for orders waiting for payment, so the shelf cannot go below ${before.reserved}.`,
      });
    }

    await adminStockRepository.setOnHand(
      input.variantId,
      input.market,
      target,
      tx,
    );
    await adminStockRepository.insertMovement(
      {
        variantId: input.variantId,
        market: input.market,
        delta,
        reason: input.reason,
        note: input.note,
        staffId: ctx.actor.id,
      },
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "stock.adjust",
        entityType: "stock",
        entityId: `${input.variantId}:${input.market}`,
        before: { onHand: before.on_hand, reserved: before.reserved },
        after: {
          onHand: target,
          reserved: before.reserved,
          delta,
          reason: input.reason,
          note: input.note,
        },
      },
      ctx.requestId,
    );
    return (await adminStockRepository.findOne(
      input.variantId,
      input.market,
      tx,
    ))!;
  });

  refreshCatalogCache();
  return toStockDto(row);
}

/** Sets when a variant counts as "low on stock" in a market. */
export async function setLowStockThreshold(
  ctx: AdminContext,
  input: { variantId: string; market: Market; threshold: number },
): Promise<StockRowDto> {
  const row = await withTransaction(async (tx) => {
    if (!(await adminStockRepository.variantExists(input.variantId, tx))) {
      throw stockNotFound();
    }
    const before = await adminStockRepository.lockRecord(
      input.variantId,
      input.market,
      tx,
    );
    await adminStockRepository.setThreshold(
      input.variantId,
      input.market,
      input.threshold,
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "stock.threshold",
        entityType: "stock",
        entityId: `${input.variantId}:${input.market}`,
        before: { lowStockThreshold: before.low_stock_threshold },
        after: { lowStockThreshold: input.threshold },
      },
      ctx.requestId,
    );
    return (await adminStockRepository.findOne(
      input.variantId,
      input.market,
      tx,
    ))!;
  });
  return toStockDto(row);
}
