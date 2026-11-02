import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  GET as listRoute,
  POST as createRoute,
} from "@/app/api/v1/admin/products/route";
import {
  DELETE as deleteRoute,
  GET as getRoute,
  PATCH as patchRoute,
} from "@/app/api/v1/admin/products/[id]/route";
import { POST as addImageRoute } from "@/app/api/v1/admin/products/[id]/images/route";
import { PUT as orderImagesRoute } from "@/app/api/v1/admin/products/[id]/images/order/route";
import {
  DELETE as deleteImageRoute,
  PATCH as patchImageRoute,
} from "@/app/api/v1/admin/products/[id]/images/[imageId]/route";
import { PUT as pricesRoute } from "@/app/api/v1/admin/products/[id]/prices/route";
import { POST as restoreRoute } from "@/app/api/v1/admin/products/[id]/restore/route";
import { PUT as sectionsRoute } from "@/app/api/v1/admin/products/[id]/sections/route";
import { POST as addVariantRoute } from "@/app/api/v1/admin/products/[id]/variants/route";
import { PATCH as patchVariantRoute } from "@/app/api/v1/admin/variants/[id]/route";
import { GET as mediaRoute } from "@/app/api/v1/media/products/[file]/route";
import { GET as shopProductRoute } from "@/app/api/v1/products/[slug]/route";
import { setStorage } from "@/server/storage";
import { LocalDiskStorage } from "@/server/storage/local-disk-storage";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import { importCatalog } from "./shop-helpers";

let uploadsDir: string;
let storage: LocalDiskStorage;

beforeAll(async () => {
  await importCatalog();
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), "luzanika-products-"));
  storage = new LocalDiskStorage(uploadsDir);
  setStorage(storage);
});
afterAll(async () => {
  setStorage(undefined);
  await rm(uploadsDir, { recursive: true, force: true });
});

// Everything these tests create has a "t8-" slug and is removed again.
beforeEach(() => setStorage(storage));
afterEach(async () => {
  await exec(
    "DELETE FROM stock_movements WHERE variant_id IN (SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.slug LIKE 't8-%')",
  );
  await exec("DELETE FROM products WHERE slug LIKE 't8-%'");
});

const manager = () =>
  signedInStaff({ permissions: ["products.view", "products.manage"] });
const viewer = () => signedInStaff({ permissions: ["products.view"] });

type Cookie = string | undefined;
const list = (staffCookie: Cookie, query = "") =>
  call(listRoute, {
    method: "GET",
    staffCookie,
    path: `/api/v1/admin/products${query}`,
  });
const create = (staffCookie: Cookie, body: unknown) =>
  call(createRoute, { method: "POST", staffCookie, body });
const read = (staffCookie: Cookie, id: string) =>
  call(getRoute, { method: "GET", staffCookie, params: { id } });
const patch = (staffCookie: Cookie, id: string, body: unknown) =>
  call(patchRoute, { method: "PATCH", staffCookie, params: { id }, body });
const remove = (staffCookie: Cookie, id: string) =>
  call(deleteRoute, { method: "DELETE", staffCookie, params: { id } });
const restore = (staffCookie: Cookie, id: string) =>
  call(restoreRoute, { method: "POST", staffCookie, params: { id } });
const setPrices = (staffCookie: Cookie, id: string, body: unknown) =>
  call(pricesRoute, { method: "PUT", staffCookie, params: { id }, body });
const addVariant = (staffCookie: Cookie, id: string, body: unknown) =>
  call(addVariantRoute, { method: "POST", staffCookie, params: { id }, body });
const setSections = (staffCookie: Cookie, id: string, body: unknown) =>
  call(sectionsRoute, { method: "PUT", staffCookie, params: { id }, body });
const shopPage = (slug: string) =>
  call(shopProductRoute, { method: "GET", params: { slug } });

/** A draft product, ready to be put on sale once it has a price and a variant. */
async function newProduct(cookie: string, name = "T8 Linen Shirt") {
  const result = await create(cookie, { name });
  expect(result.status).toBe(201);
  return result.body.product as { id: string; slug: string };
}

