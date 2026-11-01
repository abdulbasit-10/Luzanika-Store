import "server-only";

import os from "node:os";
import path from "node:path";

import { z } from "zod";

const storageEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** Folder where uploaded files (profile photos, later product images) are kept. */
  UPLOADS_DIR: z.string().trim().min(1).optional(),
});

export interface StorageEnv {
  /** Absolute path of the uploads folder. */
  uploadsDir: string;
}

let cached: StorageEnv | undefined;

/**
 * Where uploads live on disk. In production it must be set to an absolute
 * path outside the project (and included in the server backups), so a deploy
 * never wipes customers' files. In development it defaults to a folder in the
 * user's home directory: outside the project, so the dev server never watches
 * it and uploads never end up in git.
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

  const { NODE_ENV, UPLOADS_DIR } = result.data;
  if (NODE_ENV === "production") {
    if (!UPLOADS_DIR || !path.isAbsolute(UPLOADS_DIR)) {
      throw new Error(
        "Invalid storage environment variables: UPLOADS_DIR (must be an absolute path in production)",
      );
    }
    cached = { uploadsDir: path.resolve(UPLOADS_DIR) };
  } else {
    cached = {
      uploadsDir: path.resolve(
        UPLOADS_DIR ?? path.join(os.homedir(), ".luzanika-dev-uploads"),
      ),
    };
  }
  return cached;
}
