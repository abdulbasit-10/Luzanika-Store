import { jsonPublic } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { getPublicShopSettings } from "@/server/services/settings-service";

/** GET /api/v1/settings/shop: the shop's public contact details and social links (for the footer and contact page). Nothing else from the settings is exposed. */
export const GET = route({ name: "settings.shop" }, async () =>
  jsonPublic(await getPublicShopSettings()),
);