/** A product that is on sale in both markets. */
async function liveProduct(cookie: string, name = "T8 Live Shirt") {
  const product = await newProduct(cookie, name);
  expect(
    (
      await setPrices(cookie, product.id, {
        PK: { amount: 500_000 },
        DE: { amount: 4_900 },
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await addVariant(cookie, product.id, {
        sku: `T8-${product.slug}-M`,
        sizeLabel: "M",
        stock: { PK: 10, DE: 10 },
      })
    ).status,
  ).toBe(201);
  const activated = await patch(cookie, product.id, { status: "active" });
  expect(activated.status).toBe(200);
  return product;
}

describe("who may see and change products", () => {
  it("needs a signed-in staff member", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    const results = await Promise.all([
      list(undefined),
      create(undefined, { name: "T8 Nope" }),
      read(undefined, id),
      patch(undefined, id, { name: "x" }),
      remove(undefined, id),
      restore(undefined, id),
      setPrices(undefined, id, { PK: null }),
      addVariant(undefined, id, { sku: "T8-X" }),
      setSections(undefined, id, { sections: [] }),
    ]);
    for (const result of results) expect(result.status).toBe(401);
  });

  it("lets viewing, changing and deleting be given separately", async () => {
    const seeOnly = await viewer();
    const changer = await manager();
    const product = await newProduct(changer.cookie);

    expect((await list(seeOnly.cookie)).status).toBe(200);
    expect((await read(seeOnly.cookie, product.id)).status).toBe(200);

    const refusals = await Promise.all([
      create(seeOnly.cookie, { name: "T8 Nope" }),
      patch(seeOnly.cookie, product.id, { name: "T8 Nope" }),
      setPrices(seeOnly.cookie, product.id, { PK: null }),
      addVariant(seeOnly.cookie, product.id, { sku: "T8-X" }),
      setSections(seeOnly.cookie, product.id, { sections: [] }),
    ]);
    for (const result of refusals) expect(result.status).toBe(403);

    // Changing is not deleting.
    expect((await remove(changer.cookie, product.id)).status).toBe(403);
    const deleter = await signedInStaff({
      permissions: ["products.view", "products.delete"],
    });
    expect((await remove(deleter.cookie, product.id)).status).toBe(200);
    // Restoring goes with deleting, not with changing.
    expect((await restore(changer.cookie, product.id)).status).toBe(403);
    expect((await restore(deleter.cookie, product.id)).status).toBe(200);
  });

  it("answers 404 for an id that is not one", async () => {
    const staff = await manager();
    expect((await read(staff.cookie, "not-an-id")).status).toBe(404);
    expect(
      (await read(staff.cookie, "00000000-0000-4000-8000-000000000000")).status,
    ).toBe(404);
  });
});

describe("creating and editing a product", () => {
  it("starts as a draft with a slug made from the name", async () => {
    const staff = await manager();
    const result = await create(staff.cookie, {
      name: "T8 Linen Shirt",
      tagline: "Light and cool",
      notes: ["Hand wash"],
    });

    expect(result.status).toBe(201);
    expect(result.headers.get("location")).toMatch(
      /^\/api\/v1\/admin\/products\/[0-9a-f-]{36}$/,
    );
    expect(result.body.product).toMatchObject({
      slug: "t8-linen-shirt",
      name: "T8 Linen Shirt",
      status: "draft",
      listed: true,
      tagline: "Light and cool",
      notes: ["Hand wash"],
      variants: [],
      images: [],
      prices: { PK: null, DE: null },
      deletedAt: null,
    });
  });

  it("gives a second product with the same name a new slug, but never changes a slug someone chose", async () => {
    const staff = await manager();
    const first = await create(staff.cookie, { name: "T8 Twin" });
    const second = await create(staff.cookie, { name: "T8 Twin" });
    expect(first.body.product.slug).toBe("t8-twin");
    expect(second.body.product.slug).toBe("t8-twin-2");

    const taken = await create(staff.cookie, {
      name: "T8 Other",
      slug: "t8-twin",
    });
    expect(taken.status).toBe(409);
    expect(taken.body.error.fields.slug).toBeTruthy();
  });

  it("refuses an empty name, unknown fields and a category that does not exist", async () => {
    const staff = await manager();
    expect((await create(staff.cookie, { name: "  " })).status).toBe(400);
    expect(
      (await create(staff.cookie, { name: "T8 X", colour: "red" })).status,
    ).toBe(400);
    const missing = await create(staff.cookie, {
      name: "T8 X",
      categoryId: "00000000-0000-4000-8000-000000000000",
    });
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields.categoryId).toBeTruthy();
  });

  it("changes the details, and a slug that is taken is refused", async () => {
    const staff = await manager();
    const a = await newProduct(staff.cookie, "T8 Alpha");
    const b = await newProduct(staff.cookie, "T8 Beta");

    const changed = await patch(staff.cookie, a.id, {
      name: "T8 Alpha Two",
      isNew: true,
      badge: { label: "Limited", tone: "dark" },
      availability: "pre-order",
    });
    expect(changed.status).toBe(200);
    expect(changed.body.product).toMatchObject({
      name: "T8 Alpha Two",
      isNew: true,
      badge: { label: "Limited", tone: "dark" },
      availability: "pre-order",
    });

    const clash = await patch(staff.cookie, b.id, { slug: a.slug });
    expect(clash.status).toBe(409);
    // Keeping its own slug is fine.
    expect((await patch(staff.cookie, b.id, { slug: b.slug })).status).toBe(
      200,
    );
  });

  it("only goes on sale with a price and an active variant", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie, "T8 Not Ready");

    const early = await patch(staff.cookie, product.id, { status: "active" });
    expect(early.status).toBe(409);

    await setPrices(staff.cookie, product.id, { PK: { amount: 100_000 } });
    expect(
      (await patch(staff.cookie, product.id, { status: "active" })).status,
    ).toBe(409);

    await addVariant(staff.cookie, product.id, {
      sku: "T8-NOT-READY-1",
      stock: { PK: 3 },
    });
    const live = await patch(staff.cookie, product.id, { status: "active" });
    expect(live.status).toBe(200);
    expect(live.body.product.status).toBe("active");
  });

  it("writes who changed what to the audit log", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie, "T8 Audited");
    await patch(staff.cookie, product.id, { name: "T8 Audited Two" });

    const rows = await sql<{
      action: string;
      staff_email: string;
      before: { name?: string } | null;
      after: { name?: string };
    }>(
      "SELECT action, staff_email, before, after FROM audit_log WHERE entity_type = 'product' AND entity_id = :id ORDER BY id",
      { id: product.id },
    );
    expect(rows.map((row) => row.action)).toEqual([
      "products.create",
      "products.update",
    ]);
    expect(rows[1].staff_email).toBe(staff.email);
    expect(rows[1].before?.name).toBe("T8 Audited");
    expect(rows[1].after.name).toBe("T8 Audited Two");
  });
});

