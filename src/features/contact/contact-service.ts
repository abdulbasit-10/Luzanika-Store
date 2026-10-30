import type { ContactFormValues } from "@/features/contact/contact-schema";

/*
 * Mock of POST /contact until the backend exists. It has the shape of the
 * real call (async, takes the validated values), so only this function changes
 * when the API is wired up.
 */
export async function submitContactMessage(
  values: ContactFormValues,
): Promise<void> {
  void values;
  await new Promise((resolve) => setTimeout(resolve, 700));
}
