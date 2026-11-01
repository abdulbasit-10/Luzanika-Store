import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalDiskStorage } from "./local-disk-storage";
import { contentTypeForKey, isValidStorageKey } from "./storage";

describe("storage keys", () => {
  it("accepts plain lower-case keys with a known extension", () => {
    for (const key of [
      "avatars/0123abcd.webp",
      "a.png",
      "products/shirt-1/main_2.jpg",
      "x/y/z.webp",
    ]) {
      expect(isValidStorageKey(key), key).toBe(true);
    }
  });

  it("refuses anything that could escape the uploads folder or confuse the filesystem", () => {
    for (const key of [
      "../secret.webp",
      "avatars/../../etc/passwd.webp",
      "/etc/passwd.webp",
      "avatars//x.webp",
      "avatars\\x.webp",
      "C:/Windows/x.webp",
      "avatars/x.webp/",
      "avatars/.hidden.webp",
      "avatars/x.php",
      "avatars/x.webp.exe",
      "avatars/x",
      "avatars/UPPER.webp",
      "avatars/with space.webp",
      "avatars/%2e%2e/x.webp",
      "avatars/x\u0000.webp",
      "",
      "a".repeat(250) + ".webp",
    ]) {
      expect(isValidStorageKey(key), JSON.stringify(key)).toBe(false);
    }
    for (const value of [undefined, null, 5, {}]) {
      expect(isValidStorageKey(value)).toBe(false);
    }
  });

  it("derives the content type from the extension", () => {
    expect(contentTypeForKey("a/b.webp")).toBe("image/webp");
    expect(contentTypeForKey("a/b.jpg")).toBe("image/jpeg");
    expect(contentTypeForKey("a/b.png")).toBe("image/png");
  });
});

describe("LocalDiskStorage", () => {
  let root: string;
  let storage: LocalDiskStorage;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "luzanika-storage-"));
    storage = new LocalDiskStorage(root);
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  it("stores and returns a file with its content type", async () => {
    await storage.put("avatars/abc123.webp", Buffer.from("hello"));
    const file = await storage.get("avatars/abc123.webp");
    expect(file?.bytes.toString()).toBe("hello");
    expect(file?.contentType).toBe("image/webp");
  });

  it("replaces an existing file", async () => {
    await storage.put("a/x.webp", Buffer.from("one"));
    await storage.put("a/x.webp", Buffer.from("two"));
    expect((await storage.get("a/x.webp"))?.bytes.toString()).toBe("two");
  });

  it("leaves no temporary files behind", async () => {
    await storage.put("avatars/x.webp", Buffer.from("data"));
    expect(await readdir(path.join(root, "avatars"))).toEqual(["x.webp"]);
  });

  it("answers null for a file that does not exist", async () => {
    expect(await storage.get("avatars/missing.webp")).toBeNull();
  });

  it("deletes a file, and deleting a missing file is not an error", async () => {
    await storage.put("avatars/x.webp", Buffer.from("data"));
    await storage.delete("avatars/x.webp");
    expect(await storage.get("avatars/x.webp")).toBeNull();
    await expect(storage.delete("avatars/x.webp")).resolves.toBeUndefined();
  });

  it("refuses unsafe keys for every operation, and never touches files outside the folder", async () => {
    const outside = path.join(path.dirname(root), "outside-secret.webp");
    await writeFile(outside, "secret");
    try {
      const bad = `../${path.basename(outside)}`;
      await expect(storage.get(bad)).rejects.toThrow(/invalid storage key/i);
      await expect(storage.put(bad, Buffer.from("x"))).rejects.toThrow(
        /invalid storage key/i,
      );
      await expect(storage.delete(bad)).rejects.toThrow(/invalid storage key/i);
      expect(
        (await readdir(path.dirname(root))).includes(path.basename(outside)),
      ).toBe(true);
    } finally {
      await rm(outside, { force: true });
    }
  });

  it("handles many writes to the same key at once without corrupting it", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        storage.put("a/race.webp", Buffer.from(`value-${i}`.padEnd(2000, "x"))),
      ),
    );
    const file = await storage.get("a/race.webp");
    expect(file?.bytes.length).toBe(2000);
    expect(file?.bytes.toString()).toMatch(/^value-\d+x+$/);
    expect(await readdir(path.join(root, "a"))).toEqual(["race.webp"]);
  });
});