describe("prices", () => {
  it("sets a price per market, keeps a market left out, and removes one with null", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);

    const both = await setPrices(staff.cookie, product.id, {
      PK: { amount: 500_000, compareAtAmount: 600_000 },
      DE: { amount: 4_900 },
    });
    expect(both.status).toBe(200);
    expect(both.body.product.prices).toEqual({
      PK: { amount: 500_000, compareAtAmount: 600_000 },
      DE: { amount: 4_900, compareAtAmount: null },
    });

    const onlyDe = await setPrices(staff.cookie, product.id, {
      DE: { amount: 5_500 },
    });
    expect(onlyDe.body.product.prices.PK.amount).toBe(500_000);
    expect(onlyDe.body.product.prices.DE.amount).toBe(5_500);

    const removed = await setPrices(staff.cookie, product.id, { PK: null });
    expect(removed.body.product.prices.PK).toBeNull();
    expect(removed.body.product.prices.DE.amount).toBe(5_500);
  });

  it("refuses an old price that is not higher, a fraction and an empty request", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const cases = [
      { PK: { amount: 1000, compareAtAmount: 1000 } },
      { PK: { amount: 10.5 } },
      { PK: { amount: -1 } },
      {},
    ];
    for (const body of cases) {
      expect((await setPrices(staff.cookie, product.id, body)).status).toBe(
        400,
      );
    }
  });

  it("shows on the shop page once the product is on sale", async () => {
    const staff = await manager();
    const product = await liveProduct(staff.cookie, "T8 Priced Shirt");
    const page = await shopPage(product.slug);
    expect(page.status).toBe(200);
    expect(page.body.name).toBe("T8 Priced Shirt");
  });
});

