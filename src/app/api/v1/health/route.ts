import { NextResponse } from "next/server";

import { pingDatabase } from "@/server/db/connection";

/**
 * GET /api/v1/health: tells a monitor (or you) whether the app and its
 * database are up. It reveals nothing about the setup: no versions, names or
 * credentials.
 */
export async function GET() {
  const database = await pingDatabase();
  const status = database.ok ? "ok" : "degraded";

  return NextResponse.json(
    { status, time: new Date().toISOString(), database },
    {
      status: database.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
