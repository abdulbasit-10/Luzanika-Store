import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  GET as getSettingsRoute,
  PATCH as patchSettingsRoute,
} from "@/app/api/v1/admin/settings/route";
import { GET as pricingRoute } from "@/app/api/v1/checkout/pricing/route";
import { GET as publicSettingsRoute } from "@/app/api/v1/settings/shop/route";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";

const DEFAULTS = `shipping_fee_pk = 0, shipping_fee_de = 0, vat_rate_de_percent = 19,
  reservation_minutes = 30, contact_email = 'Luzanika@example.com', contact_address = 'Pak & Germany',
  customer_service_label = 'Customers Complaint Service', customer_service_phone = '(480) 555-0103',
  socials = '[{"name": "LinkedIn", "href": "https://www.linkedin.com"}, {"name": "X", "href": "https://x.com"}, {"name": "Facebook", "href": "https://www.facebook.com"}]'::jsonb`;

// Every test starts from the factory settings, and leaves them that way.
beforeEach(async () => {
  await exec(`UPDATE shop_settings SET ${DEFAULTS}`);
});
afterAll(async () => {
  await exec(`UPDATE shop_settings SET ${DEFAULTS}`);
});

const read = (staffCookie: string | undefined) =>
  call(getSettingsRoute, { method: "GET", staffCookie });
const change = (staffCookie: string | undefined, body: unknown) =>
  call(patchSettingsRoute, { method: "PATCH", staffCookie, body });

describe("who may see and change the settings", () => {
  it("needs a signed-in staff member", async () => {
    expect((await read(undefined)).status).toBe(401);
    expect((await change(undefined, { reservationMinutes: 20 })).status).toBe(
      401,
    );
  });

  it("lets someone who may only view read them, but not change them", async () => {
    const viewer = await signedInStaff({ permissions: ["settings.view"] });

    expect((await read(viewer.cookie)).status).toBe(200);
    const refused = await change(viewer.cookie, { reservationMinutes: 20 });
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");
  });

  it("refuses both to someone with other permissions only", async () => {
    const other = await signedInStaff({
      permissions: ["orders.view", "stock.adjust"],
    });

    expect((await read(other.cookie)).status).toBe(403);
    expect(
      (await change(other.cookie, { reservationMinutes: 20 })).status,
    ).toBe(403);
  });

  it("lets someone who may manage change them", async () => {
    const manager = await signedInStaff({ permissions: ["settings.manage"] });

    expect(
      (await change(manager.cookie, { reservationMinutes: 20 })).status,
    ).toBe(200);
    // Changing needs "manage", reading needs "view": they are separate.
    expect((await read(manager.cookie)).status).toBe(403);
  });
});