describe("variants", () => {
  it("adds a variant with starting stock in each market", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const result = await addVariant(staff.cookie, product.id, {
      sku: "T8-SHIRT-RED-M",
      colorName: "Red",
      colorHex: "#cc0000",
      sizeLabel: "M",
      stock: { PK: 12, DE: 4 },
    });

    expect(result.status).toBe(201);
    const [variant] = result.body.product.variants;
    expect(variant).toMatchObject({
      sku: "T8-SHIRT-RED-M",
      color: { name: "Red", hex: "#cc0000" },
      size: "M",
      active: true,
    });
    expect(variant.stock.PK).toEqual({
      onHand: 12,
      reserved: 0,
      available: 12,
    });
    expect(variant.stock.DE).toEqual({ onHand: 4, reserved: 0, available: 4 });

    const movements = await sql(
      "SELECT market, delta FROM stock_movements WHERE variant_id = :id ORDER BY market",
      { id: variant.id },
    );
    expect(movements).toHaveLength(2);
  });

  it("refuses a SKU that is taken, the same colour and size twice, and a colour without its code", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const base = {
      sku: "T8-DUP-1",
      colorName: "Blue",
      colorHex: "#0000cc",
      sizeLabel: "S",
    };
    expect((await addVariant(staff.cookie, product.id, base)).status).toBe(201);

    const sameSku = await addVariant(staff.cookie, product.id, {
      ...base,
      sizeLabel: "L",
    });
    expect(sameSku.status).toBe(409);
    expect(sameSku.body.error.fields.sku).toBeTruthy();

    const sameCombination = await addVariant(staff.cookie, product.id, {
      ...base,
      sku: "T8-DUP-2",
    });
    expect(sameCombination.status).toBe(409);

    const halfColour = await addVariant(staff.cookie, product.id, {
      sku: "T8-DUP-3",
      colorName: "Green",
    });
    expect(halfColour.status).toBe(400);
  });

  it("deactivates a variant instead of removing it, and keeps its stock record", async () => {
    const staff = await manager();
    const product = await liveProduct(staff.cookie);
    await addVariant(staff.cookie, product.id, {
      sku: "T8-SECOND-VARIANT",
      sizeLabel: "L",
      stock: { PK: 5 },
    });
    const [variant] = (await read(staff.cookie, product.id)).body.product
      .variants;
    const deactivate = () =>
      call(patchVariantRoute, {
        method: "PATCH",
        staffCookie: staff.cookie,
        params: { id: variant.id },
        body: { active: false },
      });

    const off = await deactivate();
    expect(off.status).toBe(200);
    const after = off.body.product.variants.find(
      (item: { id: string }) => item.id === variant.id,
    );
    expect(after.active).toBe(false);
    expect(after.stock.PK.onHand).toBe(10);
  });

  it("will not switch off the last active variant of a product that is on sale", async () => {
    const staff = await manager();
    const product = await liveProduct(staff.cookie);
    const [variant] = (await read(staff.cookie, product.id)).body.product
      .variants;

    const refused = await call(patchVariantRoute, {
      method: "PATCH",
      staffCookie: staff.cookie,
      params: { id: variant.id },
      body: { active: false },
    });
    expect(refused.status).toBe(409);

    // Taken off sale first, it can.
    await patch(staff.cookie, product.id, { status: "draft" });
    const allowed = await call(patchVariantRoute, {
      method: "PATCH",
      staffCookie: staff.cookie,
      params: { id: variant.id },
      body: { active: false },
    });
    expect(allowed.status).toBe(200);
  });
});

