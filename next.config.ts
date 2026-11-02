import type { NextConfig } from "next";

import { securityHeaderRules } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise the framework in every response.
  poweredByHeader: false,
  // Loaded from node_modules at runtime instead of being bundled, so the database driver can be found.
  serverExternalPackages: [
    "sequelize",
    "pg",
    "pg-hstore",
    "bcrypt",
    "nodemailer",
  ],
  async headers() {
    return securityHeaderRules({
      isDev: process.env.NODE_ENV !== "production",
    });
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
