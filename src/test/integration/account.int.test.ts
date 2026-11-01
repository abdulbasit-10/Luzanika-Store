import { mkdtemp, readdir, rm } from "node:fs/promises";
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
  DELETE as deleteAccount,
  GET as getAccount,
  PATCH as patchAccount,
} from "@/app/api/v1/account/route";
import {
  DELETE as deleteAvatar,
  GET as getAvatar,
  PUT as putAvatar,
} from "@/app/api/v1/account/avatar/route";
import { POST as forgotPassword } from "@/app/api/v1/auth/forgot-password/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";
import { setStorage, type FileStorage } from "@/server/storage";
import { LocalDiskStorage } from "@/server/storage/local-disk-storage";

import { call, newIp, sql, uniqueEmail } from "./helpers";

const PASSWORD = "Sup3r-secret-pw";

let uploadsDir: string;
let storage: LocalDiskStorage;

beforeAll(async () => {
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), "luzanika-uploads-"));
  storage = new LocalDiskStorage(uploadsDir);
  setStorage(storage);
});
afterAll(async () => {
  setStorage(undefined);
  await rm(uploadsDir, { recursive: true, force: true });
});

let sent: EmailMessage[];
beforeEach(() => {
  sent = [];
  setEmailSender({
    send: async (message) => {
      sent.push(message);
    },
  });
  setStorage(storage);
});
afterEach(() => setEmailSender(undefined));

async function signUp(overrides: Record<string, unknown> = {}) {
  const email = uniqueEmail();
  const result = await call(register, {
    body: {
      firstName: "Ada",
      lastName: "Lovelace",
      email,
      password: PASSWORD,
      ...overrides,
    },
  });
  return { email, cookie: result.cookie as string, id: result.body.user.id };
}

const patch = (cookie: string | undefined, body: unknown, ip?: string) =>
  call(patchAccount, { method: "PATCH", cookie, body, ip });

async function customerRow(id: string) {
  const [row] = await sql<Record<string, unknown>>(
    "SELECT * FROM customers WHERE id = :id",
    { id },
  );
  return row;
}

async function image(
  width = 400,
  height = 300,
  format: "jpeg" | "png" | "gif" = "jpeg",
) {
  return sharp({
    create: { width, height, channels: 3, background: "#cc3366" },
  })
    [format]()
    .toBuffer();
}

function photoForm(bytes: Buffer, filename = "me.jpg", type = "image/jpeg") {
  const form = new FormData();
  form.set("photo", new File([new Uint8Array(bytes)], filename, { type }));
  return form;
}

const upload = (cookie: string | undefined, bytes: Buffer, ip?: string) =>
  call(putAvatar, { method: "PUT", cookie, form: photoForm(bytes), ip });

async function filesOnDisk(): Promise<string[]> {
  try {
    return await readdir(path.join(uploadsDir, "avatars"));
  } catch {
    return [];
  }
}

describe("GET /account", () => {
  it("needs a signed-in customer", async () => {
    const result = await call(getAccount, { method: "GET" });
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("unauthenticated");
  });

  it("returns the profile without internals", async () => {
    const { email, cookie } = await signUp();
    const result = await call(getAccount, { method: "GET", cookie });
    expect(result.status).toBe(200);
    expect(result.body.user.email).toBe(email);
    expect(result.raw).not.toMatch(/passwordHash|\$2[aby]\$|avatarKey|status/);
  });
});

