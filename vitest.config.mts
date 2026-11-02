import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" deliberately throws outside the Next.js server build; tests run outside it.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests need a database; run them with `npm run test:integration`.
    exclude: ["src/**/*.int.test.ts", "node_modules/**"],
    // Fast hashing in tests only: the production minimum is enforced separately.
    env: {
      LOG_LEVEL: "silent",
      BCRYPT_COST: "4",
      NEXT_PUBLIC_API_URL: "/api/v1",
      // A fixed key for the admin tests only (32 bytes, base64).
      STAFF_2FA_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    },
  },
});
