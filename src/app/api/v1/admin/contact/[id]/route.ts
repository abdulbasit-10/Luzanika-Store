import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { getContactMessage } from "@/server/services/admin-contact-service";

/** GET /api/v1/admin/contact/:id: one message with the replies already sent. */
export const GET = staffRoute<{ id: string }>(
  { name: "admin.contact.get", permission: "contact.view" },
  async ({ params }) =>
    json({ message: await getContactMessage(uuidParam(params.id)) }),
);
