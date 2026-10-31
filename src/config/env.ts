import { z } from "zod";

const envSchema = z.object({
  // The API is part of this app, so it is a same-site path ("/api/v1"); a full URL is still accepted.
  NEXT_PUBLIC_API_URL: z.union([z.url(), z.string().startsWith("/")]),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

// NEXT_PUBLIC_* variables must be referenced statically to be inlined in the client bundle.
export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
