import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  contentTypeForKey,
  isValidStorageKey,
  type FileStorage,
  type StoredFile,
} from "./storage";

/** Errors that mean "the file is busy right now" rather than "something is wrong". */
const LOCKED = new Set(["EPERM", "EBUSY", "EACCES"]);

/**
 * Renaming over a file that is being replaced or scanned at the same moment
 * can fail briefly on Windows (and with some antivirus software). Trying
 * again a few times makes that a non-event; any other error is real.
 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (!LOCKED.has(code) || attempt >= 8) throw error;
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)));
    }
  }
}

/** Keeps files in a folder on the server's disk. */
export class LocalDiskStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Turns a key into a path, refusing anything that could point outside the uploads folder. */
  private pathFor(key: string): string {
    if (!isValidStorageKey(key)) throw new Error("Invalid storage key.");
    const full = path.resolve(this.root, ...key.split("/"));
    if (!full.startsWith(this.root + path.sep)) {
      throw new Error("Invalid storage key.");
    }
    return full;
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const target = this.pathFor(key);
    await mkdir(path.dirname(target), { recursive: true });

    // Write beside the target and rename: a reader never sees a half-written file.
    const temporary = `${target}.${randomBytes(6).toString("hex")}.tmp`;
    try {
      await writeFile(temporary, bytes, { mode: 0o640 });
      await renameWithRetry(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }

  async get(key: string): Promise<StoredFile | null> {
    const target = this.pathFor(key);
    try {
      return {
        bytes: await readFile(target),
        contentType: contentTypeForKey(key),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }
}
