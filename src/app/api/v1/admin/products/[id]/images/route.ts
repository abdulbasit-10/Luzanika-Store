import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { readUploadedFile } from "@/server/http/uploads";
import { PRODUCT_PHOTO_MAX_UPLOAD_BYTES } from "@/server/media/product-image";
import { addImage } from "@/server/services/admin-product-service";

/**
 * POST /api/v1/admin/products/:id/images: uploads a photo (multipart, field
 * "photo", JPG/PNG/WebP up to 8 MB). It is shrunk to at most 1600 px, saved as
 * WebP and added as the product's last photo; at most 5 photos per product (one main and four more).
 * Its description starts as the product name: change it with PATCH.
 */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.products.images.add",
    permission: "products.manage",
    rateLimit: { limit: 60, windowSec: 60 * 60 },
  },
  async ({ request, params, admin }) => {
    const id = uuidParam(params.id);
    const upload = await readUploadedFile(request, {
      field: "photo",
      maxBytes: PRODUCT_PHOTO_MAX_UPLOAD_BYTES,
    });
    return json(
      { product: await addImage(admin, id, upload) },
      { status: 201 },
    );
  },
);
