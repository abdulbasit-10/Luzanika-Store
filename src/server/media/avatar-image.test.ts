import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/server/http/api-error";

import { AVATAR_SIZE, processAvatar } from "./avatar-image";

const solid = (width: number, height: number, background = "#336699") => ({
  create: { width, height, channels: 3 as const, background },
});

async function rejection(input: Buffer): Promise<ApiError> {
  try {
    await processAvatar(input);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("expected the image to be rejected");
}

describe("processAvatar", () => {
  it("turns a wide JPEG into a 256x256 WebP", async () => {
    const input = await sharp(solid(1200, 600)).jpeg().toBuffer();
    const output = await processAvatar(input);
    const meta = await sharp(output).metadata();
    expect(meta).toMatchObject({
      format: "webp",
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    });
    expect(output.length).toBeLessThan(20_000);
  });

  it("accepts PNG and WebP too, and small pictures are scaled up to the same size", async () => {
    for (const input of [
      await sharp(solid(300, 500)).png().toBuffer(),
      await sharp(solid(50, 50)).webp().toBuffer(),
    ]) {
      const meta = await sharp(await processAvatar(input)).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([
        AVATAR_SIZE,
        AVATAR_SIZE,
        "webp",
      ]);
    }
  });

  it("crops from the centre instead of squashing", async () => {
    // left third red, middle green, right third blue; a centre crop keeps mostly green
    const left = await sharp(solid(100, 100, "#ff0000"))
      .png()
      .toBuffer();
    const mid = await sharp(solid(100, 100, "#00ff00"))
      .png()
      .toBuffer();
    const right = await sharp(solid(100, 100, "#0000ff"))
      .png()
      .toBuffer();
    const wide = await sharp(solid(300, 100))
      .composite([
        { input: left, left: 0, top: 0 },
        { input: mid, left: 100, top: 0 },
        { input: right, left: 200, top: 0 },
      ])
      .png()
      .toBuffer();

    const { data, info } = await sharp(await processAvatar(wide))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const [r, g, b] = pixel(128, 128);
    expect(g).toBeGreaterThan(200);
    expect(r).toBeLessThan(60);
    expect(b).toBeLessThan(60);
  });

  it("applies the phone's rotation instead of leaving the photo sideways", async () => {
    // 200x100: left half red, right half blue, flagged "rotate 90 degrees clockwise" (EXIF orientation 6)
    const red = await sharp(solid(100, 100, "#ff0000"))
      .png()
      .toBuffer();
    const blue = await sharp(solid(100, 100, "#0000ff"))
      .png()
      .toBuffer();
    const input = await sharp(solid(200, 100))
      .composite([
        { input: red, left: 0, top: 0 },
        { input: blue, left: 100, top: 0 },
      ])
      .jpeg({ quality: 100 })
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const { data, info } = await sharp(await processAvatar(input))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const top = pixel(128, 20);
    const bottom = pixel(128, 235);
    expect(top[0]).toBeGreaterThan(200); // red moved to the top
    expect(bottom[2]).toBeGreaterThan(200); // blue moved to the bottom
  });

  it("strips metadata such as GPS and camera details", async () => {
    const input = await sharp(solid(400, 400))
      .jpeg()
      .withExif({ IFD0: { Copyright: "SECRET-OWNER", Make: "SecretCamera" } })
      .toBuffer();
    expect(input.toString("latin1")).toContain("SECRET-OWNER");

    const output = await processAvatar(input);
    expect(output.toString("latin1")).not.toContain("SECRET-OWNER");
    expect(output.toString("latin1")).not.toContain("SecretCamera");
    const meta = await sharp(output).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("drops anything hidden after the image data", async () => {
    const input = Buffer.concat([
      await sharp(solid(300, 300)).png().toBuffer(),
      Buffer.from("<?php system($_GET['c']); ?> HIDDEN-PAYLOAD"),
    ]);
    const output = await processAvatar(input);
    expect(output.toString("latin1")).not.toContain("HIDDEN-PAYLOAD");
  });

  it("uses only the first frame of an animated WebP", async () => {
    const frame = (colour: string) =>
      sharp(solid(64, 64, colour))
        .raw()
        .toBuffer();
    const animated = await sharp(
      Buffer.concat([await frame("#ff0000"), await frame("#0000ff")]),
      {
        raw: { width: 64, height: 64 * 2, channels: 3, pageHeight: 64 },
      },
    )
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    const meta = await sharp(await processAvatar(animated)).metadata();
    expect(meta.pages ?? 1).toBe(1);
  });

  it("refuses formats it does not accept, even when they are real images", async () => {
    const gif = await sharp(solid(50, 50)).gif().toBuffer();
    const tiff = await sharp(solid(50, 50)).tiff().toBuffer();
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    );
    for (const input of [gif, tiff, svg]) {
      const error = await rejection(input);
      expect(error.code).toBe("validation_failed");
      expect(error.fields?.photo).toBeTruthy();
    }
  });

  it("refuses files that are not images, whatever they are called", async () => {
    for (const input of [
      Buffer.from("just some text"),
      Buffer.from("%PDF-1.4 fake"),
      Buffer.from("MZ\x90\x00 fake executable"),
      Buffer.alloc(0),
      Buffer.alloc(2000),
    ]) {
      expect((await rejection(input)).code).toBe("validation_failed");
    }
  });

  it("refuses a truncated or corrupt image", async () => {
    const jpeg = await sharp(solid(800, 800)).jpeg().toBuffer();
    expect(
      (await rejection(jpeg.subarray(0, Math.floor(jpeg.length / 3)))).code,
    ).toBe("validation_failed");
    const png = await sharp(solid(400, 400)).png().toBuffer();
    const corrupt = Buffer.from(png);
    corrupt.fill(0xff, 60, 200);
    expect((await rejection(corrupt)).code).toBe("validation_failed");
  });

  it("refuses an image that is small as a file but huge once decoded", async () => {
    // 6000 x 6000 = 36 million pixels of one colour compresses to a few KB
    const bomb = await sharp(solid(6000, 6000))
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(bomb.length).toBeLessThan(200_000);
    const error = await rejection(bomb);
    expect(error.code).toBe("validation_failed");
  });

  it("never leaks decoder internals in its error", async () => {
    const error = await rejection(Buffer.from("garbage"));
    expect(error.message).toMatch(/couldn't read|choose a JPG/i);
    expect(error.message).not.toMatch(
      /vips|sharp|libvips|unsupported image format/i,
    );
  });
});