describe("PATCH /account (profile)", () => {
  it("needs a signed-in customer", async () => {
    const result = await patch(undefined, { firstName: "X" });
    expect(result.status).toBe(401);
  });

  it("saves the fields that are sent and keeps the rest", async () => {
    const { id, cookie } = await signUp();
    const result = await patch(cookie, {
      firstName: "Grace",
      phone: "+49 170 1234567",
      gender: "female",
      dateOfBirth: "1990-05-17",
      language: "de",
    });

    expect(result.status).toBe(200);
    expect(result.body.user).toMatchObject({
      firstName: "Grace",
      lastName: "Lovelace",
      phone: "+49 170 1234567",
      gender: "female",
      dateOfBirth: "1990-05-17",
      language: "de",
    });
    const row = await customerRow(id);
    expect(row).toMatchObject({
      first_name: "Grace",
      last_name: "Lovelace",
      phone: "+49 170 1234567",
      gender: "female",
      language: "de",
    });

    const fresh = await call(me, { method: "GET", cookie });
    expect(fresh.body.user.firstName).toBe("Grace");
    expect(fresh.body.user.dateOfBirth).toBe("1990-05-17");
  });

  it("clears optional fields when they are sent empty", async () => {
    const { id, cookie } = await signUp();
    await patch(cookie, {
      phone: "+49 170 1234567",
      gender: "male",
      dateOfBirth: "1990-05-17",
    });
    const result = await patch(cookie, {
      phone: "",
      gender: "",
      dateOfBirth: "",
    });

    expect(result.status).toBe(200);
    expect(result.body.user).not.toHaveProperty("phone");
    expect(result.body.user).not.toHaveProperty("gender");
    expect(result.body.user).not.toHaveProperty("dateOfBirth");
    expect(await customerRow(id)).toMatchObject({
      phone: null,
      gender: null,
      date_of_birth: null,
    });
  });

  it("does nothing for an empty change", async () => {
    const { cookie, email } = await signUp();
    const result = await patch(cookie, {});
    expect(result.status).toBe(200);
    expect(result.body.user.email).toBe(email);
  });

  it("only ever changes the signed-in customer's own row", async () => {
    const a = await signUp();
    const b = await signUp();
    await patch(a.cookie, { firstName: "OnlyA" });
    expect((await customerRow(a.id)).first_name).toBe("OnlyA");
    expect((await customerRow(b.id)).first_name).toBe("Ada");
  });

  it("refuses fields that are not editable, and changes nothing", async () => {
    const { id, cookie } = await signUp();
    for (const extra of [
      { status: "blocked" },
      { isAdmin: true },
      { id: "x" },
      { passwordHash: "x" },
      { emailVerifiedAt: "2020-01-01" },
      { avatarKey: "avatars/x.webp" },
    ]) {
      const result = await patch(cookie, { firstName: "Hacker", ...extra });
      expect(result.status, JSON.stringify(extra)).toBe(400);
    }
    const row = await customerRow(id);
    expect(row.first_name).toBe("Ada");
    expect(row.status).toBe("active");
  });

  it("reports each invalid field", async () => {
    const { cookie } = await signUp();
    const result = await patch(cookie, {
      firstName: "",
      gender: "robot",
      language: "fr",
      phone: "123",
      dateOfBirth: "1990-02-30",
    });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("validation_failed");
    expect(Object.keys(result.body.error.fields).sort()).toEqual([
      "dateOfBirth",
      "firstName",
      "gender",
      "language",
      "phone",
    ]);
  });

  it("refuses requests that are not JSON, and requests from another website", async () => {
    const { cookie } = await signUp();
    const wrongType = await call(patchAccount, {
      method: "PATCH",
      cookie,
      body: { firstName: "X" },
      headers: { "content-type": "text/plain" },
    });
    expect(wrongType.status).toBe(415);

    const crossSite = await call(patchAccount, {
      method: "PATCH",
      cookie,
      body: { firstName: "X" },
      headers: { origin: "https://evil.example" },
    });
    expect(crossSite.status).toBe(403);
    expect(crossSite.body.error.code).toBe("csrf_failed");
  });
});

describe("PATCH /account (email)", () => {
  it("needs the current password to change the email", async () => {
    const { id, email, cookie } = await signUp();
    const newEmail = uniqueEmail();

    const missing = await patch(cookie, { email: newEmail });
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields.currentPassword).toMatch(
      /current password/i,
    );

    const wrong = await patch(cookie, {
      email: newEmail,
      currentPassword: "not-my-password",
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.fields.currentPassword).toMatch(/incorrect/i);

    expect((await customerRow(id)).email).toBe(email);
  });

  it("changes the email with the right password, and the new one is what signs in", async () => {
    const { id, email, cookie } = await signUp();
    const newEmail = uniqueEmail();
    const result = await patch(cookie, {
      email: newEmail.toUpperCase(),
      currentPassword: PASSWORD,
    });

    expect(result.status).toBe(200);
    expect(result.body.user.email).toBe(newEmail);
    expect((await customerRow(id)).email).toBe(newEmail);

    expect(
      (await call(login, { body: { email: newEmail, password: PASSWORD } }))
        .status,
    ).toBe(200);
    expect(
      (await call(login, { body: { email, password: PASSWORD } })).status,
    ).toBe(401);
  });

  it("refuses an email another account already uses, in any letter case", async () => {
    const other = await signUp();
    const { id, email, cookie } = await signUp();
    const result = await patch(cookie, {
      email: other.email.toUpperCase(),
      currentPassword: PASSWORD,
    });

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("email_taken");
    expect(result.body.error.fields.email).toBeTruthy();
    expect((await customerRow(id)).email).toBe(email);
  });

  it("does not ask for the password when the email is not actually changing", async () => {
    const { email, cookie } = await signUp();
    const result = await patch(cookie, {
      email: email.toUpperCase(),
      firstName: "Same",
    });
    expect(result.status).toBe(200);
    expect(result.body.user.firstName).toBe("Same");
  });

  it("signs out the other devices but not this one, and cancels pending reset links", async () => {
    const { id, email, cookie: here } = await signUp();
    const elsewhere = (
      await call(login, { body: { email, password: PASSWORD } })
    ).cookie as string;
    await call(forgotPassword, { body: { email } });
    expect(sent).toHaveLength(1);
    expect(
      await sql(
        "SELECT 1 FROM customer_tokens WHERE customer_id = :id AND used_at IS NULL",
        { id },
      ),
    ).toHaveLength(1);

    const result = await patch(here, {
      email: uniqueEmail(),
      currentPassword: PASSWORD,
    });
    expect(result.status).toBe(200);

    expect(
      (await call(me, { method: "GET", cookie: here })).body.user,
    ).not.toBeNull();
    expect(
      (await call(me, { method: "GET", cookie: elsewhere })).body.user,
    ).toBeNull();
    expect(
      await sql(
        "SELECT 1 FROM customer_tokens WHERE customer_id = :id AND used_at IS NULL",
        { id },
      ),
    ).toHaveLength(0);
  });

  it("limits password guessing on the email change to 5 tries per 15 minutes", async () => {
    const { cookie } = await signUp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await patch(cookie, {
            email: uniqueEmail(),
            currentPassword: `wrong-guess-${i}`,
          })
        ).status,
      );
    }
    expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
  });
});