describe("detail sections", () => {
  it("replaces the cards with exactly these, in this order", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);

    const first = await setSections(staff.cookie, product.id, {
      sections: [
        { title: "Description", body: "Soft linen." },
        { title: "Care", body: "Wash cold." },
      ],
    });
    expect(first.body.product.sections).toEqual([
      { title: "Description", body: "Soft linen." },
      { title: "Care", body: "Wash cold." },
    ]);

    const swapped = await setSections(staff.cookie, product.id, {
      sections: [{ title: "Care", body: "Wash cold." }],
    });
    expect(swapped.body.product.sections).toEqual([
      { title: "Care", body: "Wash cold." },
    ]);

    expect(
      (
        await setSections(staff.cookie, product.id, {
          sections: [{ title: "" }],
        })
      ).status,
    ).toBe(400);
  });
});

describe("deleting and restoring", () => {
  it("hides a deleted product from the shop and keeps it, and restoring brings it back as a draft", async () => {
    const staff = await signedInStaff({
      permissions: ["products.view", "products.manage", "products.delete"],
    });
    const product = await liveProduct(staff.cookie, "T8 Gone Shirt");
    expect((await shopPage(product.slug)).status).toBe(200);

    const removed = await remove(staff.cookie, product.id);
    expect(removed.status).toBe(200);
    expect(removed.body.product.deletedAt).toEqual(expect.any(String));
    expect((await shopPage(product.slug)).status).toBe(404);
    expect((await read(staff.cookie, product.id)).status).toBe(200);

    // A deleted product cannot be changed, and cannot be deleted twice.
    expect((await patch(staff.cookie, product.id, { name: "x" })).status).toBe(
      409,
    );
    expect((await remove(staff.cookie, product.id)).status).toBe(409);

    const back = await restore(staff.cookie, product.id);
    expect(back.status).toBe(200);
    expect(back.body.product).toMatchObject({
      deletedAt: null,
      status: "draft",
    });
    expect((await shopPage(product.slug)).status).toBe(404);
    expect((await restore(staff.cookie, product.id)).status).toBe(409);
  });
});

describe("the product list", () => {
  it("searches by name, filters by status, and lists deleted products only when asked", async () => {
    const staff = await signedInStaff({
      permissions: ["products.view", "products.manage", "products.delete"],
    });
    const live = await liveProduct(staff.cookie, "T8 Listed Live");
    const draft = await newProduct(staff.cookie, "T8 Listed Draft");
    const gone = await newProduct(staff.cookie, "T8 Listed Gone");
    await remove(staff.cookie, gone.id);

    const ids = async (query: string) =>
      ((await list(staff.cookie, query)).body.items as { id: string }[]).map(
        (item) => item.id,
      );

    expect(await ids("?search=T8%20Listed")).toEqual(
      expect.arrayContaining([live.id, draft.id]),
    );
    expect(await ids("?search=T8%20Listed")).not.toContain(gone.id);
    expect(await ids("?search=T8%20Listed&status=active")).toEqual([live.id]);
    expect(await ids("?search=T8%20Listed&deleted=only")).toEqual([gone.id]);
    expect(await ids("?search=T8%20Listed&deleted=include")).toHaveLength(3);
    expect(await ids("?search=T8-LIVE-NOPE")).toEqual([]);

    const row = (await list(staff.cookie, "?search=T8%20Listed%20Live")).body
      .items[0];
    expect(row).toMatchObject({
      name: "T8 Listed Live",
      status: "active",
      variantCount: 1,
      prices: { PK: { amount: 500_000 }, DE: { amount: 4_900 } },
      available: { PK: 10, DE: 10 },
    });
  });

  it("pages the results and refuses a page size that is too large", async () => {
    const staff = await manager();
    expect((await list(staff.cookie, "?pageSize=1")).body.items).toHaveLength(
      1,
    );
    expect((await list(staff.cookie, "?pageSize=1000")).status).toBe(400);
  });
});

