import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

/**
 * Encrypts a short secret with AES-256-GCM. The result is one string
 * ("v1.iv.tag.ciphertext", base64url) that is safe to keep in the database.
 * GCM also detects tampering: a changed value, or the wrong key, fails to decrypt.
 */
export function encryptSecret(plain: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error("The encryption key must be 32 bytes.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

/** Reverses `encryptSecret`. Throws if the value was changed or the key is wrong. */
export function decryptSecret(stored: string, key: Buffer): string {
  const [version, iv, tag, encrypted] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) {
    throw new Error("Unknown secret format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
