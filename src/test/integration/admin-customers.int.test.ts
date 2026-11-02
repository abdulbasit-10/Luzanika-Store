import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as listRoute } from "@/app/api/v1/admin/customers/route";
import { GET as getRoute } from "@/app/api/v1/admin/customers/[id]/route";
import { POST as blockRoute } from "@/app/api/v1/admin/customers/[id]/block/route";
import { POST as unblockRoute } from "@/app/api/v1/admin/customers/[id]/unblock/route";
import { POST as refundRoute } from "@/app/api/v1/admin/orders/[number]/refunds/route";
import { DELETE as deleteAccountRoute } from "@/app/api/v1/account/route";
import { GET as customerCartRoute } from "@/app/api/v1/cart/route";
import { POST as customerLoginRoute } from "@/app/api/v1/auth/login/route";
import { GET as customerMeRoute } from "@/app/api/v1/auth/me/route";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import {
  CUSTOMER_PASSWORD,
  importCatalog,
  payOrder,
  placeTestOrder,
  resetShopData,
  signUpCustomer,
} from "./shop-helpers";

beforeAll(importCatalog);
beforeEach(async () => {
  await resetShopData();
  // Customers blocked by an earlier test must not show up in this one.
  await exec("UPDATE customers SET status = 'active' WHERE status = 'blocked'");
});

const list = (staffCookie: string | undefined, query = "") =>
  call(listRoute, {
    method: "GET",
    staffCookie,
    path: `/api/v1/admin/customers${query}`,
  });
const get = (staffCookie: string | undefined, id: string) =>
  call(getRoute, { method: "GET", staffCookie, params: { id } });
const block = (
  staffCookie: string | undefined,
  id: string,
  body: unknown = { reason: "Fraud" },
) => call(blockRoute, { method: "POST", staffCookie, params: { id }, body });
const unblock = (
  staffCookie: string | undefined,
  id: string,
  body: unknown = {},
) => call(unblockRoute, { method: "POST", staffCookie, params: { id }, body });

const viewer = () => signedInStaff({ permissions: ["customers.view"] });
const manager = () =>
  signedInStaff({ permissions: ["customers.view", "customers.manage"] });

describe("who may see and manage customers", () => {
  it("needs a signed-in staff member", async () => {
    const customer = await signUpCustomer();
    const results = await Promise.all([
      list(undefined),
      get(undefined, customer.id),
      block(undefined, customer.id),
      unblock(undefined, customer.id),
    ]);
    for (const result of results) expect(result.status).toBe(401);
  });

  it("lets viewing and managing be given separately", async () => {
    const customer = await signUpCustomer();
    const seeOnly = await viewer();
    const manageOnly = await signedInStaff({
      permissions: ["customers.manage"],
    });

    expect((await list(seeOnly.cookie)).status).toBe(200);
    expect((await get(seeOnly.cookie, customer.id)).status).toBe(200);
    const refused = await block(seeOnly.cookie, customer.id);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");
    expect((await unblock(seeOnly.cookie, customer.id)).status).toBe(403);

    expect((await list(manageOnly.cookie)).status).toBe(403);
    expect((await get(manageOnly.cookie, customer.id)).status).toBe(403);
    expect((await block(manageOnly.cookie, customer.id)).status).toBe(200);
  });

  it("refuses staff with unrelated permissions", async () => {
    const other = await signedInStaff({
      permissions: ["orders.view", "stock.view"],
    });

    expect((await list(other.cookie)).status).toBe(403);
  });
});

