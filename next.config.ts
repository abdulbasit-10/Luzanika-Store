import type { NextConfig } from "next";

import { securityHeaderRules } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  // A production build can go to its own folder (NEXT_DIST_DIR=.next-prod), so it can run next to `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Shrunken copies are kept (server and browser) for 30 days. Uploaded photos get a new file name when
    // they change, and the demo photos are fixed, so a long time is safe.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // The widest picture is the hero (1774 px). Fewer sizes mean fewer first-visit conversions and cache entries.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Product photos are served from our own Cloudinary account (only its public "upload" pictures).
    remotePatterns: process.env.CLOUDINARY_CLOUD_NAME
      ? [
          {
            protocol: "https",
            hostname: "res.cloudinary.com",
            pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/**`,
          },
        ]
      : [],
  },
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
