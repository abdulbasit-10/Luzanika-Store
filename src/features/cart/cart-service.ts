import { withKnownErrors } from "@/features/auth/auth-service";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { ProductImage } from "@/types/product";
import type { CurrencyCode, RegionCode } from "@/types/region";

/**
 * - ok: can be bought as asked
 * - adjusted: more was asked for than is in stock; `quantity` is what will be bought
 * - out_of_stock: nothing available in this market right now
 * - unavailable: no longer sold in this market
 */
export type CartLineStatus = "ok" | "adjusted" | "out_of_stock" | "unavailable";

/** One line of the signed-in customer's cart, priced and checked against live stock by the server. */
export interface CartLine {
  /** The variant id (product + colour + size); also how the cart endpoints address the line. */
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image?: ProductImage;
  /** Short descriptors such as scent notes; shown instead of the size. */
  notes?: string[];
  /** Only set when the product comes in more than one colour. */
  color?: string;
  size?: string;
  /**
   * Price in the selected region, in minor units. `amount` is what one unit costs now.
   * While a discount applies, `listAmount` is the price before it and `discountPercent` the percent off.
   */
  unitPrice: {
    amount: number;
    currency: CurrencyCode;
    compareAtAmount?: number;
    listAmount?: number;
    discountPercent?: number;
  } | null;
  /** What will be bought: the requested amount, lowered to the available stock. */
  quantity: number;
  requestedQuantity: number;
  /** Most that can be bought right now. */
  available: number;
  /** Ticked and buyable. */
  selected: boolean;
  status: CartLineStatus;
}

interface CartResponse {
  market: RegionCode;
  items: CartLine[];
}

/** Lines that can be bought, i.e. count towards the total. */
export function isBuyable(line: CartLine) {
  return line.status === "ok" || line.status === "adjusted";
}

/*
 * The server owns the cart. Every call answers with the whole current cart
 * for the region, so the page always shows what is really saved and priced.
 */

const itemPath = (variantId: string) =>
  `/cart/items/${encodeURIComponent(variantId)}`;

/** GET /cart */
export async function fetchCart(market: RegionCode): Promise<CartLine[]> {
  const { items } = await apiGet<CartResponse>("/cart", {
    params: { market },
  });
  return items;
}

/** POST /cart/items. Rejects with AuthError("out_of_stock") (its `serverMessage` says how many are left) when there is not enough stock. */
export async function addCartItem(input: {
  variantId: string;
  quantity: number;
  market: RegionCode;
}): Promise<CartLine[]> {
  const { items } = await withKnownErrors(() =>
    apiPost<CartResponse>("/cart/items", input),
  );
  return items;
}

/** PATCH /cart/items/:variantId */
export async function updateCartItem(
  variantId: string,
  changes: { market: RegionCode; quantity?: number; selected?: boolean },
): Promise<CartLine[]> {
  const { items } = await withKnownErrors(() =>
    apiPatch<CartResponse>(itemPath(variantId), changes),
  );
  return items;
}

/** DELETE /cart/items/:variantId */
export async function removeCartItem(
  variantId: string,
  market: RegionCode,
): Promise<CartLine[]> {
  const { items } = await apiDelete<CartResponse>(itemPath(variantId), {
    params: { market },
  });
  return items;
}

/** DELETE /cart/selected: removes the ticked, buyable lines (what was just ordered). */
export async function removeSelectedCartItems(
  market: RegionCode,
): Promise<CartLine[]> {
  const { items } = await apiDelete<CartResponse>("/cart/selected", {
    params: { market },
  });
  return items;
}
