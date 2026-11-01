import "server-only";

import { toCartLine, type CartLineDto } from "@/server/cart/cart-lines";
import { withTransaction, type Tx } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import {
  cartRepository,
  type Market,
} from "@/server/repositories/cart-repository";
import { variantIdSchema } from "@/server/validation/cart-schemas";

export const MAX_CART_LINES = 50;
export const MAX_QUANTITY_PER_LINE = 99;

export type { CartLineDto };

const gone = () =>
  new ApiError("not_found", { message: "This item is no longer available." });

function parseVariantId(id: string): string {
  const parsed = variantIdSchema.safeParse(id);
  if (!parsed.success) throw new ApiError("not_found");
  return parsed.data;
}

async function readCart(
  customerId: string,
  market: Market,
  tx?: Tx,
): Promise<CartLineDto[]> {
  const rows = await cartRepository.listLines(customerId, market, tx);
  return rows.map(toCartLine);
}

/** Runs `work` with this customer's cart locked, then returns the cart as it is afterwards. */
function changeCart(
  customerId: string,
  market: Market,
  work: (tx: Tx) => Promise<void>,
): Promise<CartLineDto[]> {
  return withTransaction(async (tx) => {
    await cartRepository.lockCustomer(customerId, tx);
    await work(tx);
    return readCart(customerId, market, tx);
  });
}

function stockError(available: number, alreadyInCart: number): ApiError {
  if (available <= 0) {
    return new ApiError("out_of_stock", {
      message: "Sorry, this item is out of stock.",
    });
  }
  const inCart =
    alreadyInCart > 0
      ? ` and you already have ${alreadyInCart} in your cart`
      : "";
  return new ApiError("out_of_stock", {
    message: `Only ${available} available${inCart}.`,
  });
}

/*
 * Stock is checked when something is added or changed, but NOT reserved: a
 * cart that is left behind must never keep real buyers from an item. Stock is
 * held at checkout. Because the numbers can change while an item sits in a
 * cart, the cart is always read back against live stock (see toCartLine).
 */

export function getCart(
  customerId: string,
  market: Market,
): Promise<CartLineDto[]> {
  return readCart(customerId, market);
}

export function addToCart(
  customerId: string,
  input: { market: Market; variantId: string; quantity: number },
): Promise<CartLineDto[]> {
  return changeCart(customerId, input.market, async (tx) => {
    const stock = await cartRepository.findVariantStock(
      input.variantId,
      input.market,
      tx,
    );
    if (!stock?.purchasable) throw gone();

    const existing = await cartRepository.getQuantity(
      customerId,
      input.variantId,
      tx,
    );
    if (
      existing === undefined &&
      (await cartRepository.countLines(customerId, tx)) >= MAX_CART_LINES
    ) {
      throw new ApiError("unprocessable", {
        message: `Your cart can hold ${MAX_CART_LINES} different items. Please remove one first.`,
      });
    }

    const wanted = (existing ?? 0) + input.quantity;
    if (wanted > MAX_QUANTITY_PER_LINE) {
      throw new ApiError("unprocessable", {
        message: `You can buy up to ${MAX_QUANTITY_PER_LINE} of one item.`,
      });
    }
    if (wanted > stock.available)
      throw stockError(
        stock.available,
        Math.min(existing ?? 0, stock.available),
      );

    await cartRepository.upsert(customerId, input.variantId, wanted, tx);
  });
}

export function updateCartItem(
  customerId: string,
  rawVariantId: string,
  input: { market: Market; quantity?: number; selected?: boolean },
): Promise<CartLineDto[]> {
  const variantId = parseVariantId(rawVariantId);

  return changeCart(customerId, input.market, async (tx) => {
    const existing = await cartRepository.getQuantity(
      customerId,
      variantId,
      tx,
    );
    if (existing === undefined) throw new ApiError("not_found");

    if (input.quantity !== undefined) {
      const stock = await cartRepository.findVariantStock(
        variantId,
        input.market,
        tx,
      );
      if (!stock?.purchasable) throw gone();
      if (input.quantity > stock.available) {
        throw stockError(stock.available, 0);
      }
    }

    await cartRepository.update(
      customerId,
      variantId,
      { quantity: input.quantity, selected: input.selected },
      tx,
    );
  });
}

/** Removing a line that is already gone is fine: the goal ("it is not in the cart") is met. */
export function removeCartItem(
  customerId: string,
  rawVariantId: string,
  market: Market,
): Promise<CartLineDto[]> {
  const variantId = parseVariantId(rawVariantId);

  return changeCart(customerId, market, (tx) =>
    cartRepository.remove(customerId, [variantId], tx),
  );
}

/** Removes the lines that were ticked and buyable, i.e. the ones that were just paid for. */
export function removeSelectedCartItems(
  customerId: string,
  market: Market,
): Promise<CartLineDto[]> {
  return changeCart(customerId, market, async (tx) => {
    const lines = await readCart(customerId, market, tx);
    await cartRepository.remove(
      customerId,
      lines.filter((line) => line.selected).map((line) => line.variantId),
      tx,
    );
  });
}
