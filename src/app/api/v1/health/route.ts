import { pingDatabase } from "@/server/db/connection";
import { json } from "@/server/http/responses";
import { route } from "@/server/http/route";

/**
 * GET /api/v1/health: tells a monitor (or you) whether the app and its
 * database are up. It reveals nothing about the setup: no versions, names or
 * credentials.
 */
export const GET = route({ name: "health", quiet: true }, async () => {
  const database = await pingDatabase();

  return json(
    {
      status: database.ok ? "ok" : "degraded",
      time: new Date().toISOString(),
      database,
    },
    { status: database.ok ? 200 : 503 },
  );
});
