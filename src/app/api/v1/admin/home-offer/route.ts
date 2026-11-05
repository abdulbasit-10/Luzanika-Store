import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { getOffer, setOffer } from "@/server/services/offer-service";
import { offerSchema } from "@/server/validation/review-schemas";

/** GET /api/v1/admin/home-offer: when the home page "Special offers" row ends and its headline. */
export const GET = staffRoute(
  {
    name: "admin.offer.get",
    permission: ["products.view", "catalog.manage"],
  },
  async () => json({ offer: await getOffer() }),
);

/**
 * PUT /api/v1/admin/home-offer { endsAt, headline }: `endsAt` is an ISO date and
 * time (or null for no countdown), `headline` an optional line (or null). A
 * time in the past hides the row from the shop.
 */
export const PUT = staffRoute(
  { name: "admin.offer.set", permission: "catalog.manage" },
  async ({ json: readJson, admin }) =>
    json({ offer: await setOffer(admin, await readJson(offerSchema)) }),
);
