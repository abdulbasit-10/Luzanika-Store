import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import {
  removeImage,
  updateImage,
} from "@/server/services/admin-product-service";
import { updateImageSchema } from "@/server/validation/admin-product-schemas";

type Params = { id: string; imageId: string };

/** PATCH /api/v1/admin/products/:id/images/:imageId { alt?, position? }: the photo's description and where it is cropped from. */
export const PATCH = staffRoute<Params>(
  { name: "admin.products.images.update", permission: "products.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      product: await updateImage(
        admin,
        uuidParam(params.id),
        uuidParam(params.imageId),
        await readJson(updateImageSchema),
      ),
    }),
);

/** DELETE /api/v1/admin/products/:id/images/:imageId: removes the photo (and its file, if it was uploaded). */
export const DELETE = staffRoute<Params>(
  { name: "admin.products.images.remove", permission: "products.manage" },
  async ({ params, admin }) =>
    json({
      product: await removeImage(
        admin,
        uuidParam(params.id),
        uuidParam(params.imageId),
      ),
    }),
);