describe("reading and changing", () => {
  it("starts with the factory settings", async () => {
    const admin = await signedInStaff({ superAdmin: true });

    const result = await read(admin.cookie);

    expect(result.body.settings).toMatchObject({
      shippingFee: { PK: 0, DE: 0 },
      vatRateDePercent: 19,
      reservationMinutes: 30,
      contact: {
        email: "Luzanika@example.com",
        address: "Pak & Germany",
        customerServiceLabel: "Customers Complaint Service",
        customerServicePhone: "(480) 555-0103",
      },
    });
    expect(result.body.settings.socials).toHaveLength(3);
  });

  it("changes only what is sent", async () => {
    const admin = await signedInStaff({ superAdmin: true });

    const result = await change(admin.cookie, {
      shippingFee: { PK: 30000 },
      contact: { email: "hello@luzanika.com" },
    });

    expect(result.status).toBe(200);
    expect(result.body.settings).toMatchObject({
      shippingFee: { PK: 30000, DE: 0 },
      vatRateDePercent: 19,
      reservationMinutes: 30,
      contact: {
        email: "hello@luzanika.com",
        address: "Pak & Germany",
      },
    });
    expect((await read(admin.cookie)).body.settings.shippingFee.PK).toBe(30000);
  });

  it("sets every field, including social links", async () => {
    const admin = await signedInStaff({ superAdmin: true });

    const result = await change(admin.cookie, {
      shippingFee: { PK: 25000, DE: 690 },
      vatRateDePercent: 7.5,
      reservationMinutes: 45,
      contact: {
        email: "shop@luzanika.com",
        address: "Lahore & Berlin",
        customerServiceLabel: "Customer care",
        customerServicePhone: "+92 300 1234567",
      },
      socials: [{ name: "Instagram", href: "https://instagram.com/luzanika" }],
    });

    expect(result.body.settings).toMatchObject({
      shippingFee: { PK: 25000, DE: 690 },
      vatRateDePercent: 7.5,
      reservationMinutes: 45,
      contact: { customerServiceLabel: "Customer care" },
      socials: [{ name: "Instagram", href: "https://instagram.com/luzanika" }],
    });
  });

  it("refuses values that make no sense, and changes nothing when one is wrong", async () => {
    const admin = await signedInStaff({ superAdmin: true });
    const bad: Record<string, unknown>[] = [
      { shippingFee: { PK: -1 } },
      { shippingFee: { DE: 5.5 } },
      { shippingFee: { PK: 1_000_000_000 } },
      { shippingFee: { FR: 100 } },
      { vatRateDePercent: 51 },
      { vatRateDePercent: -1 },
      { vatRateDePercent: 19.999 },
      { reservationMinutes: 4 },
      { reservationMinutes: 1441 },
      { reservationMinutes: 10.5 },
      { contact: { email: "not-an-email" } },
      { contact: { customerServicePhone: "call me" } },
      { socials: [{ name: "X", href: "http://insecure.example" }] },
      { socials: [{ name: "X", href: "javascript:alert(1)" }] },
      {
        socials: Array.from({ length: 11 }, () => ({
          name: "X",
          href: "https://x.com",
        })),
      },
      { somethingElse: 1 },
      { shippingFee: "free" },
    ];

    for (const body of bad) {
      const result = await change(admin.cookie, body);
      expect(result.status, JSON.stringify(body)).toBe(400);
    }
    // A good field next to a bad one is not saved either.
    expect(
      (
        await change(admin.cookie, {
          shippingFee: { PK: 500 },
          reservationMinutes: 1,
        })
      ).status,
    ).toBe(400);
    expect((await read(admin.cookie)).body.settings.shippingFee.PK).toBe(0);
  });

  it("accepts a VAT rate of zero and free shipping", async () => {
    const admin = await signedInStaff({ superAdmin: true });
    await change(admin.cookie, {
      shippingFee: { PK: 500 },
      vatRateDePercent: 7,
    });

    const result = await change(admin.cookie, {
      shippingFee: { PK: 0 },
      vatRateDePercent: 0,
    });

    expect(result.status).toBe(200);
    expect(result.body.settings).toMatchObject({
      shippingFee: { PK: 0 },
      vatRateDePercent: 0,
    });
  });

  it("keeps both changes when two people save different fields at the same moment", async () => {
    const a = await signedInStaff({ superAdmin: true });
    const b = await signedInStaff({ superAdmin: true });

    const [first, second] = await Promise.all([
      change(a.cookie, { shippingFee: { PK: 111 } }),
      change(b.cookie, { shippingFee: { DE: 222 } }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await read(a.cookie)).body.settings.shippingFee).toEqual({
      PK: 111,
      DE: 222,
    });
  });

  it("can only ever have one settings row", async () => {
    await expect(
      exec("INSERT INTO shop_settings (id) VALUES (2)"),
    ).rejects.toThrow();
  });
});

describe("what the public site sees", () => {
  it("shows the new fee and VAT rule at once", async () => {
    const admin = await signedInStaff({ superAdmin: true });
    await change(admin.cookie, {
      shippingFee: { PK: 30000, DE: 590 },
      vatRateDePercent: 7,
    });

    const pk = await call(pricingRoute, {
      method: "GET",
      path: "/api/v1/checkout/pricing?market=PK",
    });
    const de = await call(pricingRoute, {
      method: "GET",
      path: "/api/v1/checkout/pricing?market=DE",
    });

    expect(pk.body).toMatchObject({
      shippingFee: 30000,
      taxIncluded: null,
      vatRatePercent: null,
    });
    expect(de.body).toMatchObject({
      shippingFee: 590,
      taxIncluded: true,
      vatRatePercent: 7,
    });
  });

  it("exposes only the contact details and social links, never fees or internals", async () => {
    const admin = await signedInStaff({ superAdmin: true });
    await change(admin.cookie, {
      shippingFee: { PK: 30000 },
      contact: { email: "hello@luzanika.com" },
    });

    const result = await call(publicSettingsRoute, { method: "GET" });

    expect(result.status).toBe(200);
    expect(result.body.contact).toMatchObject({ email: "hello@luzanika.com" });
    expect(result.body.socials).toHaveLength(3);
    expect(Object.keys(result.body).sort()).toEqual(["contact", "socials"]);
    expect(result.raw).not.toMatch(/shipping|vat|reservation|updated/i);
    expect(result.headers.get("cache-control")).toContain("public");
  });
});

describe("audit", () => {
  it("records who changed what, with before and after, and the person who saved it", async () => {
    const admin = await signedInStaff({ superAdmin: true });
    await change(admin.cookie, { shippingFee: { PK: 30000 } });

    const [row] = await sql<{
      staff_email: string;
      before: { shippingFee: { PK: number } };
      after: { shippingFee: { PK: number } };
    }>(
      "SELECT staff_email, before, after FROM audit_log WHERE action = 'settings.update' ORDER BY id DESC LIMIT 1",
    );
    expect(row.staff_email).toBe(admin.email);
    expect(row.before.shippingFee.PK).toBe(0);
    expect(row.after.shippingFee.PK).toBe(30000);

    const [saved] = await sql<{ updated_by: string }>(
      "SELECT updated_by FROM shop_settings",
    );
    expect(saved.updated_by).toBe(admin.id);
  });
});
