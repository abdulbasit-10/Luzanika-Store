import type { ContactFormValues } from "@/features/contact/contact-schema";
import { apiPost } from "@/lib/api-client";

/** POST /contact: the server emails the message to the shop. Rejects when it could not be sent. */
export async function submitContactMessage(
  values: ContactFormValues,
): Promise<void> {
  await apiPost("/contact", values);
}
