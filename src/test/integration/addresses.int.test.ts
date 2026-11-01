import { describe, expect, it } from "vitest";

import { DELETE as deleteAccount } from "@/app/api/v1/account/route";
import {
  GET as listRoute,
  POST as createRoute,
} from "@/app/api/v1/addresses/route";
import { PUT as defaultRoute } from "@/app/api/v1/addresses/[id]/default/route";
import {
  DELETE as deleteRoute,
  PATCH as patchRoute,
} from "@/app/api/v1/addresses/[id]/route";
import { POST as register } from "@/app/api/v1/auth/register/route";

import { call, newIp, sql, uniqueEmail } from "./helpers";

const PASSWORD = "Sup3r-secret-pw";

async function signUp() {
  const result = await call(register, {
    body: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: uniqueEmail(),
      password: PASSWORD,
    },
  });
  return { cookie: result.cookie as string, id: result.body.user.id as string };
}

const home = {
  fullName: "Ada Lovelace",
  phone: "+49 170 1234567",
  country: "Germany",
  city: "Berlin",
  address: "Unter den Linden 1",
  zip: "10117",
};
const office = {
  fullName: "Ada at Work",
  phone: "0300 1234567",
  country: "Pakistan",
  city: "Lahore",
  address: "MM Alam Road 5",
  zip: "54000",
};

const list = (cookie: string | undefined, ip?: string) =>
  call(listRoute, { method: "GET", cookie, ip });
const create = (cookie: string | undefined, body: unknown, ip?: string) =>
  call(createRoute, { method: "POST", cookie, body, ip });
const patch = (cookie: string | undefined, id: string, body: unknown) =>
  call(patchRoute, { method: "PATCH", cookie, body, params: { id } });
const remove = (cookie: string | undefined, id: string) =>
  call(deleteRoute, { method: "DELETE", cookie, params: { id } });
const makeDefault = (cookie: string | undefined, id: string) =>
  call(defaultRoute, { method: "PUT", cookie, params: { id } });

const defaultsOf = (items: { isDefault: boolean }[]) =>
  items.filter((item) => item.isDefault).length;

describe("authentication", () => {
  it("every address endpoint needs a signed-in customer", async () => {
    const id = crypto.randomUUID();
    const results = await Promise.all([
      list(undefined),
      create(undefined, home),
      patch(undefined, id, { city: "X" }),
      remove(undefined, id),
      makeDefault(undefined, id),
    ]);
    for (const result of results) {
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe("unauthenticated");
    }
  });
});

