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
      STAFF_2FA_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
      // Tests must not depend on the developer's own mail settings.
      SMTP_HOST: "",
      MAIL_FROM: "",
      CONTACT_TO_EMAIL: "",
      // Tests keep their pictures in a temporary folder, never in the developer's Cloudinary account.
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
    },
  },
});
