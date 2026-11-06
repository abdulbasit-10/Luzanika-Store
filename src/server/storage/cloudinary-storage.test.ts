import { describe, expect, it } from "vitest";

import { CloudinaryStorage } from "./cloudinary-storage";

const storage = new CloudinaryStorage({
  cloudName: "democloud",
  apiKey: "123",
  apiSecret: "secret",
  folder: "luzanika-test",
});

const PHOTO = "products/0123456789abcdef0123456789abcdef.webp";
const PROOF = "payment-proofs/0123456789abcdef0123456789abcdef.webp";
const AVATAR = "avatars/0123456789abcdef0123456789abcdef.webp";

describe("CloudinaryStorage addresses", () => {
  it("gives product photos a public Cloudinary address inside the folder", () => {
    expect(storage.publicUrl(PHOTO)).toBe(
      "https://res.cloudinary.com/democloud/image/upload/luzanika-test/products/0123456789abcdef0123456789abcdef.webp",
    );
  });

  it("never gives profile photos or payment screenshots a public address", () => {
    expect(storage.publicUrl(PROOF)).toBeNull();
    expect(storage.publicUrl(AVATAR)).toBeNull();
  });

  it("turns a public address back into the storage key", () => {
    const url = storage.publicUrl(PHOTO)!;
    expect(storage.keyFromPublicUrl(url)).toBe(PHOTO);
    // Cloudinary may add a version number.
    expect(
      storage.keyFromPublicUrl(url.replace("/upload/", "/upload/v17/")),
    ).toBe(PHOTO);
  });

  it("does not claim addresses that are not ours or not public", () => {
    for (const url of [
      "/images/hero.webp",
      "/api/v1/media/products/0123456789abcdef0123456789abcdef.webp",
      "https://example.com/products/0123456789abcdef0123456789abcdef.webp",
      "https://res.cloudinary.com/othercloud/image/upload/luzanika-test/products/0123456789abcdef0123456789abcdef.webp",
      "https://res.cloudinary.com/democloud/image/upload/other-folder/products/0123456789abcdef0123456789abcdef.webp",
      "https://res.cloudinary.com/democloud/image/upload/luzanika-test/payment-proofs/0123456789abcdef0123456789abcdef.webp",
      "https://res.cloudinary.com/democloud/image/upload/luzanika-test/products/../payment-proofs/x.webp",
    ]) {
      expect(storage.keyFromPublicUrl(url), url).toBeNull();
    }
  });

  it("refuses keys that are not valid", async () => {
    await expect(storage.get("../x.webp")).rejects.toThrow(
      "Invalid storage key",
    );
    await expect(storage.delete("products/UPPER.webp")).rejects.toThrow(
      "Invalid storage key",
    );
  });
});