describe("profile photo", () => {
  it("stores a clean 256x256 WebP, links it, and serves it back", async () => {
    const { id, cookie } = await signUp();
    const result = await upload(cookie, await image(1200, 800));

    expect(result.status).toBe(200);
    expect(result.body.user.avatarUrl).toMatch(
      /^\/api\/v1\/account\/avatar\?v=[0-9a-f]{12}$/,
    );

    const row = await customerRow(id);
    const key = row.avatar_key as string;
    expect(key).toMatch(/^avatars\/[0-9a-f]{32}\.webp$/);
    const stored = await storage.get(key);
    const meta = await sharp(stored!.bytes).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 256, 256]);

    const served = await call(getAvatar, { method: "GET", cookie });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/webp");
    expect(served.headers.get("cache-control")).toBe(
      "private, max-age=31536000, immutable",
    );
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect(served.bytes.equals(stored!.bytes)).toBe(true);

    const profile = await call(me, { method: "GET", cookie });
    expect(profile.body.user.avatarUrl).toBe(result.body.user.avatarUrl);
    expect(profile.raw).not.toContain(key);
  });

  it("replaces the photo, gives it a new URL, and deletes the old file", async () => {
    const { id, cookie } = await signUp();
    const first = await upload(cookie, await image());
    const firstKey = (await customerRow(id)).avatar_key as string;

    const second = await upload(cookie, await image(500, 500, "png"));
    const secondKey = (await customerRow(id)).avatar_key as string;

    expect(secondKey).not.toBe(firstKey);
    expect(second.body.user.avatarUrl).not.toBe(first.body.user.avatarUrl);
    expect(await storage.get(firstKey)).toBeNull();
    expect(await storage.get(secondKey)).not.toBeNull();
  });

  it("removes the photo from the database and the disk", async () => {
    const { id, cookie } = await signUp();
    await upload(cookie, await image());
    const key = (await customerRow(id)).avatar_key as string;

    const result = await call(deleteAvatar, { method: "DELETE", cookie });
    expect(result.status).toBe(200);
    expect(result.body.user).not.toHaveProperty("avatarUrl");
    expect((await customerRow(id)).avatar_key).toBeNull();
    expect(await storage.get(key)).toBeNull();
    expect((await call(getAvatar, { method: "GET", cookie })).status).toBe(404);
  });

  it("is private: nobody else, and nobody signed out, can fetch it", async () => {
    const owner = await signUp();
    const other = await signUp();
    await upload(owner.cookie, await image());

    expect((await call(getAvatar, { method: "GET" })).status).toBe(401);
    // another customer only ever sees their own (here: none)
    expect(
      (await call(getAvatar, { method: "GET", cookie: other.cookie })).status,
    ).toBe(404);
  });

  it("answers 404, not an error, when the file is missing from the disk", async () => {
    const { id, cookie } = await signUp();
    await upload(cookie, await image());
    await storage.delete((await customerRow(id)).avatar_key as string);
    expect((await call(getAvatar, { method: "GET", cookie })).status).toBe(404);
  });

  it("needs a signed-in customer to upload or remove", async () => {
    expect((await upload(undefined, await image())).status).toBe(401);
    expect((await call(deleteAvatar, { method: "DELETE" })).status).toBe(401);
  });

  it("refuses files that are not real JPG, PNG or WebP pictures, and stores nothing", async () => {
    const { id, cookie } = await signUp();
    const before = (await filesOnDisk()).length;

    for (const bytes of [
      Buffer.from("<?php echo 'hi'; ?>"),
      Buffer.from("just text pretending to be a photo"),
      await image(50, 50, "gif"),
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ),
    ]) {
      const result = await upload(cookie, bytes);
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe("validation_failed");
      expect(result.body.error.fields.photo).toBeTruthy();
    }
    expect((await filesOnDisk()).length).toBe(before);
    expect((await customerRow(id)).avatar_key).toBeNull();
  });

  it("ignores the name and type the browser claims", async () => {
    const { cookie } = await signUp();
    const form = photoForm(
      Buffer.from("not an image"),
      "holiday.jpg",
      "image/jpeg",
    );
    expect(
      (await call(putAvatar, { method: "PUT", cookie, form })).status,
    ).toBe(400);

    const real = photoForm(await image(), "x.exe", "application/x-msdownload");
    expect(
      (await call(putAvatar, { method: "PUT", cookie, form: real })).status,
    ).toBe(200);
  });

  it("refuses an upload over 5 MB and stores nothing", async () => {
    const { cookie } = await signUp();
    const before = (await filesOnDisk()).length;
    const result = await upload(
      cookie,
      Buffer.alloc(5 * 1024 * 1024 + 1024, 1),
    );
    expect(result.status).toBe(413);
    expect((await filesOnDisk()).length).toBe(before);
  });

  it("refuses requests that are not multipart, and requests from another website", async () => {
    const { cookie } = await signUp();
    const json = await call(putAvatar, {
      method: "PUT",
      cookie,
      body: { photo: "x" },
    });
    expect(json.status).toBe(415);

    const crossSite = await call(putAvatar, {
      method: "PUT",
      cookie,
      form: photoForm(await image()),
      headers: { origin: "https://evil.example" },
    });
    expect(crossSite.status).toBe(403);
  });

  it("limits uploads to 10 per hour per account", async () => {
    const { cookie } = await signUp();
    const tiny = await image(20, 20);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++)
      statuses.push((await upload(cookie, tiny)).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("leaves the account unchanged and writes nothing when the disk fails", async () => {
    const { id, cookie } = await signUp();
    const failing: FileStorage = {
      put: async () => {
        throw new Error("disk full at /var/secret/path");
      },
      get: async () => null,
      delete: async () => {},
    };
    setStorage(failing);

    const result = await upload(cookie, await image());
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("internal_error");
    expect(result.raw).not.toMatch(/disk full|secret/);
    expect((await customerRow(id)).avatar_key).toBeNull();
  });

  it("still succeeds when the previous file cannot be deleted", async () => {
    const { id, cookie } = await signUp();
    await upload(cookie, await image());
    const firstKey = (await customerRow(id)).avatar_key as string;
    setStorage({
      put: (key, bytes) => storage.put(key, bytes),
      get: (key) => storage.get(key),
      delete: async () => {
        throw new Error("permission denied");
      },
    });
    const result = await upload(cookie, await image(300, 300));
    expect(result.status).toBe(200);
    expect(result.body.user.avatarUrl).toBeTruthy();
    expect((await customerRow(id)).avatar_key).not.toBe(firstKey);
  });

  it("two uploads at once leave exactly one file for the customer", async () => {
    const { id, cookie } = await signUp();
    const before = new Set(await filesOnDisk());
    await Promise.all([
      upload(cookie, await image(300, 300)),
      upload(cookie, await image(310, 310)),
    ]);

    const key = (await customerRow(id)).avatar_key as string;
    const added = (await filesOnDisk()).filter((name) => !before.has(name));
    expect(added).toEqual([path.basename(key)]);
  });
});