describe("saving addresses", () => {
  it("starts empty, and the first address saved becomes the default", async () => {
    const { cookie } = await signUp();
    expect((await list(cookie)).body).toEqual({ items: [] });

    const result = await create(cookie, home);
    expect(result.status).toBe(201);
    expect(result.body.address).toMatchObject({ ...home, isDefault: true });
    expect(result.body.address.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.headers.get("location")).toBe(
      `/api/v1/addresses/${result.body.address.id}`,
    );
    expect(result.body.items).toHaveLength(1);
  });

  it("a later address is not the default unless asked", async () => {
    const { cookie } = await signUp();
    await create(cookie, home);
    const second = await create(cookie, office);

    expect(second.body.address.isDefault).toBe(false);
    expect(defaultsOf(second.body.items)).toBe(1);
    expect(
      second.body.items.find((a: { isDefault: boolean }) => a.isDefault)
        .fullName,
    ).toBe("Ada Lovelace");
  });

  it("asking for the default moves it from the old one", async () => {
    const { cookie } = await signUp();
    await create(cookie, home);
    const second = await create(cookie, { ...office, isDefault: true });

    expect(second.body.address.isDefault).toBe(true);
    expect(defaultsOf(second.body.items)).toBe(1);
    expect(second.body.items[0].isDefault).toBe(false);
  });

  it("lists addresses in the order they were added", async () => {
    const { cookie } = await signUp();
    await create(cookie, home);
    await create(cookie, office);
    await create(cookie, { ...home, fullName: "Third" });
    const names = (await list(cookie)).body.items.map(
      (a: { fullName: string }) => a.fullName,
    );
    expect(names).toEqual(["Ada Lovelace", "Ada at Work", "Third"]);
  });

  it("trims what is saved", async () => {
    const { cookie } = await signUp();
    const result = await create(cookie, {
      ...home,
      fullName: "  Ada  ",
      zip: " 10117 ",
    });
    expect(result.body.address).toMatchObject({
      fullName: "Ada",
      zip: "10117",
    });
  });

  it("validates every field and reports each one", async () => {
    const { cookie } = await signUp();
    const result = await create(cookie, {
      fullName: "",
      phone: "123",
      country: "x".repeat(61),
      city: "Berlin\u0000",
      address: "",
      zip: "1234567890123",
    });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("validation_failed");
    expect(Object.keys(result.body.error.fields).sort()).toEqual([
      "address",
      "city",
      "country",
      "fullName",
      "phone",
      "zip",
    ]);
  });

  it("refuses missing fields, wrong types and fields it does not know", async () => {
    const { cookie } = await signUp();
    expect((await create(cookie, { fullName: "A" })).status).toBe(400);
    expect((await create(cookie, { ...home, isDefault: "yes" })).status).toBe(
      400,
    );
    for (const extra of [
      { customerId: crypto.randomUUID() },
      { id: crypto.randomUUID() },
      { createdAt: "2020-01-01" },
    ]) {
      expect(
        (await create(cookie, { ...home, ...extra })).status,
        JSON.stringify(extra),
      ).toBe(400);
    }
    expect((await list(cookie)).body.items).toHaveLength(0);
  });

  it("stores text safely: quotes, scripts and SQL are only data", async () => {
    const { cookie, id } = await signUp();
    const result = await create(cookie, {
      ...home,
      fullName: "Robert'); DROP TABLE addresses;--",
      address: "<script>alert(1)</script> Street 1",
    });
    expect(result.status).toBe(201);
    expect(result.body.address.fullName).toBe(
      "Robert'); DROP TABLE addresses;--",
    );
    const [row] = await sql<{ n: number }>(
      "SELECT count(*)::int AS n FROM addresses WHERE customer_id = :id",
      { id },
    );
    expect(row.n).toBe(1);
  });

  it("allows up to 20 addresses, then explains", async () => {
    const { cookie } = await signUp();
    for (let i = 0; i < 20; i++) {
      expect(
        (await create(cookie, { ...home, fullName: `Address ${i}` })).status,
      ).toBe(201);
    }
    const over = await create(cookie, home);
    expect(over.status).toBe(422);
    expect(over.body.error.code).toBe("unprocessable");
    expect(over.body.error.message).toMatch(/up to 20/);
    expect((await list(cookie)).body.items).toHaveLength(20);
  });

  it("refuses requests from another website and non-JSON bodies", async () => {
    const { cookie } = await signUp();
    const crossSite = await call(createRoute, {
      method: "POST",
      cookie,
      body: home,
      headers: { origin: "https://evil.example" },
    });
    expect(crossSite.status).toBe(403);
    const wrongType = await call(createRoute, {
      method: "POST",
      cookie,
      body: home,
      headers: { "content-type": "text/plain" },
    });
    expect(wrongType.status).toBe(415);
  });

  it("simultaneous 'make default' creates all succeed and leave exactly one default", async () => {
    const { cookie } = await signUp();
    const results = await Promise.all([
      create(cookie, { ...home, isDefault: true }),
      create(cookie, { ...office, isDefault: true }),
      create(cookie, { ...home, fullName: "C", isDefault: true }),
      create(cookie, { ...home, fullName: "D", isDefault: true }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    const items = (await list(cookie)).body.items;
    expect(items).toHaveLength(4);
    expect(defaultsOf(items)).toBe(1);
  });

  it("simultaneous first addresses all succeed and leave exactly one default", async () => {
    const { cookie } = await signUp();
    const results = await Promise.all([
      create(cookie, home),
      create(cookie, office),
      create(cookie, { ...home, fullName: "C" }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201, 201]);
    const items = (await list(cookie)).body.items;
    expect(items).toHaveLength(3);
    expect(defaultsOf(items)).toBe(1);
  });

  it("simultaneous deletes and default changes never break the one-default rule", async () => {
    const { cookie } = await signUp();
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      ids.push(
        (await create(cookie, { ...home, fullName: `N${i}` })).body.address.id,
      );
    }
    const results = await Promise.all([
      remove(cookie, ids[0]),
      makeDefault(cookie, ids[2]),
      makeDefault(cookie, ids[3]),
      remove(cookie, ids[1]),
    ]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    const items = (await list(cookie)).body.items;
    expect(items).toHaveLength(2);
    expect(defaultsOf(items)).toBe(1);
  });
});

describe("editing addresses", () => {
  it("changes only the fields that are sent", async () => {
    const { cookie } = await signUp();
    const { address } = (await create(cookie, home)).body;
    const result = await patch(cookie, address.id, {
      city: "Munich",
      zip: "80331",
    });

    expect(result.status).toBe(200);
    expect(result.body.address).toMatchObject({
      ...home,
      city: "Munich",
      zip: "80331",
      isDefault: true,
    });
  });

  it("validates the fields that are sent", async () => {
    const { cookie } = await signUp();
    const { address } = (await create(cookie, home)).body;
    const result = await patch(cookie, address.id, { phone: "abc", city: "" });
    expect(result.status).toBe(400);
    expect(Object.keys(result.body.error.fields).sort()).toEqual([
      "city",
      "phone",
    ]);
    expect(
      (await patch(cookie, address.id, { customerId: crypto.randomUUID() }))
        .status,
    ).toBe(400);
  });

  it("ticking 'default' moves the default", async () => {
    const { cookie } = await signUp();
    await create(cookie, home);
    const second = (await create(cookie, office)).body.address;
    const result = await patch(cookie, second.id, { isDefault: true });

    expect(defaultsOf(result.body.items)).toBe(1);
    expect(result.body.address.isDefault).toBe(true);
  });

  it("unticking 'default' on the default leaves it as the default", async () => {
    const { cookie } = await signUp();
    const first = (await create(cookie, home)).body.address;
    await create(cookie, office);
    const result = await patch(cookie, first.id, {
      isDefault: false,
      city: "Hamburg",
    });

    expect(result.body.address).toMatchObject({
      isDefault: true,
      city: "Hamburg",
    });
    expect(defaultsOf(result.body.items)).toBe(1);
  });

  it("keeps the address in the same place in the list", async () => {
    const { cookie } = await signUp();
    const first = (await create(cookie, home)).body.address;
    await create(cookie, office);
    await patch(cookie, first.id, { fullName: "Renamed" });
    expect((await list(cookie)).body.items[0].fullName).toBe("Renamed");
  });
});

describe("choosing the default", () => {
  it("makes the chosen address the only default", async () => {
    const { cookie } = await signUp();
    await create(cookie, home);
    const second = (await create(cookie, office)).body.address;

    const result = await makeDefault(cookie, second.id);
    expect(result.status).toBe(200);
    expect(defaultsOf(result.body.items)).toBe(1);
    expect(
      result.body.items.find((a: { id: string }) => a.id === second.id)
        .isDefault,
    ).toBe(true);
  });

  it("choosing the current default again changes nothing", async () => {
    const { cookie } = await signUp();
    const first = (await create(cookie, home)).body.address;
    const result = await makeDefault(cookie, first.id);
    expect(result.status).toBe(200);
    expect(result.body.items[0].isDefault).toBe(true);
  });
});

describe("deleting addresses", () => {
  it("deletes a normal address and leaves the default alone", async () => {
    const { cookie } = await signUp();
    const first = (await create(cookie, home)).body.address;
    const second = (await create(cookie, office)).body.address;

    const result = await remove(cookie, second.id);
    expect(result.status).toBe(200);
    expect(result.body.items.map((a: { id: string }) => a.id)).toEqual([
      first.id,
    ]);
    expect(result.body.items[0].isDefault).toBe(true);
  });

  it("deleting the default promotes the oldest remaining address", async () => {
    const { cookie } = await signUp();
    const first = (await create(cookie, home)).body.address;
    const second = (await create(cookie, office)).body.address;
    await create(cookie, { ...home, fullName: "Third" });

    const result = await remove(cookie, first.id);
    expect(defaultsOf(result.body.items)).toBe(1);
    expect(result.body.items[0].id).toBe(second.id);
    expect(result.body.items[0].isDefault).toBe(true);
  });

  it("deleting the last address leaves an empty book, and the next one is the default again", async () => {
    const { cookie } = await signUp();
    const only = (await create(cookie, home)).body.address;
    expect((await remove(cookie, only.id)).body.items).toEqual([]);
    expect((await create(cookie, office)).body.address.isDefault).toBe(true);
  });

  it("deleting twice is 'not found' the second time", async () => {
    const { cookie } = await signUp();
    const only = (await create(cookie, home)).body.address;
    expect((await remove(cookie, only.id)).status).toBe(200);
    expect((await remove(cookie, only.id)).status).toBe(404);
  });
});

describe("privacy between customers", () => {
  it("one customer can never see, change, delete or default another's address", async () => {
    const owner = await signUp();
    const other = await signUp();
    const theirs = (await create(owner.cookie, home)).body.address;
    await create(other.cookie, office);

    expect(
      (await list(other.cookie)).body.items.map((a: { id: string }) => a.id),
    ).not.toContain(theirs.id);

    for (const result of [
      await patch(other.cookie, theirs.id, { city: "Hacked" }),
      await remove(other.cookie, theirs.id),
      await makeDefault(other.cookie, theirs.id),
    ]) {
      expect(result.status).toBe(404);
      expect(result.body.error.code).toBe("not_found");
    }

    const stillThere = (await list(owner.cookie)).body.items;
    expect(stillThere).toHaveLength(1);
    expect(stillThere[0]).toMatchObject({ id: theirs.id, city: "Berlin" });
  });

  it("someone else's id looks exactly like an id that does not exist", async () => {
    const owner = await signUp();
    const other = await signUp();
    const theirs = (await create(owner.cookie, home)).body.address;

    const real = await patch(other.cookie, theirs.id, { city: "X" });
    const missing = await patch(other.cookie, crypto.randomUUID(), {
      city: "X",
    });
    expect(real.status).toBe(missing.status);
    expect(real.body.error.code).toBe(missing.body.error.code);
    expect(real.body.error.message).toBe(missing.body.error.message);
  });

  it("a malformed id is 'not found', not a server error", async () => {
    const { cookie } = await signUp();
    for (const bad of [
      "abc",
      "1",
      "../../etc/passwd",
      "' OR 1=1 --",
      "00000000-0000-0000-0000-00000000000g",
    ]) {
      expect((await patch(cookie, bad, { city: "X" })).status, bad).toBe(404);
      expect((await remove(cookie, bad)).status, bad).toBe(404);
      expect((await makeDefault(cookie, bad)).status, bad).toBe(404);
    }
  });

  it("a default in one customer's book does not affect another's", async () => {
    const a = await signUp();
    const b = await signUp();
    await create(a.cookie, home);
    await create(b.cookie, office);
    expect(defaultsOf((await list(a.cookie)).body.items)).toBe(1);
    expect(defaultsOf((await list(b.cookie)).body.items)).toBe(1);
  });
});

describe("account deletion", () => {
  it("wipes the address book, because addresses are personal data", async () => {
    const { cookie, id } = await signUp();
    await create(cookie, home);
    await create(cookie, office);

    const result = await call(deleteAccount, {
      method: "DELETE",
      cookie,
      body: { password: PASSWORD },
      ip: newIp(),
    });
    expect(result.status).toBe(204);
    expect(
      await sql("SELECT 1 FROM addresses WHERE customer_id = :id", { id }),
    ).toHaveLength(0);
  });

  it("leaves other customers' addresses alone", async () => {
    const gone = await signUp();
    const kept = await signUp();
    await create(gone.cookie, home);
    await create(kept.cookie, office);
    await call(deleteAccount, {
      method: "DELETE",
      cookie: gone.cookie,
      body: { password: PASSWORD },
      ip: newIp(),
    });
    expect((await list(kept.cookie)).body.items).toHaveLength(1);
  });
});

describe("database rules", () => {
  it("the database itself refuses a second default, whatever the app does", async () => {
    const { cookie, id } = await signUp();
    await create(cookie, home);
    await expect(
      sql(
        "INSERT INTO addresses (customer_id, full_name, phone, country, city, address, zip, is_default) VALUES (:id, 'X', '123456', 'C', 'C', 'A', 'Z', true)",
        { id },
      ),
    ).rejects.toThrow();
  });
});

describe("privacy of logs", () => {
  it("never logs the address details", async () => {
    process.env.LOG_LEVEL = "debug";
    const lines: string[] = [];
    const capture = (line: unknown) => void lines.push(String(line));
    const log = console.log;
    const err = console.error;
    console.log = capture;
    console.error = capture;
    try {
      const { cookie } = await signUp();
      await create(cookie, {
        ...home,
        fullName: "Zorblax Quux",
        address: "Secretstrasse 99",
        phone: "+49 170 5550199",
      });
      const out = lines.join("\n");
      expect(out).toContain("addresses.create");
      for (const secret of ["Zorblax", "Secretstrasse", "5550199"])
        expect(out).not.toContain(secret);
    } finally {
      console.log = log;
      console.error = err;
      process.env.LOG_LEVEL = "silent";
    }
  });
});
