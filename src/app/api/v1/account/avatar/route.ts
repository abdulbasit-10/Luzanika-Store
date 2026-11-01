import { NextResponse } from "next/server";

import { customerRoute } from "@/server/auth/customer-route";
import { toUserDto } from "@/server/dto/user";
import { ApiError } from "@/server/http/api-error";
import { json } from "@/server/http/responses";
import { readUploadedFile } from "@/server/http/uploads";
import { AVATAR_MAX_UPLOAD_BYTES } from "@/server/media/avatar-image";
import {
  getAvatar,
  removeAvatar,
  setAvatar,
} from "@/server/services/account-service";

/**
 * GET /api/v1/account/avatar: the signed-in customer's own profile photo.
 * Private to that customer; the ?v= part of the URL changes with the photo,
 * so it can be cached by the browser for a long time.
 */
export const GET = customerRoute(
  { name: "account.avatar.get" },
  async ({ customer }) => {
    const file = await getAvatar(customer);
    if (!file) throw new ApiError("not_found");

    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.bytes.length),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  },
);

/** PUT /api/v1/account/avatar: uploads a profile photo (multipart, field "photo", JPG/PNG/WebP, up to 5 MB). */
export const PUT = customerRoute(
  { name: "account.avatar.set", rateLimit: { limit: 20, windowSec: 60 * 60 } },
  async ({ request, customer, rateLimit }) => {
    // Resizing is the most expensive thing a customer can ask of the server, so it is limited per account too.
    rateLimit({
      name: "account.avatar.set",
      key: customer.id,
      limit: 10,
      windowSec: 60 * 60,
    });

    const upload = await readUploadedFile(request, {
      field: "photo",
      maxBytes: AVATAR_MAX_UPLOAD_BYTES,
    });
    const updated = await setAvatar(customer, upload);
    return json({ user: toUserDto(updated) });
  },
);

/** DELETE /api/v1/account/avatar: removes the profile photo. */
export const DELETE = customerRoute(
  { name: "account.avatar.remove" },
  async ({ customer }) => {
    const updated = await removeAvatar(customer);
    return json({ user: toUserDto(updated) });
  },
);
