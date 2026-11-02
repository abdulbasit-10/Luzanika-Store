import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import {
  getShopSettings,
  updateShopSettings,
} from "@/server/services/settings-service";
import { updateSettingsSchema } from "@/server/validation/settings-schemas";

/** GET /api/v1/admin/settings: shipping fees, German VAT rate, unpaid-order hold time and the shop's contact details. */
export const GET = staffRoute(
  { name: "admin.settings.get", permission: "settings.view" },
  async () => json({ settings: await getShopSettings() }),
);

/**
 * PATCH /api/v1/admin/settings: changes only what is sent. Fees are in minor
 * units (paisa / cents). New orders use the new values at once; orders that
 * already exist keep what they were placed with.
 */
export const PATCH = staffRoute(
  { name: "admin.settings.update", permission: "settings.manage" },
  async ({ json: readJson, admin }) =>
    json({
      settings: await updateShopSettings(
        admin,
        await readJson(updateSettingsSchema),
      ),
    }),
);