describe("the customer list", () => {
  it("shows customers newest first with how many orders they placed", async () => {
    const older = await signUpCustomer();
    const newer = await signUpCustomer();
    await placeTestOrder({ customer: older });
    await placeTestOrder({ customer: older });
    const staff = await viewer();

    const result = await list(staff.cookie, "?pageSize=100");

    expect(result.status).toBe(200);
    const items = result.body.items as {
      id: string;
      orderCount: number;
      status: string;
      email: string;
    }[];
    expect(items.findIndex((item) => item.id === newer.id)).toBeLessThan(
      items.findIndex((item) => item.id === older.id),
    );
    expect(items.find((item) => item.id === older.id)).toMatchObject({
      email: older.email,
      firstName: "Ada",
      lastName: "Lovelace",
      status: "active",
      orderCount: 2,
    });
    expect(items.find((item) => item.id === older.id)!.orderCount).toBe(2);
    expect(items.find((item) => item.id === newer.id)).toMatchObject({
      orderCount: 0,
      lastOrderAt: null,
    });
  });

  it("searches by email, name and phone, and treats % as plain text", async () => {
    const customer = await signUpCustomer();
    await exec(
      "UPDATE customers SET phone = '+92 300 5550101' WHERE id = :id",
      { id: customer.id },
    );
    const staff = await viewer();
    const ids = async (query: string) =>
      (
        await list(staff.cookie, `?search=${encodeURIComponent(query)}`)
      ).body.items.map((item: { id: string }) => item.id);

    expect(await ids(customer.email)).toEqual([customer.id]);
    expect(await ids(customer.email.toUpperCase())).toEqual([customer.id]);
    expect(await ids("Ada Lov")).toContain(customer.id);
    expect(await ids("5550101")).toEqual([customer.id]);
    expect(await ids("nobody-by-this-name")).toEqual([]);
    expect(await ids("%")).toEqual([]);
  });

  it("filters by status and pages", async () => {
    const customer = await signUpCustomer();
    await signUpCustomer();
    const manage = await manager();
    await block(manage.cookie, customer.id);

    const blocked = await list(manage.cookie, "?status=blocked");
    expect(blocked.body.items.map((item: { id: string }) => item.id)).toEqual([
      customer.id,
    ]);

    const paged = await list(manage.cookie, "?pageSize=1&page=2");
    expect(paged.body).toMatchObject({ page: 2, pageSize: 1 });
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.total).toBeGreaterThanOrEqual(2);
  });

  it("refuses filters that make no sense", async () => {
    const staff = await viewer();

    for (const query of [
      "?status=gone",
      "?pageSize=101",
      "?page=0",
      "?search=",
    ]) {
      expect((await list(staff.cookie, query)).status, query).toBe(400);
    }
  });
});

describe("one customer", () => {
  it("shows the profile, addresses, orders and what they spent per currency", async () => {
    const customer = await signUpCustomer();
    await exec(
      `INSERT INTO addresses (customer_id, full_name, phone, country, city, address, zip, is_default)
       VALUES (:id, 'Ada Lovelace', '+92 300 1234567', 'Pakistan', 'Lahore', 'MM Alam Road 5', '54000', true)`,
      { id: customer.id },
    );
    await exec(
      "UPDATE customers SET phone = '+92 300 1234567', gender = 'female', date_of_birth = '1990-12-10' WHERE id = :id",
      { id: customer.id },
    );
    const pk = await placeTestOrder({ customer, market: "PK" });
    const de = await placeTestOrder({ customer, market: "DE" });
    await payOrder(customer, pk.number);
    await payOrder(customer, de.number);
    const staff = await signedInStaff({
      permissions: ["customers.view", "orders.refund"],
    });
    await call(refundRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { number: de.number },
      body: { amount: 1_000, reason: "Goodwill" },
    });
    await placeTestOrder({ customer, market: "PK" });

    const result = await get(staff.cookie, customer.id);

    expect(result.status).toBe(200);
    const body = result.body.customer;
    expect(body).toMatchObject({
      id: customer.id,
      email: customer.email,
      emailVerified: false,
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+92 300 1234567",
      gender: "female",
      dateOfBirth: "1990-12-10",
      status: "active",
      anonymisedAt: null,
      activeSessions: 1,
    });
    expect(body.addresses).toEqual([
      expect.objectContaining({ city: "Lahore", isDefault: true }),
    ]);
    expect(body.orders).toHaveLength(3);
    expect(body.orders[0].placedAt >= body.orders[2].placedAt).toBe(true);
    // Per currency, never added across currencies.
    expect(body.spend).toEqual(
      [
        {
          currency: "PKR",
          orders: 2,
          paid: pk.total,
          refunded: 0,
          net: pk.total,
        },
        {
          currency: "EUR",
          orders: 1,
          paid: de.total,
          refunded: 1_000,
          net: de.total - 1_000,
        },
      ].sort((a, b) => a.currency.localeCompare(b.currency)),
    );
  });

  it("never shows the password hash or sign-in tokens", async () => {
    const customer = await signUpCustomer();
    const staff = await viewer();

    const result = await get(staff.cookie, customer.id);

    expect(result.raw).not.toMatch(/password|hash|token|\$2[aby]\$/i);
  });

  it("not found for a malformed or unknown id", async () => {
    const staff = await viewer();

    expect((await get(staff.cookie, "nope")).status).toBe(404);
    expect((await get(staff.cookie, crypto.randomUUID())).status).toBe(404);
  });
});

