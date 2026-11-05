import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { withTransaction, type Tx } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import {
  discountRepository,
  type DiscountFilter,
  type DiscountMarket,
  type DiscountProductRow,
  type DiscountRow,
  type DiscountStatus,
} from "@/server/repositories/discount-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";
import type {
  CreateDiscountBody,
  UpdateDiscountBody,
} from "@/server/validation/admin-discount-schemas";

export interface DiscountDto {
  id: string;
  name: string;
  percent: number;
  markets: DiscountMarket[];
  startsAt: string | null;
  endsAt: string | null;
  /** The manual switch. A discount that is switched off never applies. */
  active: boolean;
  /** Where the discount stands right now: active, scheduled (not started), ended or off. */
  status: DiscountStatus;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountDetailDto extends DiscountDto {
  products: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
  }[];
}

const iso = (value: Date | null) =>
  value === null ? null : new Date(value).toISOString();

function toDto(row: DiscountRow): DiscountDto {
  return {
    id: row.id,
    name: row.name,
    percent: row.percent,
    markets: row.markets,
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    active: row.active,
    status: row.status,
    productCount: row.product_count,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const notFound = () => new ApiError("not_found");

export async function listDiscounts(
  filter: DiscountFilter,
  page: number,
  pageSize: number,
) {
  const { rows, total } = await discountRepository.list(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  return { items: rows.map(toDto), total, page, pageSize };
}

export async function getDiscount(id: string): Promise<DiscountDetailDto> {
  const row = await discountRepository.find(id);
  if (!row) throw notFound();
  const products = await discountRepository.listProducts(id);
  return { ...toDto(row), products };
}

export function listProductOptions(
  search: string | undefined,
): Promise<DiscountProductRow[]> {
  return discountRepository.productOptions(search, 20);
}

/** An end that is not after the start can never apply: tell staff which box is wrong. */
function checkDates(startsAt: Date | null, endsAt: Date | null): void {
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new ApiError("validation_failed", {
      fields: { endsAt: "The end must be after the start" },
    });
  }
}

async function checkProducts(ids: string[], tx: Tx): Promise<void> {
  const found = await discountRepository.existingProductIds(ids, tx);
  if (ids.some((id) => !found.has(id))) {
    throw new ApiError("validation_failed", {
      fields: { productIds: "One of the chosen products no longer exists" },
    });
  }
}

const date = (value: string | null) =>
  value === null ? null : new Date(value);

/** What the audit log keeps about a discount, so a change can be read back later. */
function snapshot(row: DiscountRow, productIds: string[]) {
  return {
    name: row.name,
    percent: row.percent,
    markets: row.markets,
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    active: row.active,
    productIds,
  };
}

export async function createDiscount(
  ctx: AdminContext,
  body: CreateDiscountBody,
): Promise<DiscountDetailDto> {
  const startsAt = date(body.startsAt);
  const endsAt = date(body.endsAt);
  checkDates(startsAt, endsAt);

  const id = await withTransaction(async (tx) => {
    await checkProducts(body.productIds, tx);
    const created = await discountRepository.insert(
      {
        name: body.name,
        percent: body.percent,
        markets: body.markets,
        startsAt,
        endsAt,
        active: body.active,
        staffId: ctx.actor.id,
      },
      tx,
    );
    await discountRepository.replaceProducts(created, body.productIds, tx);
    const row = (await discountRepository.find(created, tx))!;
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "discounts.create",
        entityType: "discount",
        entityId: created,
        before: null,
        after: snapshot(row, body.productIds),
      },
      ctx.requestId,
    );
    return created;
  });

  refreshCatalogCache();
  return getDiscount(id);
}

export async function updateDiscount(
  ctx: AdminContext,
  id: string,
  patch: UpdateDiscountBody,
): Promise<DiscountDetailDto> {
  await withTransaction(async (tx) => {
    const current = await discountRepository.lock(id, tx);
    if (!current) throw notFound();
    const currentProducts = (await discountRepository.listProducts(id, tx)).map(
      (product) => product.id,
    );

    const startsAt =
      patch.startsAt === undefined ? current.starts_at : date(patch.startsAt);
    const endsAt =
      patch.endsAt === undefined ? current.ends_at : date(patch.endsAt);
    checkDates(startsAt, endsAt);

    if (patch.productIds) await checkProducts(patch.productIds, tx);

    await discountRepository.update(
      id,
      {
        name: patch.name ?? current.name,
        percent: patch.percent ?? current.percent,
        markets: patch.markets ?? current.markets,
        startsAt,
        endsAt,
        active: patch.active ?? current.active,
        staffId: ctx.actor.id,
      },
      tx,
    );
    if (patch.productIds) {
      await discountRepository.replaceProducts(id, patch.productIds, tx);
    }

    const after = (await discountRepository.find(id, tx))!;
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "discounts.update",
        entityType: "discount",
        entityId: id,
        before: snapshot(current, currentProducts),
        after: snapshot(after, patch.productIds ?? currentProducts),
      },
      ctx.requestId,
    );
  });

  refreshCatalogCache();
  return getDiscount(id);
}

/**
 * Deletes a discount. Orders already placed keep the prices they were sold at
 * (the discount of each line is stored on the order), so nothing is lost.
 */
export async function deleteDiscount(
  ctx: AdminContext,
  id: string,
): Promise<void> {
  await withTransaction(async (tx) => {
    const current = await discountRepository.lock(id, tx);
    if (!current) throw notFound();
    const productIds = (await discountRepository.listProducts(id, tx)).map(
      (product) => product.id,
    );
    await discountRepository.delete(id, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "discounts.delete",
        entityType: "discount",
        entityId: id,
        before: snapshot(current, productIds),
        after: null,
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
}