describe("DELETE /account", () => {
  const remove = (cookie: string | undefined, body: unknown, ip?: string) =>
    call(deleteAccount, { method: "DELETE", cookie, body, ip });

  it("needs a signed-in customer and the password", async () => {
    expect((await remove(undefined, { password: PASSWORD })).status).toBe(401);

    const { id, cookie } = await signUp();
    expect((await remove(cookie, {})).status).toBe(400);
    const wrong = await remove(cookie, { password: "not-my-password" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.fields.password).toMatch(/incorrect/i);
    expect((await customerRow(id)).status).toBe("active");
    expect(
      (await call(me, { method: "GET", cookie })).body.user,
    ).not.toBeNull();
  });

  it("wipes the personal details, ends every session, removes the photo and frees the email", async () => {
    const { id, email, cookie } = await signUp();
    const elsewhere = (
      await call(login, { body: { email, password: PASSWORD } })
    ).cookie as string;
    await patch(cookie, {
      phone: "+49 170 1234567",
      gender: "female",
      dateOfBirth: "1990-05-17",
      language: "de",
    });
    await upload(cookie, await image());
    const key = (await customerRow(id)).avatar_key as string;
    await call(forgotPassword, { body: { email } });

    const result = await remove(cookie, { password: PASSWORD });
    expect(result.status).toBe(204);
    expect(result.cookie).toBe("");

    const row = await customerRow(id);
    expect(row).toMatchObject({
      email: `deleted-${id}@deleted.invalid`,
      first_name: "Deleted",
      last_name: "User",
      phone: null,
      gender: null,
      date_of_birth: null,
      avatar_key: null,
      language: "en",
      status: "anonymised",
      last_login_at: null,
    });
    expect(row.anonymised_at).not.toBeNull();
    expect(row.password_hash).toBe("!");
    expect(JSON.stringify(row)).not.toContain(email);

    expect(
      await sql("SELECT 1 FROM customer_sessions WHERE customer_id = :id", {
        id,
      }),
    ).toHaveLength(0);
    expect(
      await sql("SELECT 1 FROM customer_tokens WHERE customer_id = :id", {
        id,
      }),
    ).toHaveLength(0);
    expect(await storage.get(key)).toBeNull();

    expect((await call(me, { method: "GET", cookie })).body.user).toBeNull();
    expect(
      (await call(me, { method: "GET", cookie: elsewhere })).body.user,
    ).toBeNull();
  });

  it("can no longer sign in or reset a password, and the email can be registered again", async () => {
    const { id, email, cookie } = await signUp();
    await remove(cookie, { password: PASSWORD });

    expect(
      (await call(login, { body: { email, password: PASSWORD } })).status,
    ).toBe(401);
    expect(
      (
        await call(login, {
          body: { email: `deleted-${id}@deleted.invalid`, password: "!" },
        })
      ).status,
    ).toBe(401);
    expect((await call(forgotPassword, { body: { email } })).status).toBe(404);

    const again = await call(register, {
      body: { firstName: "New", lastName: "Person", email, password: PASSWORD },
    });
    expect(again.status).toBe(201);
    expect(again.body.user.id).not.toBe(id);
  });

  it("leaves other customers untouched", async () => {
    const victim = await signUp();
    const bystander = await signUp();
    await remove(victim.cookie, { password: PASSWORD });

    expect((await customerRow(bystander.id)).status).toBe("active");
    expect(
      (await call(me, { method: "GET", cookie: bystander.cookie })).body.user
        .id,
    ).toBe(bystander.id);
  });

  it("limits password guessing to 5 tries per 15 minutes", async () => {
    const { cookie } = await signUp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++)
      statuses.push(
        (await remove(cookie, { password: `wrong-guess-${i}` })).status,
      );
    expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
  });

  it("refuses requests from another website", async () => {
    const { id, cookie } = await signUp();
    const result = await call(deleteAccount, {
      method: "DELETE",
      cookie,
      body: { password: PASSWORD },
      headers: { origin: "https://evil.example" },
      ip: newIp(),
    });
    expect(result.status).toBe(403);
    expect((await customerRow(id)).status).toBe("active");
  });
});

describe("privacy of logs", () => {
  it("never logs personal details, passwords or file names for account requests", async () => {
    process.env.LOG_LEVEL = "debug";
    const lines: string[] = [];
    const capture = (line: unknown) => void lines.push(String(line));
    const log = console.log;
    const err = console.error;
    console.log = capture;
    console.error = capture;
    try {
      const { email, cookie } = await signUp();
      await patch(cookie, {
        firstName: "Zorblax",
        phone: "+49 170 9998887",
        email: uniqueEmail(),
        currentPassword: "wrong-pass-123",
      });
      await call(putAvatar, {
        method: "PUT",
        cookie,
        form: photoForm(Buffer.from("junk"), "my-secret-holiday.jpg"),
      });
      const out = lines.join("\n");
      expect(out).toContain("account.update");
      for (const secret of [
        email,
        "Zorblax",
        "9998887",
        "wrong-pass-123",
        "my-secret-holiday",
        cookie,
      ]) {
        expect(out).not.toContain(secret);
      }
    } finally {
      console.log = log;
      console.error = err;
      process.env.LOG_LEVEL = "silent";
    }
  });
});