// ------------------------------------------------------------------- photos

async function picture(
  width = 800,
  height = 600,
  format: "jpeg" | "png" | "webp" | "gif" = "jpeg",
) {
  return sharp({
    create: { width, height, channels: 3, background: "#336699" },
  })
    [format]()
    .toBuffer();
}

function photoForm(bytes: Buffer, name = "shirt.jpg", type = "image/jpeg") {
  const form = new FormData();
  form.set("photo", new File([new Uint8Array(bytes)], name, { type }));
  return form;
}

const upload = (staffCookie: Cookie, id: string, bytes: Buffer) =>
  call(addImageRoute, {
    method: "POST",
    staffCookie,
    params: { id },
    form: photoForm(bytes),
  });

const fileOf = (src: string) => src.replace("/api/v1/media/products/", "");

describe("product photos", () => {
  it("shrinks an upload to WebP of at most 1600 px and adds it as the last photo", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie, "T8 Photo Shirt");

    const result = await upload(
      staff.cookie,
      product.id,
      await picture(3200, 2400),
    );
    expect(result.status).toBe(201);
    const [image] = result.body.product.images;
    expect(image).toMatchObject({
      alt: "T8 Photo Shirt",
      sort: 0,
      position: null,
    });
    expect(image.src).toMatch(
      /^\/api\/v1\/media\/products\/[0-9a-f]{32}\.webp$/,
    );

    const stored = await storage.get(`products/${fileOf(image.src)}`);
    const meta = await sharp(stored!.bytes).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 1600, height: 1200 });

    const second = await upload(
      staff.cookie,
      product.id,
      await picture(500, 500, "png"),
    );
    expect(
      second.body.product.images.map((item: { sort: number }) => item.sort),
    ).toEqual([0, 1]);
    const small = await storage.get(
      `products/${fileOf(second.body.product.images[1].src)}`,
    );
    // A small picture is not enlarged.
    expect(await sharp(small!.bytes).metadata()).toMatchObject({
      width: 500,
      height: 500,
    });
  });

  it("serves the photo to anyone, cached for a year, and nothing else from that folder", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const added = await upload(staff.cookie, product.id, await picture());
    const file = fileOf(added.body.product.images[0].src);

    const served = await call(mediaRoute, {
      method: "GET",
      params: { file },
    });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/webp");
    expect(served.headers.get("cache-control")).toMatch(/public.*immutable/);
    expect(await sharp(served.bytes).metadata()).toMatchObject({
      format: "webp",
    });

    for (const bad of [
      "../avatars/x.webp",
      "..%2Favatars%2Fx.webp",
      "x.webp",
      `${"0".repeat(32)}.webp`,
      `${file}.png`,
    ]) {
      expect(
        (await call(mediaRoute, { method: "GET", params: { file: bad } }))
          .status,
      ).toBe(404);
    }
  });

  it("shows the photo on the shop page", async () => {
    const staff = await manager();
    const product = await liveProduct(staff.cookie, "T8 Shop Photo");
    const added = await upload(staff.cookie, product.id, await picture());
    const src = added.body.product.images[0].src;

    const page = await shopPage(product.slug);
    expect(JSON.stringify(page.body)).toContain(src);
  });

  it("rejects what is not a picture, whatever it says it is", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);

    const notAnImage = await call(addImageRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { id: product.id },
      form: photoForm(Buffer.from("<script>alert(1)</script>"), "x.jpg"),
    });
    expect(notAnImage.status).toBe(400);
    expect(notAnImage.body.error.fields.photo).toBeTruthy();

    const gif = await upload(
      staff.cookie,
      product.id,
      await picture(50, 50, "gif"),
    );
    expect(gif.status).toBe(400);

    const noFile = await call(addImageRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { id: product.id },
      form: new FormData(),
    });
    expect(noFile.status).toBe(400);

    const json = await call(addImageRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { id: product.id },
      body: { photo: "x" },
    });
    expect(json.status).toBe(415);

    expect((await read(staff.cookie, product.id)).body.product.images).toEqual(
      [],
    );
  });

  it("refuses an upload over 8 MB", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const big = Buffer.alloc(8 * 1024 * 1024 + 1024, 1);
    expect((await upload(staff.cookie, product.id, big)).status).toBe(413);
  });

  it("allows at most 10 photos and leaves no stray file behind when it refuses", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const bytes = await picture(100, 100);
    for (let n = 0; n < 10; n++) {
      expect((await upload(staff.cookie, product.id, bytes)).status).toBe(201);
    }

    const filesBefore = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM product_images WHERE product_id = :id",
      { id: product.id },
    );
    expect(Number(filesBefore[0].n)).toBe(10);

    const eleventh = await upload(staff.cookie, product.id, bytes);
    expect(eleventh.status).toBe(409);

    const detail = (await read(staff.cookie, product.id)).body.product;
    expect(detail.images).toHaveLength(10);
    for (const image of detail.images) {
      expect(await storage.get(`products/${fileOf(image.src)}`)).not.toBeNull();
    }
  });

  it("changes the description and focus point of a photo", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const added = await upload(staff.cookie, product.id, await picture());
    const imageId = added.body.product.images[0].id;
    const edit = (body: unknown) =>
      call(patchImageRoute, {
        method: "PATCH",
        staffCookie: staff.cookie,
        params: { id: product.id, imageId },
        body,
      });

    const changed = await edit({ alt: "Front view", position: "center top" });
    expect(changed.status).toBe(200);
    expect(changed.body.product.images[0]).toMatchObject({
      alt: "Front view",
      position: "center top",
    });

    // Only what is sent changes; null clears the focus point.
    const cleared = await edit({ position: null });
    expect(cleared.body.product.images[0]).toMatchObject({
      alt: "Front view",
      position: null,
    });

    expect((await edit({})).status).toBe(400);
    expect((await edit({ alt: "" })).status).toBe(400);
    expect((await edit({ position: "url(javascript:1)" })).status).toBe(400);
    expect(
      (
        await call(patchImageRoute, {
          method: "PATCH",
          staffCookie: staff.cookie,
          params: {
            id: product.id,
            imageId: "00000000-0000-4000-8000-000000000000",
          },
          body: { alt: "x" },
        })
      ).status,
    ).toBe(404);
  });

  it("puts the photos in a new order, in one request", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const bytes = await picture(100, 100);
    let last = await upload(staff.cookie, product.id, bytes);
    for (let n = 0; n < 2; n++) {
      last = await upload(staff.cookie, product.id, bytes);
    }
    const ids = (last.body.product.images as { id: string }[]).map(
      (image) => image.id,
    );
    const order = (body: unknown) =>
      call(orderImagesRoute, {
        method: "PUT",
        staffCookie: staff.cookie,
        params: { id: product.id },
        body,
      });

    const reversed = [...ids].reverse();
    const result = await order({ ids: reversed });
    expect(result.status).toBe(200);
    expect(
      result.body.product.images.map((image: { id: string }) => image.id),
    ).toEqual(reversed);
    expect(
      result.body.product.images.map((image: { sort: number }) => image.sort),
    ).toEqual([0, 1, 2]);

    // It must list every photo, once each, and only this product's.
    expect((await order({ ids: ids.slice(0, 2) })).status).toBe(400);
    expect((await order({ ids: [...ids, ids[0]] })).status).toBe(400);
    expect(
      (
        await order({
          ids: [ids[0], ids[1], "00000000-0000-4000-8000-000000000000"],
        })
      ).status,
    ).toBe(400);
  });

  it("removes a photo and its file, and closes the gap", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const bytes = await picture(100, 100);
    await upload(staff.cookie, product.id, bytes);
    await upload(staff.cookie, product.id, bytes);
    const both = (await upload(staff.cookie, product.id, bytes)).body.product
      .images as { id: string; src: string }[];

    const result = await call(deleteImageRoute, {
      method: "DELETE",
      staffCookie: staff.cookie,
      params: { id: product.id, imageId: both[0].id },
    });
    expect(result.status).toBe(200);
    expect(
      result.body.product.images.map((image: { id: string }) => image.id),
    ).toEqual([both[1].id, both[2].id]);
    expect(
      result.body.product.images.map((image: { sort: number }) => image.sort),
    ).toEqual([0, 1]);
    expect(await storage.get(`products/${fileOf(both[0].src)}`)).toBeNull();
    expect(await storage.get(`products/${fileOf(both[1].src)}`)).not.toBeNull();

    const again = await call(deleteImageRoute, {
      method: "DELETE",
      staffCookie: staff.cookie,
      params: { id: product.id, imageId: both[0].id },
    });
    expect(again.status).toBe(404);
  });

  it("removes a sample photo from the product without touching any file", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const [row] = await sql<{ id: string }>(
      "INSERT INTO product_images (product_id, src, alt, sort) VALUES (:id, '/images/hero.png', 'Sample', 0) RETURNING id",
      { id: product.id },
    );

    const result = await call(deleteImageRoute, {
      method: "DELETE",
      staffCookie: staff.cookie,
      params: { id: product.id, imageId: row.id },
    });
    expect(result.status).toBe(200);
    expect(result.body.product.images).toEqual([]);
  });

  it("will not take a photo from another product or for a deleted one", async () => {
    const staff = await signedInStaff({
      permissions: ["products.view", "products.manage", "products.delete"],
    });
    const a = await newProduct(staff.cookie, "T8 First");
    const b = await newProduct(staff.cookie, "T8 Second");
    const photo = (await upload(staff.cookie, a.id, await picture(100, 100)))
      .body.product.images[0];

    const crossed = await call(deleteImageRoute, {
      method: "DELETE",
      staffCookie: staff.cookie,
      params: { id: b.id, imageId: photo.id },
    });
    expect(crossed.status).toBe(404);
    expect((await read(staff.cookie, a.id)).body.product.images).toHaveLength(
      1,
    );

    await remove(staff.cookie, a.id);
    expect(
      (await upload(staff.cookie, a.id, await picture(100, 100))).status,
    ).toBe(409);
  });

  it("is only for staff who may change products", async () => {
    const changer = await manager();
    const seeOnly = await viewer();
    const product = await newProduct(changer.cookie);
    const bytes = await picture(100, 100);
    const added = await upload(changer.cookie, product.id, bytes);
    const imageId = added.body.product.images[0].id;

    expect((await upload(undefined, product.id, bytes)).status).toBe(401);
    expect((await upload(seeOnly.cookie, product.id, bytes)).status).toBe(403);
    expect(
      (
        await call(patchImageRoute, {
          method: "PATCH",
          staffCookie: seeOnly.cookie,
          params: { id: product.id, imageId },
          body: { alt: "x" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(deleteImageRoute, {
          method: "DELETE",
          staffCookie: seeOnly.cookie,
          params: { id: product.id, imageId },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(orderImagesRoute, {
          method: "PUT",
          staffCookie: seeOnly.cookie,
          params: { id: product.id },
          body: { ids: [imageId] },
        })
      ).status,
    ).toBe(403);
  });

  it("writes every photo change to the audit log", async () => {
    const staff = await manager();
    const product = await newProduct(staff.cookie);
    const added = await upload(
      staff.cookie,
      product.id,
      await picture(100, 100),
    );
    const imageId = added.body.product.images[0].id;
    await call(patchImageRoute, {
      method: "PATCH",
      staffCookie: staff.cookie,
      params: { id: product.id, imageId },
      body: { alt: "New text" },
    });
    await call(deleteImageRoute, {
      method: "DELETE",
      staffCookie: staff.cookie,
      params: { id: product.id, imageId },
    });

    const rows = await sql<{ action: string }>(
      "SELECT action FROM audit_log WHERE entity_type = 'product' AND entity_id = :id AND action LIKE 'products.image%' ORDER BY id",
      { id: product.id },
    );
    expect(rows.map((row) => row.action)).toEqual([
      "products.image_add",
      "products.image_update",
      "products.image_remove",
    ]);
  });
});
