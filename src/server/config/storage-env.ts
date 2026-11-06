import "server-only";

import os from "node:os";
import path from "node:path";

import { z } from "zod";

/** An empty value in the .env file (NAME=) counts as not set. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

const storageEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** Folder on the server's disk. Only used when Cloudinary is not set up. */
  UPLOADS_DIR: optional(z.string().trim()),
  CLOUDINARY_CLOUD_NAME: optional(z.string().trim()),
  CLOUDINARY_API_KEY: optional(z.string().trim()),
  CLOUDINARY_API_SECRET: optional(z.string().trim()),
  /** Folder inside the Cloudinary account, so test and live files never mix. */
  CLOUDINARY_FOLDER: optional(
    z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/),
  ),
});

export type StorageEnv =
  | {
      kind: "cloudinary";
      cloudName: string;
      apiKey: string;
      apiSecret: string;
      folder: string;
    }
  | {
      kind: "disk";
      /** Absolute path of the uploads folder. */
      uploadsDir: string;
    };

let cached: StorageEnv | undefined;

/**
 * Where uploads live. When the three Cloudinary values are set, every picture
 * (product photos, profile photos, payment screenshots) goes to Cloudinary.
 * Otherwise they go to a folder on the server's disk: in production
 * UPLOADS_DIR must then be an absolute path outside the project (and included
 * in the server backups); in development it defaults to a folder in the user's
 * home directory, so the dev server never watches it and uploads never end up
 * in git.
 */
export function getStorageEnv(): StorageEnv {
  if (cached) return cached;

  const result = storageEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid storage environment variables: ${names}`);
  }

  const {
    NODE_ENV,
    UPLOADS_DIR,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER,
  } = result.data;

  const cloudinaryValues = [
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  ];
  const given = cloudinaryValues.filter(Boolean).length;
  if (given > 0 && given < 3) {
    throw new Error(
      "Invalid storage environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must all be set (or none)",
    );
  }

  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cached = {
      kind: "cloudinary",
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      apiSecret: CLOUDINARY_API_SECRET,
      folder: CLOUDINARY_FOLDER ?? "luzanika",
    };
  } else if (NODE_ENV === "production") {
    if (!UPLOADS_DIR || !path.isAbsolute(UPLOADS_DIR)) {
      throw new Error(
        "Invalid storage environment variables: set the CLOUDINARY_* values, or UPLOADS_DIR as an absolute path (production)",
      );
    }
    cached = {
      kind: "disk",
      uploadsDir: path.resolve(/*turbopackIgnore: true*/ UPLOADS_DIR),
    };
  } else {
    cached = {
      kind: "disk",
      uploadsDir: path.resolve(
        /*turbopackIgnore: true*/
        UPLOADS_DIR ?? path.join(os.homedir(), ".luzanika-dev-uploads"),
      ),
    };
  }
  return cached;
}
