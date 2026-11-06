import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NAMES = [
  "NODE_ENV",
  "UPLOADS_DIR",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_FOLDER",
];

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const name of NAMES) vi.stubEnv(name, "");
  vi.stubEnv("NODE_ENV", "test");
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const { getStorageEnv } = await import("./storage-env");
  return getStorageEnv();
}

const CLOUDINARY = {
  CLOUDINARY_CLOUD_NAME: "democloud",
  CLOUDINARY_API_KEY: "123",
  CLOUDINARY_API_SECRET: "secret",
};

describe("getStorageEnv", () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it("uses Cloudinary when its three values are set, with the default folder", async () => {
    expect(await load({ NODE_ENV: "development", ...CLOUDINARY })).toEqual({
      kind: "cloudinary",
      cloudName: "democloud",
      apiKey: "123",
      apiSecret: "secret",
      folder: "luzanika",
    });
  });

  it("uses Cloudinary in production without any uploads folder", async () => {
    const env = await load({ NODE_ENV: "production", ...CLOUDINARY });
    expect(env.kind).toBe("cloudinary");
  });

  it("takes the folder from CLOUDINARY_FOLDER", async () => {
    const env = await load({
      ...CLOUDINARY,
      CLOUDINARY_FOLDER: "luzanika-live",
    });
    expect(env).toMatchObject({ kind: "cloudinary", folder: "luzanika-live" });
  });

  it("refuses a folder name with odd characters", async () => {
    await expect(
      load({ ...CLOUDINARY, CLOUDINARY_FOLDER: "../x" }),
    ).rejects.toThrow("CLOUDINARY_FOLDER");
  });

  it("refuses a half-filled Cloudinary setup instead of silently using the disk", async () => {
    await expect(
      load({ CLOUDINARY_CLOUD_NAME: "democloud", CLOUDINARY_API_KEY: "123" }),
    ).rejects.toThrow("must all be set");
  });

  it("falls back to the disk in development", async () => {
    const env = await load({ NODE_ENV: "development" });
    expect(env.kind).toBe("disk");
  });

  it("needs Cloudinary or an absolute uploads folder in production", async () => {
    await expect(load({ NODE_ENV: "production" })).rejects.toThrow(
      "CLOUDINARY",
    );
    await expect(
      load({ NODE_ENV: "production", UPLOADS_DIR: "relative/dir" }),
    ).rejects.toThrow("UPLOADS_DIR");
    const absolute = path.resolve("/srv/luzanika-uploads");
    expect(
      await load({ NODE_ENV: "production", UPLOADS_DIR: absolute }),
    ).toEqual({ kind: "disk", uploadsDir: absolute });
  });
});
