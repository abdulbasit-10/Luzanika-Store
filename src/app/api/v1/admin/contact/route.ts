import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listContactMessages } from "@/server/services/admin-contact-service";
import { adminContactListQuerySchema } from "@/server/validation/contact-schemas";

/** GET /api/v1/admin/contact: the contact-form messages, newest first. Filters: status (new, replied), search (name, email, text), page, pageSize. */
export const GET = staffRoute(
  { name: "admin.contact.list", permission: "contact.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(adminContactListQuerySchema);
    return json(await listContactMessages(filter, page, pageSize));
  },
);
