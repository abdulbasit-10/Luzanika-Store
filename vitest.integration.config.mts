import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["./src/test/integration/global-setup.ts"],
    setupFiles: ["./src/test/integration/setup.ts"],
    // One shared database, so files run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      LOG_LEVEL: "silent",
      BCRYPT_COST: "4",
      // Lets each test pretend to be a different visitor through X-Real-IP.
      TRUST_PROXY: "true",
    },
  },
});