describe("blocking", () => {
  it("signs the customer out of every browser at once and refuses their login", async () => {
    const customer = await signUpCustomer();
    const staff = await manager();
    expect(
      (
        await call(customerCartRoute, {
          method: "GET",
          path: "/api/v1/cart?market=PK",
          cookie: customer.cookie,
        })
      ).status,
    ).toBe(200);

    const result = await block(staff.cookie, customer.id, {
      reason: "Chargebacks on three orders",
    });

    expect(result.status).toBe(200);
    expect(result.body.customer).toMatchObject({
      status: "blocked",
      activeSessions: 0,
    });
    expect(
      (
        await call(customerCartRoute, {
          method: "GET",
          path: "/api/v1/cart?market=PK",
          cookie: customer.cookie,
        })
      ).status,
    ).toBe(401);
    expect(
      (await call(customerMeRoute, { method: "GET", cookie: customer.cookie }))
        .body.user,
    ).toBeNull();
    const login = await call(customerLoginRoute, {
      body: { email: customer.email, password: CUSTOMER_PASSWORD },
    });
    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe("invalid_credentials");
  });

  it("leaves the customer's orders and details alone", async () => {
    const customer = await signUpCustomer();
    const order = await placeTestOrder({ customer });
    const staff = await manager();

    await block(staff.cookie, customer.id);

    const detail = (await get(staff.cookie, customer.id)).body.customer;
    expect(detail.orders.map((o: { number: string }) => o.number)).toEqual([
      order.number,
    ]);
    expect(detail.orders[0].status).toBe("waiting_payment");
  });

  it("unblocking lets them sign in again", async () => {
    const customer = await signUpCustomer();
    const staff = await manager();
    await block(staff.cookie, customer.id);

    const result = await unblock(staff.cookie, customer.id, {
      note: "Resolved with the bank",
    });

    expect(result.body.customer.status).toBe("active");
    const login = await call(customerLoginRoute, {
      body: { email: customer.email, password: CUSTOMER_PASSWORD },
    });
    expect(login.status).toBe(200);
  });

  it("needs a reason, and refuses blocking twice, unblocking someone who is not blocked, or a deleted account", async () => {
    const customer = await signUpCustomer();
    const staff = await manager();

    expect((await block(staff.cookie, customer.id, {})).status).toBe(400);
    expect(
      (await block(staff.cookie, customer.id, { reason: "  " })).status,
    ).toBe(400);
    expect(
      (await block(staff.cookie, customer.id, { reason: "x", extra: 1 }))
        .status,
    ).toBe(400);
    expect((await unblock(staff.cookie, customer.id)).status).toBe(409);

    expect((await block(staff.cookie, customer.id)).status).toBe(200);
    const twice = await block(staff.cookie, customer.id);
    expect(twice.status).toBe(409);
    expect(twice.body.error.message).toContain("already blocked");

    const gone = await signUpCustomer();
    await call(deleteAccountRoute, {
      method: "DELETE",
      cookie: gone.cookie,
      body: { password: CUSTOMER_PASSWORD },
    });
    const deleted = await block(staff.cookie, gone.id);
    expect(deleted.status).toBe(409);
    expect(deleted.body.error.message).toContain("deleted");
    expect((await get(staff.cookie, gone.id)).body.customer.status).toBe(
      "anonymised",
    );
  });

  it("records who blocked and unblocked, and why", async () => {
    const customer = await signUpCustomer();
    const staff = await manager();
    await block(staff.cookie, customer.id, { reason: "Fraud ring" });
    await unblock(staff.cookie, customer.id, { note: "Cleared" });

    const rows = await sql<{
      action: string;
      staff_email: string;
      before: Record<string, string>;
      after: Record<string, string>;
    }>(
      "SELECT action, staff_email, before, after FROM audit_log WHERE entity_type = 'customer' AND entity_id = :id ORDER BY id",
      { id: customer.id },
    );
    expect(rows.map((row) => row.action)).toEqual([
      "customers.block",
      "customers.unblock",
    ]);
    expect(rows[0].staff_email).toBe(staff.email);
    expect(rows[0].before).toEqual({ status: "active" });
    expect(rows[0].after).toEqual({ status: "blocked", reason: "Fraud ring" });
    expect(rows[1].after).toEqual({ status: "active", note: "Cleared" });
  });

  it("two simultaneous blocks: one wins, one is told it is already blocked", async () => {
    const customer = await signUpCustomer();
    const a = await manager();
    const b = await manager();

    const [first, second] = await Promise.all([
      block(a.cookie, customer.id),
      block(b.cookie, customer.id),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const [{ n }] = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM audit_log WHERE action = 'customers.block' AND entity_id = :id",
      { id: customer.id },
    );
    expect(Number(n)).toBe(1);
  });
});
