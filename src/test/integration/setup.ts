import { afterAll, inject } from "vitest";

// Every test file talks to the throw-away database made in global-setup.
process.env.DATABASE_URL = inject("databaseUrl");

afterAll(async () => {
  await globalThis.__luzanikaSequelize?.close();
});
