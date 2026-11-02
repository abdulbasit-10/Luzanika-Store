import { NextResponse } from "next/server";

import { ApiError } from "@/server/http/api-error";
import { route } from "@/server/http/route";
import { getStorage } from "@/server/storage";
import { isValidStorageKey } from "@/server/storage/storage";

/**
 * GET /api/v1/media/products/:file: an uploaded product photo. Public, like
 * the product pages. Every upload gets a new random name, so a photo never
 * changes and can be cached for a year.
 */
export const GET = route<{ file: string }>(
  { name: "media.products.get" },
  async ({ params }) => {
    const key = `products/${params.file}`;
    if (!/^[0-9a-f]{32}\.webp$/.test(params.file) || !isValidStorageKey(key)) {
      throw new ApiError("not_found");
    }
    const file = await getStorage().get(key);
    if (!file) throw new ApiError("not_found");

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
