import pg from "pg";

import { POST as register } from "@/app/api/v1/auth/register/route";
import { GET as getCartRoute } from "@/app/api/v1/cart/route";
import { POST as addRoute } from "@/app/api/v1/cart/items/route";
import { GET as pricingRoute } from "@/app/api/v1/checkout/pricing/route";
import { POST as createRoute } from "@/app/api/v1/orders/route";
import { POST as simulateRoute } from "@/app/api/v1/orders/[number]/simulate-payment/route";
import { importSampleCatalog } from "@/server/catalog/import-sample-catalog";

import { call, exec, sql, uniqueEmail } from "./helpers";

export type Market = "PK" | "DE";

export const CUSTOMER_PASSWORD = "Sup3r-secret-pw";
export const DRESS = "elegant-satin-midi-dress";

/** Loads the sample catalogue into the test database (it only adds what is missing). Call from beforeAll. */
export async function importCatalog(): Promise<void> {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
  });
  try {
    await importSampleCatalog(pool);
  } finally {
    await pool.end();
  }
}

/** Removes every order and puts the stock back to what the import made, so each test starts clean. */
export async function resetShopData(): Promise<void> {
  await exec("DELETE FROM stock_movements WHERE reason IN ('sale', 'return')");
  await exec("DELETE FROM orders");
  await exec("UPDATE inventory SET on_hand = 25, reserved = 0");
  await exec("UPDATE product_variants SET active = true");
}

export interface TestCustomer {
  id: string;
  email: string;
  cookie: string;
}

export async function signUpCustomer(): Promise<TestCustomer> {
  const email = uniqueEmail();
  const result = await call(register, {
    body: {
      firstName: "Ada",
      lastName: "Lovelace",
      email,
      password: CUSTOMER_PASSWORD,
    },
  });
  return {
    id: result.body.user.id as string,
    email,
    cookie: result.cookie as string,
  };
}

/** The id of one size of the green sample dress (or another product's first matching variant). */
export async function variantOf(size: string, slug = DRESS): Promise<string> {
  const [row] = await sql<{ id: string }>(
    `SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE p.slug = :slug AND v.size_label = :size ORDER BY v.sort LIMIT 1`,
    { slug, size },
  );
  return row.id;
}

export const addToCart = (
  cookie: string,
  variantId: string,
  quantity = 1,
  market: Market = "PK",
) =>
  call(addRoute, {
    method: "POST",
    cookie,
    body: { variantId, quantity, market },
  });

interface CartLineBody {
  variantId: string;
  quantity: number;
  selected: boolean;
  unitPrice: { amount: number };
}

/** The order body the website would send, with `expected` as the shopper saw it (shipping included). */
export async function orderBody(
  cookie: string,
  market: Market,
  email = "ada@example.com",
) {
  const cart = await call(getCartRoute, {
    method: "GET",
    cookie,
    path: `/api/v1/cart?market=${market}`,
  });
  const lines = (cart.body.items as CartLineBody[]).filter(
    (line) => line.selected,
  );
  const pricing = await call(pricingRoute, {
    method: "GET",
    path: `/api/v1/checkout/pricing?market=${market}`,
  });
  const goods = lines.reduce(
    (sum, line) => sum + line.unitPrice.amount * line.quantity,
    0,
  );

  return {
    market,
    contact: { email, phone: "+49 30 1234567" },
    shipping: {
      fullName: "Ada Lovelace",
      country: market === "PK" ? "Pakistan" : "Germany",
      city: market === "PK" ? "Lahore" : "Berlin",
      address: "Main Street 5",
      zip: "10115",
    },
    billing: "same",
    paymentMethod: "card",
    acceptTerms: true,
    expected: {
      total: goods + (pricing.body.shippingFee as number),
      items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
    },
  };
}

export interface PlacedTestOrder {
  customer: TestCustomer;
  number: string;
  total: number;
  variantId: string;
  /** The email address given at checkout, where order emails go. */
  email: string;
}

/**
 * A customer signs up, puts the sample dress in the cart and places an order
 * (unpaid, holding its stock). Use `payOrder` to pay it.
 */
export async function placeTestOrder(
  options: {
    market?: Market;
    size?: string;
    quantity?: number;
    email?: string;
    customer?: TestCustomer;
  } = {},
): Promise<PlacedTestOrder> {
  const market = options.market ?? "PK";
  const customer = options.customer ?? (await signUpCustomer());
  const variantId = await variantOf(options.size ?? "S");
  const email = options.email ?? "ada@example.com";
  await addToCart(customer.cookie, variantId, options.quantity ?? 1, market);

  const placed = await call(createRoute, {
    method: "POST",
    cookie: customer.cookie,
    body: await orderBody(customer.cookie, market, email),
  });
  if (placed.status !== 201) {
    throw new Error(
      `Placing the test order failed: ${placed.status} ${placed.raw}`,
    );
  }
  return {
    customer,
    number: placed.body.order.number as string,
    total: placed.body.order.total as number,
    variantId,
    email,
  };
}

/** Plays the payment provider's "paid" message: the order becomes "processing" and its stock is sold. */
export async function payOrder(
  customer: TestCustomer,
  number: string,
): Promise<void> {
  const result = await call(simulateRoute, {
    method: "POST",
    cookie: customer.cookie,
    params: { number },
    body: { outcome: "success" },
  });
  if (result.status !== 200 || result.body.order.status !== "processing") {
    throw new Error(
      `Paying the test order failed: ${result.status} ${result.raw}`,
    );
  }
}

export async function stockOf(variantId: string, market: Market = "PK") {
  const [row] = await sql<{ on_hand: number; reserved: number }>(
    "SELECT on_hand, reserved FROM inventory WHERE variant_id = :variantId AND market = :market",
    { variantId, market },
  );
  return row;
}
