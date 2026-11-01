import "server-only";

import { getStorageEnv } from "@/server/config/storage-env";

import { LocalDiskStorage } from "./local-disk-storage";
import type { FileStorage } from "./storage";

export type { FileStorage, StoredFile } from "./storage";

let instance: FileStorage | undefined;
let override: FileStorage | undefined;

/** The storage in use. To move to cloud storage, return a different FileStorage here. */
export function getStorage(): FileStorage {
  if (override) return override;
  instance ??= new LocalDiskStorage(getStorageEnv().uploadsDir);
  return instance;
}

/** Replace the storage, for tests only. Pass undefined to restore the default. */
export function setStorage(storage: FileStorage | undefined): void {
  override = storage;
}
