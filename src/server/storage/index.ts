import "server-only";

import { getStorageEnv } from "@/server/config/storage-env";

import { CloudinaryStorage } from "./cloudinary-storage";
import { LocalDiskStorage } from "./local-disk-storage";
import type { FileStorage } from "./storage";

export type { FileStorage, StoredFile } from "./storage";

let instance: FileStorage | undefined;
let override: FileStorage | undefined;

/** The storage in use: Cloudinary when its settings are present, otherwise the server's disk. */
export function getStorage(): FileStorage {
  if (override) return override;
  if (!instance) {
    const env = getStorageEnv();
    instance =
      env.kind === "cloudinary"
        ? new CloudinaryStorage(env)
        : new LocalDiskStorage(env.uploadsDir);
  }
  return instance;
}

/** Replace the storage, for tests only. Pass undefined to restore the default. */
export function setStorage(storage: FileStorage | undefined): void {
  override = storage;
}
