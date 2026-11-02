import { staffRoute } from "@/server/auth/staff-route";
import { ApiError } from "@/server/http/api-error";
import { json } from "@/server/http/responses";
import { setHomeSection } from "@/server/services/admin-catalog-service";
import {
  homeSectionSchema,
  setHomeSectionSchema,
} from "@/server/validation/admin-catalog-schemas";

/** PUT /api/v1/admin/home-sections/:section { productIds: [...] }: the products of this home page section, in this order (replaces the old list). Sections: featured, new-arrivals, special-offers. */
export const PUT = staffRoute<{ section: string }>(
  { name: "admin.home.set", permission: "catalog.manage" },
  async ({ json: readJson, params, admin }) => {
    const section = homeSectionSchema.safeParse(params.section);
    if (!section.success) throw new ApiError("not_found");
    const { productIds } = await readJson(setHomeSectionSchema);
    return json({
      items: await setHomeSection(admin, section.data, productIds),
    });
  },
);
