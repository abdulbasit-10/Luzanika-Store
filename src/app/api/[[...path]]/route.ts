import { ApiError } from "@/server/http/api-error";
import { route } from "@/server/http/route";

/**
 * Anything under /api that has no route of its own answers with the standard
 * JSON "not found" instead of an HTML page. Real routes always win over this one.
 */
const notFound = route({ name: "api.not_found" }, () => {
  throw new ApiError("not_found");
});

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
