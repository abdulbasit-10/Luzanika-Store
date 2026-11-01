/**
 * Where uploaded files are kept. The rest of the app only talks to this
 * interface, so moving from the server's disk to cloud storage (S3, Cloudflare
 * R2, ...) means writing one new class and changing getStorage(); nothing else.
 */
export interface StoredFile {
  bytes: Buffer;
  contentType: string;
}

export interface FileStorage {
  /** Saves a file under `key`, replacing any existing one. Never leaves a half-written file. */
  put(key: string, bytes: Buffer): Promise<void>;
  /** The file, or null when there is none. */
  get(key: string): Promise<StoredFile | null>;
  /** Removes the file. Not an error if it is already gone. */
  delete(key: string): Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  png: "image/png",
};

// Lower-case letters, digits, "-", "_" and "/" between folders, then a known extension.
const KEY_PATTERN =
  /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(webp|jpg|png)$/;
const MAX_KEY_LENGTH = 200;

export function isValidStorageKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    key.length <= MAX_KEY_LENGTH &&
    KEY_PATTERN.test(key)
  );
}

export function contentTypeForKey(key: string): string {
  const extension = key.slice(key.lastIndexOf(".") + 1);
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}
