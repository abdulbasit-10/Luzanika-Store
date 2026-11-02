import { describe, expect, it } from "vitest";

import { GET as auditRoute } from "@/app/api/v1/admin/audit/route";
import { POST as createStaffRoute } from "@/app/api/v1/admin/staff/route";
import { POST as createProductRoute } from "@/app/api/v1/admin/products/route";
import { setEmailSender } from "@/server/email/email-sender";

import { signedInStaff } from "./admin-helpers";
import { call, exec, uniqueEmail } from "./helpers";

const audit = (staffCookie: string | undefined, query = "") =>
  call(auditRoute, {
    method: "GET",
    staffCookie,
    path: `/api/v1/admin/audit${query}`,
  });

const superAdmin = () => signedInStaff({ superAdmin: true });

describe("who may read the audit log", () => {
  it("is for the super admin only, however many permissions someone has", async () => {
    expect((await audit(undefined)).status).toBe(401);

    const everything = await signedInStaff({
      permissions: [
        "dashboard.view",
        "orders.view",
        "orders.manage",
        "orders.refund",
        "products.view",
        "products.manage",
        "products.delete",
        "catalog.manage",
        "stock.view",
        "stock.adjust",
        "customers.view",
        "customers.manage",
        "settings.view",
        "settings.manage",
      ],
    });
    const refused = await audit(everything.cookie);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");

    expect((await audit((await superAdmin()).cookie)).status).toBe(200);
  });
});

describe("reading the log", () => {
  it("shows the newest change first, with who made it and what changed", async () => {
    const boss = await superAdmin();
    const maker = await signedInStaff({ permissions: ["products.manage"] });
    const created = await call(createProductRoute, {
      method: "POST",
      staffCookie: maker.cookie,
      body: { name: "T9 Audited Product" },
    });
    const productId = created.body.product.id as string;

    const result = await audit(
      boss.cookie,
      `?entityType=product&entityId=${productId}`,
    );
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ total: 1, page: 1, pageSize: 25 });
    const [row] = result.body.items;
    expect(row).toMatchObject({
      action: "products.create",
      entityType: "product",
      entityId: productId,
      staffId: maker.id,
      staffEmail: maker.email,
      before: null,
    });
    expect(row.after.name).toBe("T9 Audited Product");
    expect(row.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(row.requestId).toEqual(expect.any(String));

    await exec("DELETE FROM products WHERE id = :id", { id: productId });
  });

  it("orders by time, filters by person, action and date, and pages", async () => {
    const boss = await superAdmin();
    const maker = await signedInStaff({ permissions: ["products.manage"] });
    const ids: string[] = [];
    for (const name of ["T9 First", "T9 Second", "T9 Third"]) {
      const created = await call(createProductRoute, {
        method: "POST",
        staffCookie: maker.cookie,
        body: { name },
      });
      ids.push(created.body.product.id);
    }

    const byPerson = await audit(
      boss.cookie,
      `?staffId=${maker.id}&action=products.create`,
    );
    expect(byPerson.body.total).toBe(3);
    expect(
      byPerson.body.items.map((item: { entityId: string }) => item.entityId),
    ).toEqual([...ids].reverse());

    const page = await audit(
      boss.cookie,
      `?staffId=${maker.id}&action=products.create&pageSize=2&page=2`,
    );
    expect(page.body.items).toHaveLength(1);
    expect(page.body.total).toBe(3);

    const today = new Date().toISOString().slice(0, 10);
    expect(
      (
        await audit(
          boss.cookie,
          `?staffId=${maker.id}&action=products.create&from=${today}&to=${today}`,
        )
      ).body.total,
    ).toBe(3);
    expect(
      (
        await audit(
          boss.cookie,
          `?staffId=${maker.id}&action=products.create&to=2020-01-01`,
        )
      ).body.total,
    ).toBe(0);
    expect(
      (await audit(boss.cookie, `?staffId=${maker.id}&action=orders.refund`))
        .body.total,
    ).toBe(0);

    await exec("DELETE FROM products WHERE id IN (:ids)", { ids });
  });

  it("never shows a password hash or an authenticator secret", async () => {
    const boss = await superAdmin();
    setEmailSender({ send: async () => {} });
    try {
      const invited = await call(createStaffRoute, {
        method: "POST",
        staffCookie: boss.cookie,
        body: {
          email: uniqueEmail(),
          firstName: "Grace",
          lastName: "Hopper",
          roleIds: [],
        },
      });
      expect(invited.status).toBe(201);
    } finally {
      setEmailSender(undefined);
    }

    const result = await audit(boss.cookie, "?pageSize=100");
    expect(result.raw).not.toMatch(
      /password_?hash|passwordHash|totp_?secret|totpSecret|\$2[aby]\$|recoveryCodes|recovery_codes|codeHash/i,
    );
    expect(
      result.body.items.some((item: { action: string }) =>
        item.action.startsWith("staff."),
      ),
    ).toBe(true);
  });

  it("refuses filters that make no sense", async () => {
    const boss = await superAdmin();
    for (const query of [
      "?staffId=not-an-id",
      "?pageSize=1000",
      "?page=0",
      "?from=whenever",
      "?action=",
    ]) {
      expect((await audit(boss.cookie, query)).status, query).toBe(400);
    }
  });
});
